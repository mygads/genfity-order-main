/**
 * useCustomerPushNotifications Hook
 * Manages Web Push notification subscription for customers (order status updates)
 * 
 * Features:
 * - Register service worker
 * - Request notification permission
 * - Subscribe to push notifications for order updates
 * - Works for both logged-in and guest users
 * - Associates subscription with order numbers (guest tracking)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    savePushSubscription,
    getSavedPushSubscription,
    clearPushSubscription,
    getRecentOrders,
    getCustomerAuth,
} from '@/lib/utils/localStorage';

interface UseCustomerPushNotificationsReturn {
    /** Whether push notifications are supported in this browser */
    isSupported: boolean;
    /** Whether user has granted notification permission */
    isPermissionGranted: boolean;
    /** Whether user is subscribed to push */
    isSubscribed: boolean;
    /** Whether loading/processing */
    isLoading: boolean;
    /** Any error message */
    error: string | null;
    /** Subscribe to push notifications */
    subscribe: (orderNumber?: string) => Promise<boolean>;
    /** Unsubscribe from push notifications */
    unsubscribe: () => Promise<boolean>;
    /** Add an order to existing subscription (for guest tracking) */
    addOrderToSubscription: (orderNumber: string) => Promise<boolean>;
    /** Request notification permission only */
    requestPermission: () => Promise<boolean>;
}

/**
 * Convert URL-safe base64 string to Uint8Array
 * Required for VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function useCustomerPushNotifications(): UseCustomerPushNotificationsReturn {
    const [isSupported, setIsSupported] = useState(false);
    const [isPermissionGranted, setIsPermissionGranted] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check browser support on mount
    useEffect(() => {
        const checkSupport = () => {
            const supported =
                typeof window !== 'undefined' &&
                'serviceWorker' in navigator &&
                'PushManager' in window &&
                'Notification' in window;

            setIsSupported(supported);

            if (supported) {
                setIsPermissionGranted(Notification.permission === 'granted');

                // Check if already subscribed
                const saved = getSavedPushSubscription();
                setIsSubscribed(!!saved);
            }
        };

        checkSupport();
    }, []);

    /**
     * Register service worker
     */
    const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[CustomerPush] Service worker registered:', registration.scope);
            return registration;
        } catch (err) {
            console.error('[CustomerPush] Service worker registration failed:', err);
            setError('Failed to register service worker');
            return null;
        }
    }, []);

    /**
     * Get VAPID public key from server
     */
    const getVapidKey = useCallback(async (): Promise<string | null> => {
        try {
            const response = await fetch('/api/public/push/subscribe');
            const data = await response.json();

            if (data.success && data.data?.vapidPublicKey) {
                return data.data.vapidPublicKey;
            }

            setError('Push notifications not configured');
            return null;
        } catch (err) {
            console.error('[CustomerPush] Failed to get VAPID key:', err);
            setError('Failed to get push configuration');
            return null;
        }
    }, []);

    /**
     * Request notification permission
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Notifications not supported');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            const granted = permission === 'granted';
            setIsPermissionGranted(granted);

            if (!granted) {
                setError('notification_permission_denied');
            }

            return granted;
        } catch (err) {
            console.error('[CustomerPush] Permission request failed:', err);
            setError('Failed to request permission');
            return false;
        }
    }, [isSupported]);

    /**
     * Subscribe to push notifications
     */
    const subscribe = useCallback(async (orderNumber?: string): Promise<boolean> => {
        if (!isSupported) {
            setError('Notifications not supported');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Request permission if not granted
            if (Notification.permission !== 'granted') {
                const granted = await requestPermission();
                if (!granted) {
                    setIsLoading(false);
                    return false;
                }
            }

            // Register service worker
            const registration = await registerServiceWorker();
            if (!registration) {
                setIsLoading(false);
                return false;
            }

            // Get VAPID key
            const vapidKey = await getVapidKey();
            if (!vapidKey) {
                setIsLoading(false);
                return false;
            }

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
            });

            console.log('[CustomerPush] Subscribed:', subscription.endpoint);

            // Save to localStorage
            savePushSubscription(subscription);

            // Get order numbers to track
            const recentOrders = getRecentOrders();
            const orderNumbers = recentOrders.map(o => o.orderNumber);
            if (orderNumber && !orderNumbers.includes(orderNumber)) {
                orderNumbers.push(orderNumber);
            }

            // Get customer ID if logged in
            const auth = getCustomerAuth();
            const customerId = auth?.customer?.id?.toString();

            // Get subscription keys as base64
            const p256dhKey = subscription.getKey('p256dh');
            const authKey = subscription.getKey('auth');

            if (!p256dhKey || !authKey) {
                throw new Error('Failed to get subscription keys');
            }

            // Send to server
            const response = await fetch('/api/public/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
                            auth: btoa(String.fromCharCode(...new Uint8Array(authKey))),
                        },
                    },
                    orderNumbers,
                    customerId,
                    userAgent: navigator.userAgent,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to save subscription');
                setIsLoading(false);
                return false;
            }

            setIsSubscribed(true);
            setIsLoading(false);
            return true;
        } catch (err) {
            console.error('[CustomerPush] Subscribe failed:', err);
            setError('Failed to subscribe');
            setIsLoading(false);
            return false;
        }
    }, [isSupported, requestPermission, registerServiceWorker, getVapidKey]);

    /**
     * Add order to existing subscription
     */
    const addOrderToSubscription = useCallback(async (orderNumber: string): Promise<boolean> => {
        const saved = getSavedPushSubscription();
        if (!saved) {
            // Not subscribed, subscribe with this order
            return subscribe(orderNumber);
        }

        try {
            const response = await fetch('/api/public/push/subscribe', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: saved.endpoint,
                    orderNumber,
                }),
            });

            const data = await response.json();
            return data.success;
        } catch (err) {
            console.error('[CustomerPush] Add order failed:', err);
            return false;
        }
    }, [subscribe]);

    /**
     * Unsubscribe from push notifications
     */
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const saved = getSavedPushSubscription();

            if (saved) {
                // Notify server
                await fetch(`/api/public/push/subscribe?endpoint=${encodeURIComponent(saved.endpoint)}`, {
                    method: 'DELETE',
                });
            }

            // Unsubscribe from browser
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
            }

            // Clear localStorage
            clearPushSubscription();

            setIsSubscribed(false);
            setIsLoading(false);
            return true;
        } catch (err) {
            console.error('[CustomerPush] Unsubscribe failed:', err);
            setError('Failed to unsubscribe');
            setIsLoading(false);
            return false;
        }
    }, []);

    return {
        isSupported,
        isPermissionGranted,
        isSubscribed,
        isLoading,
        error,
        subscribe,
        unsubscribe,
        addOrderToSubscription,
        requestPermission,
    };
}

export default useCustomerPushNotifications;

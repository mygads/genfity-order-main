/**
 * usePushNotifications Hook
 * Manages Web Push notification subscription on client side
 * 
 * Features:
 * - Check browser support
 * - Request notification permission
 * - Subscribe/unsubscribe to push notifications
 * - Persist subscription to server
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { clearAdminAuth, getAdminToken } from '@/lib/utils/adminAuth';

interface UsePushNotificationsReturn {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    isSubscribed: boolean;
    isLoading: boolean;
    error: string | null;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
    requestPermission: () => Promise<NotificationPermission>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check browser support and current state
    useEffect(() => {
        const checkSupport = async () => {
            // Check if browser supports notifications and service workers
            if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
                setIsSupported(false);
                setPermission('unsupported');
                setIsLoading(false);
                return;
            }

            setIsSupported(true);
            setPermission(Notification.permission);

            // Check if already subscribed
            try {
                // Ensure SW is registered (shared SW used for push handling)
                // This does not prompt for notification permission.
                await navigator.serviceWorker.register('/sw.js');
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (err) {
                console.error('Error checking push subscription:', err);
            }

            setIsLoading(false);
        };

        checkSupport();
    }, []);

    // Request notification permission
    const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
        if (!isSupported) {
            return 'denied';
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        } catch (err) {
            console.error('Error requesting permission:', err);
            return 'denied';
        }
    }, [isSupported]);

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Push notifications not supported');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Request permission if not granted
            if (permission !== 'granted') {
                const newPermission = await requestPermission();
                if (newPermission !== 'granted') {
                    setError('Notification permission denied');
                    setIsLoading(false);
                    return false;
                }
            }

            // Get VAPID public key from server
            const vapidResponse = await fetch('/api/notifications/push/subscribe');
            const vapidData = await vapidResponse.json();

            if (!vapidData.success || !vapidData.data?.vapidPublicKey) {
                setError('Push notifications not configured on server');
                setIsLoading(false);
                return false;
            }

            // Register service worker if not already registered
            await navigator.serviceWorker.register('/sw.js');
            const registration = await navigator.serviceWorker.ready;

            // Convert VAPID key to Uint8Array
            const vapidPublicKey = urlBase64ToUint8Array(vapidData.data.vapidPublicKey);

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidPublicKey as BufferSource,
            });

            // Send subscription to server
            const token = getAdminToken();
            const response = await fetch('/api/notifications/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userAgent: navigator.userAgent,
                }),
            });

            // If auth became invalid (e.g. merchant deleted), logout cleanly
            if (response.status === 401) {
                clearAdminAuth();
                window.location.href = '/admin/login?error=expired';
                return false;
            }

            const data = await response.json().catch(() => ({} as any));
            if (!response.ok || !data.success) {
                const message = data?.message || data?.error || 'Failed to save subscription';
                setError(message);
                setIsLoading(false);
                return false;
            }

            setIsSubscribed(true);
            setIsLoading(false);
            return true;
        } catch (err) {
            // Avoid spamming console for expected auth/permission failures
            console.error('Push subscription error:', err);
            setError(err instanceof Error ? err.message : 'Failed to subscribe');
            setIsLoading(false);
            return false;
        }
    }, [isSupported, permission, requestPermission]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            await navigator.serviceWorker.register('/sw.js');
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Unsubscribe from browser
                await subscription.unsubscribe();

                // Remove from server
                const token = getAdminToken();
                await fetch(`/api/notifications/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            }

            setIsSubscribed(false);
            setIsLoading(false);
            return true;
        } catch (err) {
            console.error('Push unsubscribe error:', err);
            setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
            setIsLoading(false);
            return false;
        }
    }, [isSupported]);

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        error,
        subscribe,
        unsubscribe,
        requestPermission,
    };
}

/**
 * Convert URL-safe base64 string to Uint8Array
 * Required for VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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

export default usePushNotifications;

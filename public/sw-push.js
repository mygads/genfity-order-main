/**
 * Service Worker for Push Notifications
 * Handles incoming push messages and notification clicks
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Push event - triggered when a push notification is received
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    try {
        const data = event.data.json();
        
        const options: NotificationOptions = {
            body: data.body,
            icon: data.icon || '/images/logo/genfity-icon-192.png',
            badge: data.badge || '/images/logo/genfity-badge-72.png',
            tag: data.tag || 'genfity-notification',
            data: data.data || {},
            actions: data.actions || [],
            requireInteraction: data.requireInteraction || false,
            vibrate: data.vibrate || [200, 100, 200],
            silent: false,
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    } catch (error) {
        console.error('Error parsing push data:', error);
    }
});

// Notification click event - triggered when user clicks on a notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;
    let targetUrl = '/admin/dashboard';

    // Determine URL based on notification type and action
    if (event.action === 'upgrade' || event.action === 'pay') {
        targetUrl = '/admin/dashboard/subscription/upgrade';
    } else if (event.action === 'topup' || event.action === 'reactivate') {
        targetUrl = '/admin/dashboard/subscription/topup';
    } else if (event.action === 'view' || event.action === 'accept') {
        targetUrl = data?.url || '/admin/dashboard/orders';
    } else if (data?.url) {
        targetUrl = data.url;
    }

    // Open the target URL
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if a window is already open
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.focus();
                        if ('navigate' in client) {
                            return (client as WindowClient).navigate(targetUrl);
                        }
                    }
                }
                // If no window open, open a new one
                return self.clients.openWindow(targetUrl);
            })
    );
});

// Notification close event - for analytics/tracking if needed
self.addEventListener('notificationclose', (event) => {
    const data = event.notification.data;
    console.log('Notification closed:', data?.type);
    // Could send analytics here if needed
});

// Push subscription change event - handle subscription renewals
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('Push subscription changed, need to resubscribe');
    
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            // Note: applicationServerKey needs to be retrieved from storage or refetched
        }).then((subscription) => {
            // Send new subscription to server
            return fetch('/api/notifications/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                }),
            });
        }).catch((error) => {
            console.error('Failed to resubscribe:', error);
        })
    );
});

// Install event
self.addEventListener('install', () => {
    console.log('Push notification service worker installed');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Push notification service worker activated');
    event.waitUntil(self.clients.claim());
});

export {};

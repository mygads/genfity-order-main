/**
 * Service Worker for Web Push Notifications
 * Handles push notifications for customer order status updates
 */

// Cache name for offline assets
const CACHE_NAME = 'genfity-push-v1';

// Install event - cache basic assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('genfity-') && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    return self.clients.claim();
});

// Push event - receive and display notification
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    if (!event.data) {
        console.log('[SW] No data in push event');
        return;
    }

    try {
        const data = event.data.json();
        console.log('[SW] Push data:', data);

        const options = {
            body: data.body || 'You have a new notification',
            icon: data.icon || '/images/logo/genfity-icon-192.png',
            badge: data.badge || '/images/logo/genfity-badge-72.png',
            tag: data.tag || 'genfity-notification',
            data: data.data || {},
            actions: data.actions || [],
            requireInteraction: data.requireInteraction || false,
            vibrate: data.vibrate || [200, 100, 200],
            // Notification behavior
            renotify: true,
            silent: false,
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Genfity', options)
        );
    } catch (error) {
        console.error('[SW] Error processing push:', error);
    }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag);

    event.notification.close();

    const data = event.notification.data || {};
    let url = '/';

    // Determine URL based on notification type
    if (data.url) {
        url = data.url;
    } else if (data.type === 'ORDER_STATUS') {
        // Customer order status notification
        url = data.orderUrl || `/${data.merchantCode}/order-status/${data.orderNumber}`;
    } else if (data.type === 'NEW_ORDER') {
        // Merchant new order notification
        url = '/admin/dashboard/orders';
    }

    // Handle action buttons
    if (event.action) {
        switch (event.action) {
            case 'view':
            case 'track':
                // Use the URL from data
                break;
            case 'dismiss':
                // Just close, don't open
                return;
            case 'accept':
                // For merchant - accept order
                url = '/admin/dashboard/orders';
                break;
            default:
                break;
        }
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Message event - for communication with main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

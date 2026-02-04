// Service Worker for Push Notifications
// This handles incoming push messages and displays notifications

self.addEventListener('push', function (event) {
    console.log('[SW] Push received:', event);

    let data = {
        title: 'New Order!',
        body: 'You have a new order waiting for confirmation.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        url: '/vendor/orders'
    };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch (e) {
        console.error('[SW] Error parsing push data:', e);
    }

    const options = {
        body: data.body,
        icon: data.icon || '/pwa-192x192.png',
        badge: data.badge || '/pwa-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: data.tag || 'sole-ly-notification',
        renotify: true,
        requireInteraction: true, // Keep notification visible until user interacts
        data: {
            url: data.url || '/vendor/orders',
            orderId: data.orderId
        },
        actions: [
            {
                action: 'view',
                title: '👀 View Order'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title, options),
            // Update PWA app badge (shows number on app icon like WhatsApp)
            updateAppBadge()
        ])
    );
});

// Update PWA badge with unread notification count
async function updateAppBadge() {
    try {
        if ('setAppBadge' in navigator) {
            // Increment badge count (we track count via notifications)
            // For now, just set a badge to indicate there are unread notifications
            await navigator.setAppBadge(1);
            console.log('[SW] App badge set');
        }
    } catch (error) {
        console.log('[SW] Error setting app badge:', error);
    }
}

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/vendor/orders';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // Check if there's already an open window
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // No open window, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Handle subscription change (e.g., browser refreshed the push subscription)
self.addEventListener('pushsubscriptionchange', function (event) {
    console.log('[SW] Push subscription changed');
    // The frontend will handle re-subscribing on next page load
});

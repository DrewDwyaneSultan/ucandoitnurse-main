import { NextResponse } from "next/server";

const serviceWorkerContent = `self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
    var data = {
        title: 'Time to study!',
        body: 'You have cards due for review',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        url: '/dashboard'
    };
    
    try {
        if (event.data) {
            var payload = event.data.json();
            data.title = payload.title || data.title;
            data.body = payload.body || data.body;
            data.url = payload.url || data.url;
        }
    } catch (e) {}
    
    var options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        vibrate: [100, 50, 100],
        data: { url: data.url },
        actions: [
            { action: 'study', title: 'Study Now' },
            { action: 'dismiss', title: 'Later' }
        ],
        tag: 'study-reminder',
        renotify: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/dashboard';
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url);
                }
            })
    );
});`;

export async function GET() {
    return new NextResponse(serviceWorkerContent, {
        headers: {
            "Content-Type": "application/javascript",
            "Service-Worker-Allowed": "/",
            "Cache-Control": "public, max-age=0, must-revalidate"
        }
    });
}

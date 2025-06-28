
// Using importScripts to load the Firebase app and messaging SDKs.
// These are the 'compat' libraries that use the v8 namespaced API.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

self.addEventListener('fetch', () => {
  // This is a no-op but is required to make the service worker installable.
  // It can be expanded to implement caching strategies.
});

// This promise will be used to ensure Firebase is initialized before we try to use it.
const appInitializationPromise = fetch('/api/firebase-config')
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config.');
        }
        return response.json();
    })
    .then(firebaseConfig => {
        if (!firebaseConfig || !firebaseConfig.apiKey) {
            throw new Error("Invalid or missing Firebase config from /api/firebase-config");
        }
        // Initialize the Firebase app in the service worker with the fetched config
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized in Service Worker.");
        // Retrieve and return an instance of Firebase Messaging so that it can handle background messages.
        return firebase.messaging();
    })
    .catch(error => {
        console.error('Error initializing Firebase in service worker:', error);
        return null; // Return null to indicate initialization failure
    });


// Set a handler for background messages (when the app is not in the foreground).
// This is the recommended approach for Firebase SDK v9+.
appInitializationPromise.then(messaging => {
    if (messaging) {
        messaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Received background message ', payload);

            // Customize notification here. The payload structure depends on how you send the message.
            // This assumes a payload with a 'notification' object, which is common.
            const notificationTitle = payload.notification?.title || 'New Notification';
            const notificationOptions = {
                body: payload.notification?.body || 'You have a new update.',
                icon: payload.notification?.icon || '/logo-192.png', // Note: Ensure you have an icon at /public/logo-192.png
                data: {
                    // Store the URL to open when the notification is clicked.
                    // This can come from the 'data' part of the payload or fcmOptions.
                    url: payload.fcmOptions?.link || payload.data?.href || '/'
                }
            };

            // The crucial part: show the notification.
            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    }
});

// Set up a listener for when the user clicks on the notification.
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';

    // This code attempts to focus an existing tab with the URL, or opens a new one.
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            for (const client of clientList) {
                // Check if there's already a tab open with the target URL
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no such tab is found, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// public/firebase-messaging-sw.js

// Scripts for Firebase
// Use the compat libraries to get the global `firebase` object
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// This self.registration.scope is the root of my site, so the correct path for the API is /api/...
// It must be relative to the domain root.
const CONFIG_URL = '/api/firebase-config';

// Function to fetch the config and initialize Firebase
const initializeFirebaseWithConfig = async () => {
  try {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) {
      throw new Error(`[SW] Failed to fetch Firebase config: ${response.status} ${response.statusText}`);
    }
    const firebaseConfig = await response.json();

    if (!firebaseConfig || !firebaseConfig.apiKey) {
      throw new Error('[SW] Firebase config is missing or invalid.');
    }

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log('[SW] Firebase initialized successfully.');

    // Get an instance of Firebase Messaging
    const messaging = firebase.messaging();
    console.log('[SW] Firebase Messaging service is available.');

    // Optional: Set a background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background message: ', payload);

      const notificationTitle = payload.notification?.title || 'New Background Notification';
      const notificationOptions = {
        body: payload.notification?.body || 'Something new happened!',
        icon: payload.notification?.icon || '/favicon.ico', // Default icon
        data: payload.data, // Forward any data payload
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

  } catch (error) {
    console.error('[SW] Error during Firebase initialization:', error);
  }
};

// Start the initialization process
initializeFirebaseWithConfig();

self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installed.');
  // Force the waiting service worker to become the active service worker.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated.');
  // Take control of all clients as soon as the service worker is activated.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received:', event.notification);
    event.notification.close();

    const urlToOpen = event.notification.data?.href || '/';

    event.waitUntil(clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
    }).then((clientList) => {
        // Check if there's already a window open at the target URL
        for (const client of clientList) {
            // A simple URL check
            // For more complex scenarios, you might need to check parts of the URL
            if (client.url === urlToOpen && 'focus' in client) {
                return client.focus();
            }
        }
        // If not, open a new window
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
        }
    }));
});

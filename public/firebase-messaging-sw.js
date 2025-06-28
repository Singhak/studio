
// public/firebase-messaging-sw.js

// Import the Firebase scripts using the correct method for service workers
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// This function fetches the config and initializes Firebase
const initializeFirebaseWithConfig = async () => {
  try {
    // Fetch the configuration from the secure API endpoint
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
        console.error('Service Worker: Failed to fetch Firebase config, status:', response.status);
        return null;
    }
    const firebaseConfig = await response.json();
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      console.error('Service Worker: Fetched config is invalid or missing API key.');
      return null;
    }

    // Initialize Firebase only if it hasn't been initialized yet
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log('Service Worker: Firebase initialized successfully.');
      return firebase.messaging();
    } else {
      console.log('Service Worker: Firebase already initialized.');
      return firebase.messaging();
    }
  } catch (error) {
    console.error('Service Worker: Error fetching/initializing Firebase:', error);
  }
  return null;
};

// Initialize Firebase and set up the message handler
const firebaseMessagingPromise = initializeFirebaseWithConfig().then(messaging => {
  if (messaging) {
    // Set up the listener for background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);

      const notificationTitle = payload.notification?.title || 'New Message';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/logo-192.png', // For a custom icon, ensure this file exists in your /public folder
        data: {
            url: payload.data?.href || '/', // Store URL to open on click
        }
      };

      // Display the notification
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);

  event.notification.close();

  // This looks for an open window matching the origin and focuses it.
  // If no window is open, it opens a new one to the specified URL.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      const targetUrl = self.origin + (event.notification.data?.url || '/');
      
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

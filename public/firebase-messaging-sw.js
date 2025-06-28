
// This service worker is essential for Firebase Cloud Messaging (FCM) to work,
// especially for handling background notifications.

// We are using the modular SDK (v9+)
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

// Since this file runs in a service worker context, it cannot access `process.env`.
// We will fetch the configuration from a dedicated API endpoint.
self.addEventListener('install', (event) => {
  console.log('Firebase Messaging Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Firebase Messaging Service Worker activating.');
  // Using clients.claim() to take control of the page immediately.
  event.waitUntil(self.clients.claim());
});

// A self-executing async function to initialize Firebase
(async () => {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
        throw new Error(`Failed to fetch Firebase config: ${response.statusText}`);
    }
    const firebaseConfig = await response.json();
    
    if (!firebaseConfig || !firebaseConfig.projectId) {
        throw new Error('Fetched Firebase config is invalid or empty.');
    }

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    console.log('Firebase Messaging Service Worker initialized successfully.');
    
    // If you want to handle background messages, you would add a listener here.
    // For example:
    // onBackgroundMessage(messaging, (payload) => {
    //   console.log('[firebase-messaging-sw.js] Received background message ', payload);
    //   // Customize notification here
    //   const notificationTitle = payload.notification.title;
    //   const notificationOptions = {
    //     body: payload.notification.body,
    //     icon: '/firebase-logo.png'
    //   };
    //
    //   self.registration.showNotification(notificationTitle,
    //     notificationOptions);
    // });

  } catch (error) {
    console.error('Error initializing Firebase in Service Worker:', error);
  }
})();

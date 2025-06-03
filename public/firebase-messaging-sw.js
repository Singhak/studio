// Import the Firebase app and messaging products
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// IMPORTANT:
// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object. This is THE SAME config
// you use in your main app (e.g., from your .env.local or Firebase console).
// You MUST replace these placeholder values with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE",
  measurementId: "YOUR_MEASUREMENT_ID_HERE" // Optional
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // if already initialized, use that one
}

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message: ',
    payload
  );

  // Customize the notification here
  const notificationTitle = payload.notification?.title || 'New Courtly Update';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message from Courtly.',
    icon: '/icons/icon-192x192.png', // Optional: Ensure you have an icon at this path
    // You can add more options like 'data', 'actions', etc.
    // data: { url: payload.fcmOptions?.link || '/' } // Example: open a specific URL on click
  };

  // The service worker needs to show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification);
  event.notification.close();

  // Example: Focus an existing tab or open a new one
  // const urlToOpen = event.notification.data?.url || '/';
  // event.waitUntil(
  //   clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
  //     for (let i = 0; i < clientList.length; i++) {
  //       const client = clientList[i];
  //       if (client.url === urlToOpen && 'focus' in client) {
  //         return client.focus();
  //       }
  //     }
  //     if (clients.openWindow) {
  //       return clients.openWindow(urlToOpen);
  //     }
  //   })
  // );
});

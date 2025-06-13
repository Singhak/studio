// Import the Firebase app and messaging services (use compat for broader compatibility if needed)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT:
// REPLACE THE CONFIGURATION VALUES BELOW WITH YOUR ACTUAL FIREBASE PROJECT CONFIG.
// These values CANNOT use process.env.NEXT_PUBLIC_... as the service worker
// runs in a different context.

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
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon || '/images/logo-192.png', // Default icon if not provided
    // You can add more options like actions, data, tag, etc.
    // data: payload.data // To make payload data available when notification is clicked
  };

  // eslint-disable-next-line no-restricted-globals
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: console.log to confirm SW activation
// eslint-disable-next-line no-restricted-globals
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated.');
});

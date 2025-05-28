// Scripts for firebase and firebase messaging
// These versions should ideally match or be compatible with the version used in your main app.
// Using specific versions like 10.12.2 as an example, check your package.json for 'firebase' version.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT: Replace this with your actual Firebase project configuration.
// This configuration MUST be identical to the one in src/lib/firebase/config.ts
const firebaseConfig = {
  apiKey: "AIzaSyB70RPghxuHHHvDs2zMbfyuV2ai0Gj9bp0",
  authDomain: "oursolutioncafe.firebaseapp.com",
  databaseURL: "https://oursolutioncafe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "oursolutioncafe",
  storageBucket: "oursolutioncafe.firebasestorage.app",
  messagingSenderId: "190930468455",
  appId: "1:190930468455:web:474cb33f26ee3c531d9ec2",
  measurementId: "G-5RGCC01CHW" // This is optional
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Courtly Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update from Courtly.',
    // icon: '/courtly-icon-192.png' // Optional: Add an icon in your public folder (e.g., public/courtly-icon-192.png)
  };

  // Ensure the service worker is active before showing notification
  if (self.registration.active) {
    self.registration.showNotification(notificationTitle, notificationOptions);
  } else {
    // If not active, you might queue it or handle differently,
    // but for simplicity, we'll just log. This case is less common.
    console.log('[firebase-messaging-sw.js] Service worker not active, notification not shown immediately.');
  }
});

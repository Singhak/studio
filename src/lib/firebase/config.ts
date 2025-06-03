
// IMPORTANT: Ensure your .env.local or .env.production (or hosting environment variables)
// are populated with your Firebase project configuration values.

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore"; // If you use Firestore
// import { getStorage } from "firebase/storage"; // If you use Storage

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Validate that all required Firebase config values are present
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'
  // Add other keys if they are strictly required for your app's core functionality
  // e.g., databaseURL if Realtime Database is critical, storageBucket if Storage is critical.
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error("Firebase config is missing required keys from environment variables:", missingKeys.join(', '));
  // You might want to throw an error here or handle this more gracefully
  // depending on whether the app can function at all without these.
  // For now, we'll log an error. If running in a context where `process` is not fully defined (e.g. certain test environments),
  // this might also log during build if NEXT_PUBLIC_ vars aren't correctly injected.
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    alert(`Critical Firebase configuration missing: ${missingKeys.join(', ')}. Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_ variables are set.`);
  }
}


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
// const db = getFirestore(app); // If you use Firestore
// const storage = getStorage(app); // If you use Storage

export { app, auth /*, db, storage */ };

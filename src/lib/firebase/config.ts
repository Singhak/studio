
// IMPORTANT: Replace with your actual Firebase project configuration
// Get this from your Firebase project settings:
// Project settings > General > Your apps > Firebase SDK snippet > Config

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore"; // If you use Firestore
// import { getStorage } from "firebase/storage"; // If you use Storage

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

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

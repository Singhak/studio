
// IMPORTANT: Replace with your actual Firebase project configuration
// Get this from your Firebase project settings:
// Project settings > General > Your apps > Firebase SDK snippet > Config

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore"; // If you use Firestore
// import { getStorage } from "firebase/storage"; // If you use Storage

const firebaseConfig = {
  apiKey: "AIzaSyB70RPghxuHHHvDs2zMbfyuV2ai0Gj9bp0",
  authDomain: "oursolutioncafe.firebaseapp.com",
  databaseURL: "https://oursolutioncafe-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "oursolutioncafe",
  storageBucket: "oursolutioncafe.firebasestorage.app",
  messagingSenderId: "190930468455",
  appId: "1:190930468455:web:474cb33f26ee3c531d9ec2",
  measurementId: "G-5RGCC01CHW"
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


"use client"; // Ensure this runs on the client

import React from 'react'; // Import React for JSX
import { getMessaging, getToken, isSupported } from 'firebase/messaging'; // Removed onMessage
import { app } from './config'; // Your Firebase app instance
// Toasting is now handled in AuthContext to avoid import cycles
// import { toast } from '@/hooks/use-toast';
// import { Bell } from 'lucide-react'; // Bell icon also handled in AuthContext

// Ensure this VAPID key is generated from your Firebase project settings:
// Project settings > Cloud Messaging > Web configuration > Web Push certificates.
// It will be read from the environment variable NEXT_PUBLIC_FIREBASE_VAPID_KEY
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const initializeFirebaseMessaging = async () => {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (await isSupported())) {
      const messaging = getMessaging(app);
      // CRITICAL: Ensure 'firebase-messaging-sw.js' exists in your /public folder
      // and is correctly configured with your Firebase project details (hardcoded or injected).
      // The service worker registration is typically handled automatically by Firebase SDK.
      return messaging;
    }
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
  return null;
};

export const requestNotificationPermission = async () => {
  if (!VAPID_KEY) {
    console.warn("Firebase Messaging: NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set in your environment variables. Please set it in .env.local (or similar). Push notifications will not work.");
    // Toasting will be handled in AuthContext where this function is called.
    return null;
  }

  const messagingInstance = await initializeFirebaseMessaging();
  if (!messagingInstance) {
    console.log("Firebase Messaging is not supported in this browser or not initialized.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const currentToken = await getToken(messagingInstance, {
        vapidKey: VAPID_KEY,
      });
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        // Toasting and token saving will be handled in AuthContext
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        // This can happen if the service worker isn't registered/active yet or there's a config issue.
        // Toasting will be handled in AuthContext
        return null;
      }
    } else {
      console.log('Unable to get permission to notify. Permission state:', permission);
      // Toasting will be handled in AuthContext
      return null;
    }
  } catch (error) {
    console.error('An error occurred while requesting permission or getting token:', error);
    // Toasting will be handled in AuthContext
    return null;
  }
};

// onForegroundMessageListener has been removed.
// Foreground message handling is now done directly in AuthContext.tsx using onMessage.

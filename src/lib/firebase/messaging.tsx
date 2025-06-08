
"use client"; // Ensure this runs on the client

import React from 'react'; // Import React for JSX
import { getMessaging, getToken, isSupported, type MessagePayload } from 'firebase/messaging'; // Removed onMessage
import { app } from './config'; // Your Firebase app instance
import { toast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react'; // Import the Bell icon

// Ensure this VAPID key is generated from your Firebase project settings:
// Project settings > Cloud Messaging > Web configuration > Web Push certificates.
// It will be read from the environment variable NEXT_PUBLIC_FIREBASE_VAPID_KEY
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const initializeFirebaseMessaging = async () => {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (await isSupported())) {
      const messaging = getMessaging(app);
      // Note: Service worker registration is typically handled automatically by Firebase SDK
      // when getToken is called, or can be manually registered if needed.
      // Ensure 'firebase-messaging-sw.js' is in your /public folder.
      return messaging;
    }
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
  return null;
};

export const requestNotificationPermission = async () => {
  if (!VAPID_KEY) {
    console.warn("Firebase Messaging: NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set in your environment variables. Please set it in .env.local (or similar).");
    // Toasting from AuthContext now, to avoid import cycle if messaging toasts AuthContext.
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
        // Toasting from AuthContext
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      // Toasting from AuthContext
      return null;
    }
  } catch (error) {
    console.error('An error occurred while requesting permission or getting token:', error);
    // Toasting from AuthContext
    return null;
  }
};

// onForegroundMessageListener is removed as AuthContext will handle its own onMessage subscription.


"use client"; // Ensure this runs on the client

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from './config'; // Your Firebase app instance
import { toast } from '@/hooks/use-toast';

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
    toast({
      variant: 'destructive',
      title: 'Notification Setup Incomplete',
      description: 'VAPID key for push notifications is not configured. Please check your environment variables.',
    });
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
        // serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') // Optional: explicitly provide SW reg
      });
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        // TODO: Send this token to your server and store it associated with the user.
        // Example: await saveTokenToServer(currentToken);
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive updates via push notifications.',
        });
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        toast({
          variant: 'destructive',
          title: 'Notification Error',
          description: 'Could not get notification token. Please ensure notifications are allowed for this site.',
        });
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      toast({
        title: 'Notifications Denied',
        description: 'You will not receive push notifications. You can enable them in browser settings.',
      });
      return null;
    }
  } catch (error) {
    console.error('An error occurred while requesting permission or getting token:', error);
    toast({
      variant: 'destructive',
      title: 'Notification Setup Failed',
      description: 'An error occurred during notification setup. Check console for details.',
    });
    return null;
  }
};

export const onForegroundMessageListener = async () => {
  const messagingInstance = await initializeFirebaseMessaging();
  if (!messagingInstance) return null;

  const unsubscribe = onMessage(messagingInstance, (payload) => {
    console.log('Message received in foreground. ', payload);
    toast({
      title: payload.notification?.title || 'New Notification',
      description: payload.notification?.body || 'You have a new message from Courtly.',
    });
    // Example: You could also play a sound or show a custom in-app UI
  });
  return unsubscribe; // Return the unsubscribe function
};


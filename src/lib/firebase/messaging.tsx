
"use client";

import React from 'react';
import type { AppNotification, ApiNotification } from '@/lib/types';
import { getMessaging, onMessage, type MessagePayload, getToken, isSupported } from 'firebase/messaging';
import { app } from './config';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import type { ToastFn } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';
import { clearClubCache } from '@/lib/cacheUtils';
import { NOTIFICATION_STORAGE_PREFIX, LAST_NOTIFICATION_REMINDER_KEY } from '@/contexts/authHelpers/constants';
import { CourtlyUser } from '@/contexts/AuthContext';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const initializeFirebaseMessaging = async () => {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (await isSupported())) {
      const messaging = getMessaging(app);
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
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while requesting permission or getting token:', error);
    return null;
  }
};

export const getNotificationStorageKey = (uid: string | null | undefined): string | null => {
  return uid ? `${NOTIFICATION_STORAGE_PREFIX}${uid}` : null;
};

export const saveNotificationsToStorage = (
  updatedNotifications: AppNotification[],
  uid: string | null | undefined
) => {
  const storageKey = getNotificationStorageKey(uid);
  if (storageKey && typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
  }
};

const transformApiNotificationToApp = (apiNotif: ApiNotification): AppNotification => {
  return {
    id: apiNotif._id,
    title: apiNotif.title,
    body: apiNotif.message,
    timestamp: new Date(apiNotif.createdAt).getTime(),
    read: apiNotif.isRead,
    href: apiNotif.data?.href,
  };
};

export const fetchAndSetWeeklyAppNotifications = async (
  userForNotifications: CourtlyUser | null,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
) => {
  if (!userForNotifications) {
    setNotifications([]);
    return;
  }
  try {
    const apiNotifications = await getWeeklyNotificationsApi();
    const appNotifications = apiNotifications.map(transformApiNotificationToApp);
    setNotifications(appNotifications);
    saveNotificationsToStorage(appNotifications, userForNotifications.uid);
  } catch (error) {
    console.error("Failed to fetch weekly notifications:", error);
    if (typeof window !== 'undefined') {
      const storageKey = getNotificationStorageKey(userForNotifications.uid);
      if (storageKey) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as AppNotification[];
            setNotifications(parsed);
          } catch (parseError) {
            console.error(`Failed to parse stored notifications (key: ${storageKey}). Error: ${parseError}`);
            localStorage.removeItem(storageKey);
            setNotifications([]);
          }
        } else {
          setNotifications([]);
        }
      }
    }
  }
};

export const addAppNotification = (
  title: string,
  body: string | undefined,
  href: string | undefined,
  id: string | undefined,
  currentUserUid: string | null | undefined,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
) => {
  const newAppNotification: AppNotification = {
    id: id || `client_${Date.now().toString()}_${Math.random().toString(36).substring(2,7)}`,
    title,
    body,
    href,
    timestamp: Date.now(),
    read: false,
  };
  setNotifications(prevNotifications => {
    const updated = [newAppNotification, ...prevNotifications.slice(0, 19)];
    saveNotificationsToStorage(updated, currentUserUid);
    return updated;
  });
};

export const markAppNotificationAsRead = async (
  notificationId: string,
  currentUserUid: string | null | undefined,
  toast: ToastFn,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
) => {
  try {
    await markNotificationsAsReadApi([notificationId]);
    setNotifications(prevNotifications => {
      const updated = prevNotifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotificationsToStorage(updated, currentUserUid);
      return updated;
    });
  } catch (error) {
    console.error("Failed to mark notification as read (NotificationManager):", error);
    toast({
      variant: "destructive",
      toastTitle: "Update Failed",
      toastDescription: "Could not mark notification as read.",
    });
  }
};

export const markAllAppNotificationsAsRead = async (
  currentUserUid: string | null | undefined,
  toast: ToastFn,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
) => {
  setNotifications(prevNotifications => {
    const unreadIds = prevNotifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return prevNotifications;
    
    markNotificationsAsReadApi(unreadIds).catch(error => {
      console.error("Failed to mark all notifications as read (NotificationManager):", error);
      toast({
        variant: "destructive",
        toastTitle: "Update Failed",
        toastDescription: "Could not mark all notifications as read.",
      });
    });

    const updated = prevNotifications.map(n => ({ ...n, read: true }));
    saveNotificationsToStorage(updated, currentUserUid);
    return updated;
  });
};

export const clearAllAppNotifications = async (
  currentUserUid: string | null | undefined,
  toast: ToastFn,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
) => {
  console.log("Simulating: Would call API to clear/delete all notifications for user if endpoint existed.");
  setNotifications([]);
  saveNotificationsToStorage([], currentUserUid);
  toast({ toastTitle: "Notifications Cleared" });
};

export const setupFcmMessaging = async (
  user: CourtlyUser | null,
  toast: ToastFn,
  addNotificationCallback: (title: string, body?: string, href?: string, id?: string) => void
): Promise<(() => void) | null> => {
  if (user) {
    const messaging = await initializeFirebaseMessaging();
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
        console.log('Foreground Message received. ', payload);
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body;
        const href = payload.data?.href;
        const messageId = payload.messageId;
        
        addNotificationCallback(title, body, href, messageId);
        toast({
          toastTitle: (<div className="flex items-center"><Bell className="h-5 w-5 text-primary mr-2" /><span>{title}</span></div>),
          toastDescription: body || 'You have a new message.',
        });

        if (payload.data?.type === 'CLUB_DATA_UPDATED' && payload.data.clubId) {
          clearClubCache(payload.data.clubId as string);
          toast({
            toastTitle: "Club Data Updated",
            toastDescription: `Information for a club has been updated in the background.`,
          });
        }
      });
      return unsubscribe;
    }
  }
  return null;
};

const isSameDay = (ts1: number, ts2: number): boolean => {
  const date1 = new Date(ts1);
  const date2 = new Date(ts2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const showNotificationPermissionReminder = (
    toast: ToastFn,
    ButtonComponent: React.ElementType
) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined' || Notification.permission === 'granted') {
        return;
    }

    const lastReminderTimestampStr = localStorage.getItem(LAST_NOTIFICATION_REMINDER_KEY);
    const now = Date.now();
    let shouldShowReminder = true;

    if (lastReminderTimestampStr) {
        const lastReminderTimestamp = parseInt(lastReminderTimestampStr, 10);
        if (!isNaN(lastReminderTimestamp) && isSameDay(lastReminderTimestamp, now)) {
        shouldShowReminder = false;
        }
    }

    if (shouldShowReminder) {
        const toastInstance = toast({
        toastTitle: (<div className="flex items-center"><Bell className="h-5 w-5 text-primary mr-2" /><span>Stay Updated!</span></div>),
        toastDescription: "Enable notifications for timely booking and club updates.",
        duration: 15000,
        toastAction: (
            <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
            <ButtonComponent size="sm" onClick={async () => { toastInstance.dismiss(); await requestNotificationPermission(); localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());}} className="w-full sm:w-auto"><Bell className="mr-2 h-4 w-4" /> Enable</ButtonComponent>
            <ButtonComponent size="sm" variant="outline" onClick={() => { toastInstance.dismiss(); localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());}} className="w-full sm:w-auto">Maybe Later</ButtonComponent>
            </div>
        ),
        onDismiss: () => { 
            if (!localStorage.getItem(LAST_NOTIFICATION_REMINDER_KEY) || !isSameDay(parseInt(localStorage.getItem(LAST_NOTIFICATION_REMINDER_KEY) || '0', 10), now)) {
            localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());
            }
        }
        });
    }
};

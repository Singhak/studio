
// src/contexts/authHelpers/notificationManager.ts
import type { AppNotification, ApiNotification } from '@/lib/types';
import type { CourtlyUser } from '@/contexts/AuthContext';
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging';
import { initializeFirebaseMessaging, requestNotificationPermission } from '@/lib/firebase/messaging';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import type { ToastFn } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';
import { clearClubCache } from '@/lib/cacheUtils';
import { NOTIFICATION_STORAGE_PREFIX, LAST_NOTIFICATION_REMINDER_KEY } from './constants';

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
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>,
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
) => {
  if (!userForNotifications) {
    setNotifications([]);
    setUnreadCount(0);
    return;
  }
  try {
    const apiNotifications = await getWeeklyNotificationsApi();
    const appNotifications = apiNotifications.map(transformApiNotificationToApp);
    setNotifications(appNotifications);
    setUnreadCount(appNotifications.filter(n => !n.read).length);
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
            setUnreadCount(parsed.filter(n => !n.read).length);
          } catch (parseError) {
            console.error(`Failed to parse stored notifications (key: ${storageKey}). Error: ${parseError}`);
            localStorage.removeItem(storageKey);
            setNotifications([]);
            setUnreadCount(0);
          }
        } else {
          setNotifications([]);
          setUnreadCount(0);
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
  currentNotifications: AppNotification[],
  currentUserUid: string | null | undefined,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>,
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
) => {
  const newAppNotification: AppNotification = {
    id: id || `client_${Date.now().toString()}_${Math.random().toString(36).substring(2,7)}`,
    title,
    body,
    href,
    timestamp: Date.now(),
    read: false,
  };
  const updated = [newAppNotification, ...currentNotifications.slice(0, 19)];
  setNotifications(updated);
  saveNotificationsToStorage(updated, currentUserUid);
  setUnreadCount(prev => prev + 1);
};

export const markAppNotificationAsRead = async (
  notificationId: string,
  currentNotifications: AppNotification[],
  currentUserUid: string | null | undefined,
  toast: ToastFn,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>,
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
) => {
  try {
    await markNotificationsAsReadApi([notificationId]);
    let unreadChanged = false;
    const updated = currentNotifications.map(n => {
      if (n.id === notificationId && !n.read) {
        unreadChanged = true;
        return { ...n, read: true };
      }
      return n;
    });
    if (unreadChanged) {
      setUnreadCount(currentUnread => Math.max(0, currentUnread - 1));
    }
    setNotifications(updated);
    saveNotificationsToStorage(updated, currentUserUid);
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
  currentNotifications: AppNotification[],
  currentUserUid: string | null | undefined,
  toast: ToastFn,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>,
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
) => {
  const unreadIds = currentNotifications.filter(n => !n.read).map(n => n.id);
  if (unreadIds.length === 0) return;
  try {
    await markNotificationsAsReadApi(unreadIds);
    const updated = currentNotifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotificationsToStorage(updated, currentUserUid);
    setUnreadCount(0);
  } catch (error) {
    console.error("Failed to mark all notifications as read (NotificationManager):", error);
    toast({
      variant: "destructive",
      toastTitle: "Update Failed",
      toastDescription: "Could not mark all notifications as read.",
    });
  }
};

export const clearAllAppNotifications = async (
  currentUserUid: string | null | undefined,
  toast: ToastFn,
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>,
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
) => {
  console.log("Simulating: Would call API to clear/delete all notifications for user if endpoint existed.");
  setNotifications([]);
  setUnreadCount(0);
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
  return null; // Return null if no user or messaging not initialized
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
    ButtonComponent: React.ElementType // Pass Button as a component
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
        duration: 15000, // Increased duration
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

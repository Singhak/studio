
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  type ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { initializeFirebaseMessaging, requestNotificationPermission } from '@/lib/firebase/messaging';
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging';
import type { AppNotification, ApiNotification } from '@/lib/types';
import { Bell, Settings } from 'lucide-react'; // Added Settings icon
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import { Button } from '@/components/ui/button'; // For the toast action

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  profileCompletionPending: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setProfileCompletionPending: (pending: boolean) => void;
  signUpWithEmail: (email: string, password: string) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<User | null>;
  logoutUser: () => Promise<void>;
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (title: string, body?: string, href?: string, id?: string) => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';
const CUSTOM_REFRESH_TOKEN_KEY = 'courtlyCustomRefreshToken';
const LAST_NOTIFICATION_REMINDER_KEY = 'courtly-last-notification-reminder-shown';

// Helper to transform ApiNotification to AppNotification
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

// Helper to check if two timestamps are on the same calendar day
const isSameDay = (ts1: number, ts2: number): boolean => {
  const date1 = new Date(ts1);
  const date2 = new Date(ts2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // For initial auth state check
  const [profileCompletionPending, setProfileCompletionPending] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getNotificationStorageKey = useCallback((uid: string | null | undefined) => {
    return uid ? `courtly-app-notifications-${uid}` : null;
  }, []);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
    if (storedAccessToken) setAccessToken(storedAccessToken);
    if (storedRefreshToken) setRefreshToken(storedRefreshToken);
  }, []);

  const saveNotificationsToStorage = useCallback((updatedNotifications: AppNotification[], uid: string | null | undefined) => {
    const storageKey = getNotificationStorageKey(uid);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
    }
  }, [getNotificationStorageKey]);
  
  const fetchAndSetWeeklyNotifications = useCallback(async (userForNotifications: User | null) => {
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
      const storageKey = getNotificationStorageKey(userForNotifications.uid);
      if (storageKey) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as AppNotification[];
            setNotifications(parsed);
            setUnreadCount(parsed.filter(n => !n.read).length);
          } catch (parseError) {
            console.error(`Failed to parse stored notifications (key: ${storageKey}). Data was: "${stored.substring(0,100)}..."`, parseError);
            localStorage.removeItem(storageKey); // Clear corrupted data
            setNotifications([]); // Reset to empty
            setUnreadCount(0);
          }
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }
  }, [getNotificationStorageKey, saveNotificationsToStorage]);



  useEffect(() => {
    fetchAndSetWeeklyNotifications(currentUser);
  }, [currentUser, fetchAndSetWeeklyNotifications]);


  const addNotification = useCallback((title: string, body?: string, href?: string, id?: string) => {
    const newAppNotification: AppNotification = {
      id: id || `client_${Date.now().toString()}`, 
      title,
      body,
      href,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newAppNotification, ...prev.slice(0, 19)]; 
      saveNotificationsToStorage(updated, currentUser?.uid);
      return updated;
    });
    setUnreadCount(prev => prev + 1);
  }, [saveNotificationsToStorage, currentUser]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationsAsReadApi([notificationId]);
      setNotifications(prev => {
        let unreadChanged = false;
        const updated = prev.map(n => {
          if (n.id === notificationId && !n.read) {
            unreadChanged = true;
            return { ...n, read: true };
          }
          return n;
        });
        if (unreadChanged) {
          setUnreadCount(currentUnread => Math.max(0, currentUnread - 1));
        }
        saveNotificationsToStorage(updated, currentUser?.uid);
        return updated;
      });
    } catch (error) {
      console.error("Failed to mark notification as read (AuthContext):", error);
      toast({
        variant: "destructive",
        toastTitle: "Update Failed",
        toastDescription: "Could not mark notification as read.",
      });
    }
  }, [saveNotificationsToStorage, toast, currentUser]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await markNotificationsAsReadApi(unreadIds); 
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        saveNotificationsToStorage(updated, currentUser?.uid);
        return updated;
      });
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read (AuthContext):", error);
      toast({
        variant: "destructive",
        toastTitle: "Update Failed",
        toastDescription: "Could not mark all notifications as read.",
      });
    }
  }, [notifications, saveNotificationsToStorage, toast, currentUser]);


  const clearAllNotifications = useCallback(async () => {
    console.log("Simulating: Would call API to clear/delete all notifications for user if endpoint existed.");
    setNotifications([]);
    setUnreadCount(0);
    saveNotificationsToStorage([], currentUser?.uid);
    toast({toastTitle: "Notifications Cleared"});
  }, [saveNotificationsToStorage, toast, currentUser]);

  const handleCustomApiLogin = async (firebaseUser: User): Promise<boolean> => {
    try {
      const firebaseIdToken = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebaseIdToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Custom login failed after Firebase sign-in." }));
        toast({ variant: "destructive", toastTitle: "Custom Login Failed", toastDescription: errorData.message || `Error ${response.status}` });
        await signOut(auth); 
        return false;
      }

      const customTokenData = await response.json();
      setAccessToken(customTokenData.accessToken);
      setRefreshToken(customTokenData.refreshToken);
      localStorage.setItem(CUSTOM_ACCESS_TOKEN_KEY, customTokenData.accessToken);
      localStorage.setItem(CUSTOM_REFRESH_TOKEN_KEY, customTokenData.refreshToken);
      return true;
    } catch (error) {
      console.error("Error during custom API login:", error);
      toast({ variant: "destructive", toastTitle: "Login Error", toastDescription: "Failed to communicate with authentication server." });
      await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure:", e));
      return false;
    }
  };
  
  const logoutUser = useCallback(async () => {
    const uidBeforeLogout = currentUser?.uid; 
    try {
      await signOut(auth); 
      toast({ toastTitle: "Logged Out", toastDescription: "You have been successfully logged out." });
      router.push('/');
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ variant: "destructive", toastTitle: "Logout Failed", toastDescription: error.message });
    } finally {
      if (uidBeforeLogout) {
          const notificationKey = getNotificationStorageKey(uidBeforeLogout);
          if (notificationKey) localStorage.removeItem(notificationKey);
          localStorage.removeItem(`profileCompletionPending_${uidBeforeLogout}`);
      }
      // Clear other states, onAuthStateChanged will also handle some of this
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
      localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      setProfileCompletionPending(false);
      setCurrentUser(null); // Explicitly set current user to null
      setNotifications([]); 
      setUnreadCount(0);
    }
  }, [currentUser, getNotificationStorageKey, toast, router]);


  useEffect(() => {
    let unsubscribeFcmOnMessage: (() => void) | null = null;

    const setupFcm = async (fcmUser: User | null) => { 
      if (fcmUser) { 
        const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!VAPID_KEY) {
            // Warning logged in messaging.tsx
        }
        
        // We don't automatically request permission here anymore as part of setupFcm.
        // Permission request is now more user-initiated (e.g., from reminder toast or settings).
        // const token = await requestNotificationPermission(); 
        // if (token) {
        //      toast({
        //         toastTitle: (<div className="flex items-center gap-2"><Bell className="h-5 w-5 text-green-500" /><span>Notifications Enabled</span></div>),
        //         toastDescription: 'You will receive updates via push notifications.',
        //     });
        // }

        const messaging = await initializeFirebaseMessaging(); 
        if (messaging) {
          unsubscribeFcmOnMessage = onMessage(messaging, (payload: MessagePayload) => {
            console.log('Foreground Message received. ', payload);
            const title = payload.notification?.title || 'New Notification';
            const body = payload.notification?.body;
            addNotification(title, body, payload.data?.href, payload.messageId);
            toast({
              toastTitle: (<div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><span>{title}</span></div>),
              toastDescription: body || 'You have a new message.',
            });
          });
        }
      } else { 
         if (unsubscribeFcmOnMessage) {
          unsubscribeFcmOnMessage();
          unsubscribeFcmOnMessage = null;
        }
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user); 
      if (user) {
        if (localStorage.getItem(`profileCompletionPending_${user.uid}`) === 'true') {
          setProfileCompletionPending(true);
          localStorage.removeItem(`profileCompletionPending_${user.uid}`);
        }
        if (!accessToken && localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY)) {
            setAccessToken(localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY));
        }
        if (!refreshToken && localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY)) {
            setRefreshToken(localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY));
        }
      } else { 
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
        localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
        setProfileCompletionPending(false); 
        setNotifications([]); 
        setUnreadCount(0);
         if (unsubscribeFcmOnMessage) {
          unsubscribeFcmOnMessage();
          unsubscribeFcmOnMessage = null;
        }
      }
      await setupFcm(user); 
      setLoading(false); 
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFcmOnMessage) { 
        unsubscribeFcmOnMessage();
      }
    };
  }, [addNotification, toast, accessToken, refreshToken]);


  useEffect(() => {
    if (loading) return; 

    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser) { 
      if (profileCompletionPending) {
        if (pathname !== '/auth/complete-profile') {
          router.push('/auth/complete-profile');
        }
      } else if (accessToken && refreshToken) { 
        if (isAuthPage) {
          router.push('/dashboard/user'); 
        }
      } else { 
        // If user is authenticated with Firebase but custom tokens are missing (e.g. after a refresh where they expired or weren't set)
        // and they are on a protected path, it might be better to try re-establishing custom session or log them out.
        // For now, if on protected path without custom tokens, let's log them out fully.
        if (isProtectedPath) {
          console.warn("User is on a protected path but custom tokens are missing. Logging out.");
          logoutUser(); 
        }
      }
    } else { 
      if (isProtectedPath) {
        router.push('/login');
      }
    }
  }, [currentUser, profileCompletionPending, loading, router, pathname, accessToken, refreshToken, logoutUser]);

  // Effect for the "once per day" notification reminder
  useEffect(() => {
    if (loading) { // Don't run if auth state is still loading
      return;
    }

    // Check if Notification API is available and permission is not already granted
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
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
        const {id: toastId, dismiss} = toast({
          toastTitle: (
            <div className="flex items-start">
              <Bell className="h-5 w-5 text-primary mr-3 mt-0.5 shrink-0" />
              <div>
                Stay Updated!
              </div>
            </div>
          ),
          toastDescription: "Enable push notifications to get timely alerts about your bookings and club updates.",
          duration: 15000, // Keep it visible for a bit longer
          toastAction: (
            <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
                 <Button
                    size="sm"
                    onClick={async () => {
                      dismiss(); // Dismiss this reminder toast
                      await requestNotificationPermission(); // This function already handles its own success/failure toasts
                      localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Bell className="mr-2 h-4 w-4" /> Enable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      dismiss();
                      localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString()); // Still mark as shown for today
                    }}
                     className="w-full sm:w-auto"
                  >
                    Maybe Later
                  </Button>
            </div>
          ),
          onDismiss: () => {
            // Ensure it's marked as shown for today even if auto-dismissed or swiped away
            if (!localStorage.getItem(LAST_NOTIFICATION_REMINDER_KEY) || !isSameDay(parseInt(localStorage.getItem(LAST_NOTIFICATION_REMINDER_KEY) || '0', 10), now)) {
                 localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());
            }
          }
        });
      }
    }
  }, [loading, toast]); // Removed requestNotificationPermission from deps as it's called inside, and toast is stable


  const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) return null;

      localStorage.setItem(`profileCompletionPending_${firebaseUser.uid}`, 'true');
      setProfileCompletionPending(true); 
      toast({ toastTitle: "Registration Successful!", toastDescription: "Please complete your profile." });
      return firebaseUser;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: "destructive", toastTitle: "Registration Failed", toastDescription: "This email address is already in use. Please try logging in or use a different email address." });
      } else {
        console.error("Error signing up:", error);
        toast({ variant: "destructive", toastTitle: "Registration Failed", toastDescription: error.message });
      }
      return null;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) return null;
        
      setProfileCompletionPending(false); 
      toast({ toastTitle: "Login Successful!", toastDescription: "Welcome back!" });
      return firebaseUser;
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: "Invalid email or password." });
      } else {
        console.error("Error signing in:", error);
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: error.message || "An unexpected error occurred." });
      }
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
      localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      return null;
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) return null;

      if (localStorage.getItem(`profileCompletionPending_${firebaseUser.uid}`) === 'true') {
        setProfileCompletionPending(true); 
        toast({ toastTitle: "Google Sign-In Successful!", toastDescription: "Welcome! Please complete your profile." });
      } else {
        setProfileCompletionPending(false);
        toast({ toastTitle: "Google Sign-In Successful!", toastDescription: "Welcome back!" });
      }
      return firebaseUser;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({ variant: "destructive", toastTitle: "Google Sign-In Failed", toastDescription: error.message });
      return null;
    }
  };

  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    try {
      const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
      toast({ toastTitle: "Verification Code Sent", toastDescription: "Please check your phone for the SMS code." });
      return confirmationResult;
    } catch (error: any) {
      if (window.recaptchaVerifier) { 
        window.recaptchaVerifier.clear(); 
        window.recaptchaVerifier = undefined; 
      }
      if (error.code === 'auth/operation-not-allowed') {
        toast({ variant: "destructive", toastTitle: "Phone Sign-In Error", toastDescription: "Phone number sign-in is not enabled." });
      } else {
        console.error("Error sending SMS for phone auth:", error);
        toast({ variant: "destructive", toastTitle: "Phone Sign-In Error", toastDescription: error.message });
      }
      return null;
    }
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<User | null> => {
    try {
      const userCredential = await confirmationResult.confirm(code);
      const firebaseUser = userCredential.user;

      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) return null;
      
      localStorage.setItem(`profileCompletionPending_${firebaseUser.uid}`, 'true');
      setProfileCompletionPending(true); 
      toast({ toastTitle: "Phone Sign-In Successful!", toastDescription: "Please complete your profile." });
      return firebaseUser;
    } catch (error: any) {
      console.error("Error verifying phone code:", error);
      toast({ variant: "destructive", toastTitle: "Verification Failed", toastDescription: error.message });
      return null;
    }
  };


  const value = {
    currentUser,
    loading, 
    profileCompletionPending,
    accessToken,
    refreshToken,
    setProfileCompletionPending,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithPhoneNumberFlow,
    confirmPhoneNumberCode,
    logoutUser,
    notifications,
    unreadCount,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


    
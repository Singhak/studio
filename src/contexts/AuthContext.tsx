
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
import { requestNotificationPermission, initializeFirebaseMessaging } from '@/lib/firebase/messaging';
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging';
import type { AppNotification, ApiNotification } from '@/lib/types';
import { Bell } from 'lucide-react';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';

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


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCompletionPending, setProfileCompletionPending] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getNotificationStorageKey = useCallback(() => {
    return currentUser ? `courtly-app-notifications-${currentUser.uid}` : null;
  }, [currentUser]);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
    if (storedAccessToken) setAccessToken(storedAccessToken);
    if (storedRefreshToken) setRefreshToken(storedRefreshToken);
  }, []);

  const fetchAndSetWeeklyNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const apiNotifications = await getWeeklyNotificationsApi();
      const appNotifications = apiNotifications.map(transformApiNotificationToApp);
      setNotifications(appNotifications);
      setUnreadCount(appNotifications.filter(n => !n.read).length);
      saveNotificationsToStorage(appNotifications);
    } catch (error) {
      console.error("Failed to fetch weekly notifications:", error);
      // Load from storage as fallback or clear if API preferred as single source of truth on load
      const storageKey = getNotificationStorageKey();
      if (storageKey) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as AppNotification[];
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    }
  }, [currentUser, getNotificationStorageKey]); // Removed saveNotificationsToStorage from dep array as it's defined below

  const saveNotificationsToStorage = useCallback((updatedNotifications: AppNotification[]) => {
    const storageKey = getNotificationStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
    }
  }, [getNotificationStorageKey]);

  useEffect(() => {
    if (currentUser) {
      fetchAndSetWeeklyNotifications();
    } else {
        setNotifications([]);
        setUnreadCount(0);
    }
  }, [currentUser, fetchAndSetWeeklyNotifications]);


  const addNotification = useCallback((title: string, body?: string, href?: string, id?: string) => {
    const newAppNotification: AppNotification = {
      id: id || `client_${Date.now().toString()}`, // Prefix client-side IDs
      title,
      body,
      href,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newAppNotification, ...prev.slice(0, 19)]; 
      saveNotificationsToStorage(updated);
      return updated;
    });
    setUnreadCount(prev => prev + 1);
  }, [saveNotificationsToStorage]);

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
        saveNotificationsToStorage(updated);
        return updated;
      });
    } catch (error) {
      console.error("Failed to mark notification as read (AuthContext):", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not mark notification as read.",
      });
    }
  }, [saveNotificationsToStorage, toast]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await markNotificationsAsReadApi(unreadIds); 
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        saveNotificationsToStorage(updated);
        return updated;
      });
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read (AuthContext):", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not mark all notifications as read.",
      });
    }
  }, [notifications, saveNotificationsToStorage, toast]);


  const clearAllNotifications = useCallback(async () => {
    // Consider if an API call to delete notifications on backend is needed.
    // For now, clearing client-side state and storage.
    console.log("Simulating: Would call API to clear/delete all notifications for user if endpoint existed.");
    setNotifications([]);
    setUnreadCount(0);
    saveNotificationsToStorage([]);
    toast({title: "Notifications Cleared"});
  }, [saveNotificationsToStorage, toast]);


  useEffect(() => {
    let unsubscribeFcmOnMessage: (() => void) | null = null;

    const setupFcm = async () => {
      if (currentUser) {
        const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!VAPID_KEY) {
            // Warning logged in messaging.ts
        }
        
        const token = await requestNotificationPermission();
        if (token) {
             toast({
                title: (<div className="flex items-center gap-2"><Bell className="h-5 w-5 text-green-500" /><span>Notifications Enabled</span></div>),
                description: 'You will receive updates via push notifications.',
            });
        }

        const messaging = await initializeFirebaseMessaging();
        if (messaging) {
          unsubscribeFcmOnMessage = onMessage(messaging, (payload: MessagePayload) => {
            console.log('Foreground Message received. ', payload);
            const title = payload.notification?.title || 'New Notification';
            const body = payload.notification?.body;
            // For FCM messages, use addNotification to prepend to the list
            addNotification(title, body, payload.data?.href, payload.messageId);
            toast({
              title: (<div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><span>{title}</span></div>),
              description: body || 'You have a new message.',
            });
          });
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
        if (!accessToken) {
            const storedAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
            if (storedAccessToken) setAccessToken(storedAccessToken);
        }
        if(!refreshToken) {
            const storedRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
            if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        }
        await fetchAndSetWeeklyNotifications(); // Fetch weekly notifications on login
        await setupFcm();
      } else {
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
        localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
        setNotifications([]); // Clear notifications on logout
        setUnreadCount(0);
        if (unsubscribeFcmOnMessage) {
          unsubscribeFcmOnMessage();
          unsubscribeFcmOnMessage = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFcmOnMessage) {
        unsubscribeFcmOnMessage();
      }
    };
  }, [addNotification, toast, accessToken, refreshToken, fetchAndSetWeeklyNotifications]); // Added dependencies

  useEffect(() => {
    if (loading) return;

    if (currentUser && profileCompletionPending && pathname !== '/auth/complete-profile') {
      router.push('/auth/complete-profile');
    } else if (currentUser && !profileCompletionPending) {
      const authPages = ['/login', '/register', '/auth/complete-profile'];
      if (authPages.includes(pathname)) {
        router.push('/dashboard/user');
      }
    } else if (!currentUser) {
      const protectedAuthPages = ['/auth/complete-profile'];
      if (protectedAuthPages.includes(pathname)) {
        router.push('/login');
      }
    }
  }, [currentUser, profileCompletionPending, loading, router, pathname]);


  const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem(`profileCompletionPending_${userCredential.user.uid}`, 'true');
      setProfileCompletionPending(true);
      toast({ title: "Registration Successful!", description: "Please complete your profile." });
      return userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: "destructive", title: "Registration Failed", description: "This email address is already in use. Please try logging in or use a different email address." });
      } else {
        console.error("Error signing up:", error);
        toast({ variant: "destructive", title: "Registration Failed", description: error.message });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        const firebaseIdToken = await firebaseUser.getIdToken();
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: firebaseIdToken }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Custom login failed after Firebase login."}));
          toast({ variant: "destructive", title: "Custom Login Failed", description: errorData.message || `Error ${response.status}` });
          await signOut(auth); 
          return null;
        }

        const customTokenData = await response.json();
        setAccessToken(customTokenData.accessToken);
        setRefreshToken(customTokenData.refreshToken);
        localStorage.setItem(CUSTOM_ACCESS_TOKEN_KEY, customTokenData.accessToken);
        localStorage.setItem(CUSTOM_REFRESH_TOKEN_KEY, customTokenData.refreshToken);
        
        setProfileCompletionPending(false); 
        toast({ title: "Login Successful!", description: "Welcome back!" });
        // setCurrentUser will be set by onAuthStateChanged, which then triggers fetchAndSetWeeklyNotifications
        return firebaseUser;
      }
      return null; 
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or password." });
      } else {
        console.error("Error signing in:", error);
        toast({ variant: "destructive", title: "Login Failed", description: error.message || "An unexpected error occurred." });
      }
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
      localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const isNewUser = result.additionalUserInfo?.isNewUser; // Deprecated, but still works for now
      if (isNewUser) {
        localStorage.setItem(`profileCompletionPending_${result.user.uid}`, 'true');
        setProfileCompletionPending(true);
        toast({ title: "Google Sign-Up Successful!", description: "Welcome! Please complete your profile." });
      } else {
        setProfileCompletionPending(false);
        toast({ title: "Google Sign-In Successful!", description: "Welcome back!" });
      }
      // setCurrentUser will be set by onAuthStateChanged, which then triggers fetchAndSetWeeklyNotifications
      return result.user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({ variant: "destructive", title: "Google Sign-In Failed", description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setLoading(true);
    try {
      const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
      toast({ title: "Verification Code Sent", description: "Please check your phone for the SMS code." });
      setLoading(false);
      return confirmationResult;
    } catch (error: any) {
      if ((window as any).recaptchaVerifierInstance) {
        (window as any).recaptchaVerifierInstance.clear();
      }
      if (error.code === 'auth/operation-not-allowed') {
        toast({ variant: "destructive", title: "Phone Sign-In Error", description: "Phone number sign-in is not enabled." });
      } else {
        console.error("Error sending SMS for phone auth:", error);
        toast({ variant: "destructive", title: "Phone Sign-In Error", description: error.message });
      }
      setLoading(false);
      return null;
    }
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(code);
      localStorage.setItem(`profileCompletionPending_${userCredential.user.uid}`, 'true');
      setProfileCompletionPending(true);
      toast({ title: "Phone Sign-In Successful!", description: "Please complete your profile." });
      setLoading(false);
      // setCurrentUser will be set by onAuthStateChanged, which then triggers fetchAndSetWeeklyNotifications
      return userCredential.user;
    } catch (error: any) {
      console.error("Error verifying phone code:", error);
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
      setLoading(false);
      return null;
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      const uidBeforeLogout = currentUser?.uid; 
      await signOut(auth); 
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
      localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      setProfileCompletionPending(false);
      
      if (uidBeforeLogout) {
          localStorage.removeItem(getNotificationStorageKey() || `courtly-app-notifications-${uidBeforeLogout}`);
      }
      setNotifications([]);
      setUnreadCount(0);

      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/');
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    } finally {
      setLoading(false);
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

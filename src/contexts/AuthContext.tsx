
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
import type { AppNotification } from '@/lib/types';
import { Bell } from 'lucide-react';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  profileCompletionPending: boolean;
  accessToken: string | null; // Custom backend access token
  refreshToken: string | null; // Custom backend refresh token
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
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';
const CUSTOM_REFRESH_TOKEN_KEY = 'courtlyCustomRefreshToken';

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
    return currentUser ? `courtly-notifications-${currentUser.uid}` : null;
  }, [currentUser]);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
    if (storedAccessToken) setAccessToken(storedAccessToken);
    if (storedRefreshToken) setRefreshToken(storedRefreshToken);
  }, []);


  useEffect(() => {
    const storageKey = getNotificationStorageKey();
    if (storageKey) {
      const storedNotifications = localStorage.getItem(storageKey);
      if (storedNotifications) {
        const parsedNotifications: AppNotification[] = JSON.parse(storedNotifications);
        setNotifications(parsedNotifications);
        setUnreadCount(parsedNotifications.filter(n => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } else {
        setNotifications([]);
        setUnreadCount(0);
    }
  }, [currentUser, getNotificationStorageKey]);

  const saveNotificationsToStorage = useCallback((updatedNotifications: AppNotification[]) => {
    const storageKey = getNotificationStorageKey();
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
    }
  }, [getNotificationStorageKey]);

  const addNotification = useCallback((title: string, body?: string, href?: string, id?: string) => {
    const newNotification: AppNotification = {
      id: id || Date.now().toString(),
      title,
      body,
      href,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newNotification, ...prev.slice(0, 19)];
      saveNotificationsToStorage(updated);
      return updated;
    });
    setUnreadCount(prev => prev + 1);
  }, [saveNotificationsToStorage]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notificationId && !n.read ? { ...n, read: true } : n);
      if (updated.find(n => n.id === notificationId)?.read !== prev.find(n => n.id === notificationId)?.read) {
          setUnreadCount(currentUnread => Math.max(0, currentUnread - 1));
      }
      saveNotificationsToStorage(updated);
      return updated;
    });
  }, [saveNotificationsToStorage]);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotificationsToStorage(updated);
      return updated;
    });
    setUnreadCount(0);
  }, [saveNotificationsToStorage]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    saveNotificationsToStorage([]);
  }, [saveNotificationsToStorage]);


  useEffect(() => {
    let unsubscribeFcmOnMessage: (() => void) | null = null;

    const setupFcm = async () => {
      if (currentUser) {
        const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!VAPID_KEY) {
          toast({ variant: 'destructive', title: 'Notification Setup Incomplete', description: 'VAPID key missing.' });
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
        // If user exists, try to load custom tokens if not already loaded (e.g. on page refresh)
        if (!accessToken) {
            const storedAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
            if (storedAccessToken) setAccessToken(storedAccessToken);
        }
        if(!refreshToken) {
            const storedRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
            if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        }
        await setupFcm();
      } else {
        // Clear custom tokens if Firebase user is null
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
        localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
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
  }, [currentUser, addNotification, toast, accessToken, refreshToken]);

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
        // Call your custom backend
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: firebaseIdToken }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Custom login failed after Firebase login."}));
          toast({ variant: "destructive", title: "Custom Login Failed", description: errorData.message || `Error ${response.status}` });
          await signOut(auth); // Sign out from Firebase if custom login fails
          return null;
        }

        const customTokenData = await response.json();
        setAccessToken(customTokenData.accessToken);
        setRefreshToken(customTokenData.refreshToken);
        localStorage.setItem(CUSTOM_ACCESS_TOKEN_KEY, customTokenData.accessToken);
        localStorage.setItem(CUSTOM_REFRESH_TOKEN_KEY, customTokenData.refreshToken);
        
        setProfileCompletionPending(false); 
        toast({ title: "Login Successful!", description: "Welcome back!" });
        return firebaseUser;
      }
      return null; // Should not happen if signInWithEmailAndPassword succeeded
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
      // TODO: Implement similar custom backend call for Google Sign-In if needed
      // const firebaseIdToken = await result.user.getIdToken();
      // const response = await fetch('/api/auth/login', { /* ... */ }); ...
      // For now, Google Sign-In only uses Firebase and does not set custom tokens.

      const isNewUser = result.additionalUserInfo?.isNewUser;
      if (isNewUser) {
        localStorage.setItem(`profileCompletionPending_${result.user.uid}`, 'true');
        setProfileCompletionPending(true);
        toast({ title: "Google Sign-Up Successful!", description: "Welcome! Please complete your profile." });
      } else {
        setProfileCompletionPending(false);
        toast({ title: "Google Sign-In Successful!", description: "Welcome back!" });
      }
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
      // TODO: Implement similar custom backend call for Phone Sign-In if needed
      localStorage.setItem(`profileCompletionPending_${userCredential.user.uid}`, 'true');
      setProfileCompletionPending(true);
      toast({ title: "Phone Sign-In Successful!", description: "Please complete your profile." });
      setLoading(false);
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
      await signOut(auth); // Signs out from Firebase
      // Clear custom tokens
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
      localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      
      setProfileCompletionPending(false);
      setNotifications([]);
      setUnreadCount(0);
      const localCurrentUser = auth.currentUser; // Should be null after signOut
      if(localCurrentUser) { // This check might be redundant but safe
          localStorage.removeItem(`courtly-notifications-${localCurrentUser.uid}`);
      } else { // If currentUser in context was already set to null, try to get Uid from previous state if needed
          // This part is tricky, usually we clear for the UID that *was* logged in.
          // The onAuthStateChanged listener already handles clearing for the new (null) user state.
      }

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

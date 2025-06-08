
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCompletionPending, setProfileCompletionPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getNotificationStorageKey = useCallback(() => {
    return currentUser ? `courtly-notifications-${currentUser.uid}` : null;
  }, [currentUser]);

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
      id: id || Date.now().toString(), // Use provided id or generate one
      title,
      body,
      href,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newNotification, ...prev.slice(0, 19)]; // Keep max 20 notifications
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
        
        const token = await requestNotificationPermission(); // Handles permission & gets token
        if (token) {
             toast({
                title: (<div className="flex items-center gap-2"><Bell className="h-5 w-5 text-green-500" /><span>Notifications Enabled</span></div>),
                description: 'You will receive updates via push notifications.',
            });
          // TODO: Send token to server
        } else {
            // toast for permission denied or error already handled by requestNotificationPermission if it decides to toast
        }

        const messaging = await initializeFirebaseMessaging();
        if (messaging) {
          unsubscribeFcmOnMessage = onMessage(messaging, (payload: MessagePayload) => {
            console.log('Foreground Message received. ', payload);
            const title = payload.notification?.title || 'New Notification';
            const body = payload.notification?.body;
            addNotification(title, body, payload.data?.href, payload.messageId); // Use messageId if available
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
        await setupFcm();
      } else {
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
  }, [currentUser, addNotification, toast]); // Added addNotification and toast

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
      setProfileCompletionPending(false); // Existing users don't need profile completion
      toast({ title: "Login Successful!", description: "Welcome back!" });
      return userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') { // Updated error code
        toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or password. Please check your credentials or sign up." });
      } else if (error.code === 'auth/wrong-password') { // Still handle for older Firebase versions potentially
        toast({ variant: "destructive", title: "Login Failed", description: "Incorrect password. Please try again." });
      } else {
        console.error("Error signing in:", error);
        toast({ variant: "destructive", title: "Login Failed", description: "An unexpected error occurred. Please try again." });
      }
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
      // Check if it's a new user to Firebase Authentication for profile completion
      // This is a basic check; for more robust new user detection, you might query Firestore
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
      if ((window as any).recaptchaVerifierInstance) { // Check if a specific instance was stored
        (window as any).recaptchaVerifierInstance.clear(); // Clear the specific instance
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
      await signOut(auth);
      setProfileCompletionPending(false);
      // Clear notifications on logout
      setNotifications([]);
      setUnreadCount(0);
      const storageKey = getNotificationStorageKey(); // Get key before currentUser is null
        if (storageKey) { // Technically, currentUser will be null after signOut, so this key might be based on old user
            // It's better to clear storage for the user that *was* logged in.
            // This is a bit tricky as currentUser is about to be set to null.
            // Let's assume we want to clear the storage for the user who *is* logging out.
            const localCurrentUser = auth.currentUser; // Get current user before it's cleared by onAuthStateChanged
            if(localCurrentUser) {
                localStorage.removeItem(`courtly-notifications-${localCurrentUser.uid}`);
            }
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

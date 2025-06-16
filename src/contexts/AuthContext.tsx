
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  type ConfirmationResult,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { initializeFirebaseMessaging, requestNotificationPermission } from '@/lib/firebase/messaging';
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging';
import type { AppNotification, ApiNotification, UserRole } from '@/lib/types';
import { Bell, CheckCheck, Trash2, Mailbox } from 'lucide-react';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import { Button } from '@/components/ui/button';
import { initializeAuthHelpers } from '@/lib/apiUtils';

export interface CourtlyUser extends FirebaseUser {
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  uid: string;
  roles: UserRole[];
}

interface AuthContextType {
  currentUser: CourtlyUser | null;
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>; // No longer returns CourtlyUser directly
  signInWithEmail: (email: string, password: string) => Promise<void>; // No longer returns CourtlyUser directly
  signInWithGoogle: () => Promise<void>; // No longer returns CourtlyUser directly
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>; // No longer returns CourtlyUser directly
  logoutUser: () => Promise<void>;
  updateCourtlyUserRoles: (roles: UserRole[]) => void;
  attemptTokenRefresh: () => Promise<boolean>;
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
const COURTLY_USER_ROLES_PREFIX = 'courtly_user_roles_';

const ALL_USER_ROLES_VALUES: ReadonlyArray<UserRole> = ['user', 'owner', 'admin', 'editor'];
const isValidUserRole = (role: any): role is UserRole => {
  return ALL_USER_ROLES_VALUES.includes(role);
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
  const [currentUser, setCurrentUser] = useState<CourtlyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const unsubscribeFcmOnMessageRef = React.useRef<(() => void) | null>(null);
  
  // Ref to prevent re-entrant processing within onAuthStateChanged for the same Firebase event
  const isProcessingAuthEventRef = React.useRef(false);
  const currentProcessingUidRef = React.useRef<string | null>(null);


  const getNotificationStorageKey = useCallback((uid: string | null | undefined) => {
    return uid ? `courtly-app-notifications-${uid}` : null;
  }, []);

  const setAndStoreAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(CUSTOM_ACCESS_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
      }
    }
  }, []);

  const setAndStoreRefreshToken = useCallback((token: string | null) => {
    setRefreshTokenState(token);
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(CUSTOM_REFRESH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      }
    }
  }, []);
  
  const saveNotificationsToStorage = useCallback((updatedNotifications: AppNotification[], uid: string | null | undefined) => {
    const storageKey = getNotificationStorageKey(uid);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
    }
  }, [getNotificationStorageKey]);

  const fetchAndSetWeeklyNotifications = useCallback(async (userForNotifications: CourtlyUser | null) => {
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
              console.error(`Failed to parse stored notifications (key: ${storageKey}). Data was: "${stored.substring(0, 100)}..."`, parseError);
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
  }, [getNotificationStorageKey, saveNotificationsToStorage]);

  const addNotificationCb = useCallback((title: string, body?: string, href?: string, id?: string) => {
    const newAppNotification: AppNotification = {
      id: id || `client_${Date.now().toString()}_${Math.random().toString(36).substring(2,7)}`,
      title,
      body,
      href,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newAppNotification, ...prev.slice(0, 19)];
      const currentFbUser = auth.currentUser; 
      if (currentFbUser) { 
        saveNotificationsToStorage(updated, currentFbUser.uid);
      }
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
        const currentFbUser = auth.currentUser;
        if (currentFbUser) {
          saveNotificationsToStorage(updated, currentFbUser.uid);
        }
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
  }, [saveNotificationsToStorage, toast]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    try {
      await markNotificationsAsReadApi(unreadIds);
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        const currentFbUser = auth.currentUser;
        if (currentFbUser) {
          saveNotificationsToStorage(updated, currentFbUser.uid);
        }
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
  }, [notifications, saveNotificationsToStorage, toast]);

  const clearAllNotifications = useCallback(async () => {
    console.log("Simulating: Would call API to clear/delete all notifications for user if endpoint existed.");
    setNotifications([]);
    setUnreadCount(0);
    const currentFbUser = auth.currentUser;
    if (currentFbUser) {
      saveNotificationsToStorage([], currentFbUser.uid);
    }
    toast({ toastTitle: "Notifications Cleared" });
  }, [saveNotificationsToStorage, toast]);

  const logoutUserCb = useCallback(async () => {
    const uidBeforeLogout = auth.currentUser?.uid;
    try {
      await signOut(auth);
      toast({ toastTitle: "Logged Out", toastDescription: "You have been successfully logged out." });
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ variant: "destructive", toastTitle: "Logout Failed", toastDescription: error.message });
    } finally {
      if (uidBeforeLogout && typeof window !== 'undefined') {
        const notificationKey = getNotificationStorageKey(uidBeforeLogout);
        if (notificationKey) localStorage.removeItem(notificationKey);
        localStorage.removeItem(`${COURTLY_USER_ROLES_PREFIX}${uidBeforeLogout}`);
      }
      setAndStoreAccessToken(null);
      setAndStoreRefreshToken(null);
      setCurrentUser(null); 
      setNotifications([]);
      setUnreadCount(0);
      isProcessingAuthEventRef.current = false; 
      currentProcessingUidRef.current = null;
    }
  }, [getNotificationStorageKey, toast, setAndStoreAccessToken, setAndStoreRefreshToken]);

  const getStoredRoles = useCallback((uid: string): UserRole[] => {
    const defaultRoles: UserRole[] = ['user'];
    if (typeof window === 'undefined') return defaultRoles;
    const storedRolesString = localStorage.getItem(`${COURTLY_USER_ROLES_PREFIX}${uid}`);
    if (!storedRolesString) return defaultRoles;
    try {
      const parsedRoles = JSON.parse(storedRolesString);
      if (Array.isArray(parsedRoles) && parsedRoles.every(isValidUserRole)) {
        const rolesSet = new Set<UserRole>(parsedRoles as UserRole[]);
        if (rolesSet.size > 0) rolesSet.add('user'); // Ensure 'user' is always present if other roles exist
        return rolesSet.size > 0 ? Array.from(rolesSet) : defaultRoles;
      }
    } catch (e) {
      console.error(`Error parsing stored roles for user ${uid}. Defaulting. Error: ${e}`);
    }
    return defaultRoles;
  }, []);

  const setupFcm = useCallback(async (fcmUser: CourtlyUser | null) => {
    if (unsubscribeFcmOnMessageRef.current) {
      unsubscribeFcmOnMessageRef.current();
      unsubscribeFcmOnMessageRef.current = null;
    }
    if (fcmUser) {
      const messaging = await initializeFirebaseMessaging();
      if (messaging) {
        unsubscribeFcmOnMessageRef.current = onMessage(messaging, (payload: MessagePayload) => {
          console.log('Foreground Message received. ', payload);
          const title = payload.notification?.title || 'New Notification';
          const body = payload.notification?.body;
          addNotificationCb(title, body, payload.data?.href, payload.messageId);
          toast({
            toastTitle: (<div className="flex items-center"><Bell className="h-5 w-5 text-primary mr-2" /><span>{title}</span></div>),
            toastDescription: body || 'You have a new message.',
          });
        });
      }
    }
  }, [addNotificationCb, toast]);


  const handleCustomApiLogin = useCallback(async (fbUser: FirebaseUser): Promise<CourtlyUser | null> => {
    try {
      const firebaseIdToken = await fbUser.getIdToken();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebaseIdToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Custom login failed after Firebase sign-in." }));
        toast({ variant: "destructive", toastTitle: "Custom Login Failed", toastDescription: errorData.message || `Error ${response.status}` });
        await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure:", e));; 
        setCurrentUser(null); 
        setAndStoreAccessToken(null);
        setAndStoreRefreshToken(null);
        return null;
      }

      const customTokenData = await response.json();
      setAndStoreAccessToken(customTokenData.accessToken);
      setAndStoreRefreshToken(customTokenData.refreshToken);
      
      const userRoles = getStoredRoles(fbUser.uid);
      const courtlyUser: CourtlyUser = {
        ...(fbUser as any),
        displayName: fbUser.displayName,
        email: fbUser.email,
        phoneNumber: fbUser.phoneNumber,
        photoURL: fbUser.photoURL,
        uid: fbUser.uid,
        roles: userRoles.length > 0 ? userRoles : ['user'],
      };
      setCurrentUser(courtlyUser);
      await setupFcm(courtlyUser);
      return courtlyUser;

    } catch (error) {
      console.error("Error during custom API login:", error);
      toast({ variant: "destructive", toastTitle: "Login Error", toastDescription: "Failed to communicate with authentication server." });
      await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure:", e));
      setCurrentUser(null);
      setAndStoreAccessToken(null);
      setAndStoreRefreshToken(null);
      return null;
    }
  }, [toast, setAndStoreAccessToken, setAndStoreRefreshToken, getStoredRoles, setupFcm]);


  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    let currentRefreshTokenValue = refreshToken; 
    if (!currentRefreshTokenValue && typeof window !== 'undefined') {
      currentRefreshTokenValue = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
    }
    if (!currentRefreshTokenValue) {
      console.log("AUTH_CONTEXT: No refresh token available for refresh attempt.");
      return false;
    }
    console.log("AUTH_CONTEXT: Attempting to refresh token...");
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshTokenValue }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Token refresh failed with status " + response.status }));
        console.error("AUTH_CONTEXT: Token refresh failed.", errorData.message);
        if (response.status === 401 || response.status === 403) {
          toast({ variant: "destructive", toastTitle: "Session Expired", toastDescription: "Please log in again."});
          await logoutUserCb();
        } else {
           toast({ variant: "destructive", toastTitle: "Refresh Error", toastDescription: errorData.message });
        }
        return false;
      }
      const newTokens = await response.json();
      if (!newTokens.accessToken) {
        console.error("AUTH_CONTEXT: Token refresh successful but no new access token received.");
        await logoutUserCb();
        return false;
      }
      setAndStoreAccessToken(newTokens.accessToken);
      if (newTokens.refreshToken) {
        setAndStoreRefreshToken(newTokens.refreshToken);
      }
      console.log("AUTH_CONTEXT: Tokens refreshed successfully.");
      return true;
    } catch (error) {
      console.error("AUTH_CONTEXT: Error during token refresh:", error);
      toast({ variant: "destructive", toastTitle: "Network Error", toastDescription: "Could not refresh session. Please check connection." });
      return false;
    }
  }, [setAndStoreAccessToken, setAndStoreRefreshToken, logoutUserCb, toast, refreshToken]);

  useEffect(() => {
    initializeAuthHelpers({
      getAccessToken: () => accessToken,
      attemptTokenRefresh,
      logoutUser: logoutUserCb,
    });
  }, [accessToken, attemptTokenRefresh, logoutUserCb]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAndSetWeeklyNotifications(currentUser);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.uid, fetchAndSetWeeklyNotifications]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (isProcessingAuthEventRef.current && firebaseUser?.uid === currentProcessingUidRef.current) {
          console.log(`AUTH_CONTEXT: Already processing auth event for UID: ${firebaseUser?.uid}. Skipping.`);
          setLoading(false); // Ensure loading state is reset
          return;
      }

      if (firebaseUser) {
          isProcessingAuthEventRef.current = true;
          currentProcessingUidRef.current = firebaseUser.uid;
      } else {
          currentProcessingUidRef.current = null; // Clear if no user
      }
      
      try {
        if (firebaseUser) {
          console.log(`AUTH_CONTEXT: Firebase user ${firebaseUser.uid} detected.`);
          const lsAccessToken = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY) : null;
          const lsRefreshToken = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY) : null;

          if (lsAccessToken && lsRefreshToken) {
            console.log("AUTH_CONTEXT: Found custom tokens in localStorage. Hydrating session.");
            setAndStoreAccessToken(lsAccessToken);
            setAndStoreRefreshToken(lsRefreshToken);
            const userRoles = getStoredRoles(firebaseUser.uid);
            const courtlyUserInstance: CourtlyUser = {
              ...(firebaseUser as any),
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              phoneNumber: firebaseUser.phoneNumber,
              photoURL: firebaseUser.photoURL,
              uid: firebaseUser.uid,
              roles: userRoles.length > 0 ? userRoles : ['user'], 
            };
            setCurrentUser(courtlyUserInstance);
            await setupFcm(courtlyUserInstance);
          } else {
            console.log("AUTH_CONTEXT: No custom tokens in localStorage. Attempting custom API login.");
            await handleCustomApiLogin(firebaseUser); 
          }
        } else { 
          console.log("AUTH_CONTEXT: No Firebase user. Clearing session.");
          setAndStoreAccessToken(null);
          setAndStoreRefreshToken(null);
          setCurrentUser(null);
          setNotifications([]);
          setUnreadCount(0);
          if (unsubscribeFcmOnMessageRef.current) {
            unsubscribeFcmOnMessageRef.current();
            unsubscribeFcmOnMessageRef.current = null;
          }
          await setupFcm(null);
        }
      } catch (e) {
        console.error("AUTH_CONTEXT: Error in onAuthStateChanged main try block:", e);
      } finally {
          if (firebaseUser && firebaseUser.uid === currentProcessingUidRef.current) {
              isProcessingAuthEventRef.current = false;
          } else if (!firebaseUser && currentProcessingUidRef.current === null) { 
              // If firebaseUser is null, and we were not processing a specific UID, reset the general flag.
              isProcessingAuthEventRef.current = false;
          }
          // Only clear currentProcessingUidRef if it matches the user we finished processing
          if (currentProcessingUidRef.current === firebaseUser?.uid || !firebaseUser) {
              currentProcessingUidRef.current = null;
          }
          setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFcmOnMessageRef.current) {
        unsubscribeFcmOnMessageRef.current();
      }
    };
  }, [handleCustomApiLogin, setAndStoreAccessToken, setAndStoreRefreshToken, getStoredRoles, setupFcm]);


  useEffect(() => {
    if (loading) return;
    const authPages = ['/login', '/register', '/auth/complete-profile']; 
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser) {
      if (accessToken && refreshToken) { 
        if (isAuthPage) {
          if (currentUser.roles.includes('owner')) {
            router.push('/dashboard/owner');
          } else {
            router.push('/dashboard/user');
          }
        }
      } else { 
        if (isProtectedPath) {
          console.warn("AUTH_CONTEXT: User on protected path without custom tokens. Logging out.");
          logoutUserCb(); 
        }
      }
    } else { 
      if (isProtectedPath) {
        router.push('/login');
      }
    }
  }, [currentUser, loading, router, pathname, accessToken, refreshToken, logoutUserCb]);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;

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
        const toastInstance = toast({
          toastTitle: (<div className="flex items-center"><Bell className="h-5 w-5 text-primary mr-2" /><span>Stay Updated!</span></div>),
          toastDescription: "Enable notifications for timely booking and club updates.",
          duration: 15000,
          toastAction: (
            <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
              <Button size="sm" onClick={async () => { toastInstance.dismiss(); await requestNotificationPermission(); localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());}} className="w-full sm:w-auto"><Bell className="mr-2 h-4 w-4" /> Enable</Button>
              <Button size="sm" variant="outline" onClick={() => { toastInstance.dismiss(); localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());}} className="w-full sm:w-auto">Maybe Later</Button>
            </div>
          ),
          onDismiss: () => { 
            if (!localStorage.getItem(LAST_NOTIFICATION_REMINDER_KEY) || !isSameDay(parseInt(localStorage.getItem(LAST_NOTIFICATION_REMINDER_KEY) || '0', 10), now)) {
              localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());
            }
          }
        });
      }
    }
  }, [loading, toast]);


  const signUpWithEmail = async (email: string, password: string, name: string): Promise<void> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: name });
      // onAuthStateChanged will handle the rest, including calling handleCustomApiLogin
      toast({ toastTitle: "Registration Successful!", toastDescription: "Welcome! Setting up your session..." });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: "destructive", toastTitle: "Registration Failed", toastDescription: "This email address is already in use. Please try logging in or use a different email address." });
      } else {
        console.error("Error signing up:", error);
        toast({ variant: "destructive", toastTitle: "Registration Failed", toastDescription: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
      toast({ toastTitle: "Login Attempted", toastDescription: "Processing your login..." });
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: "Invalid email or password." });
      } else {
        console.error("Error signing in:", error);
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: error.message || "An unexpected error occurred." });
      }
      setAndStoreAccessToken(null); // Clear any potentially stale tokens on direct login failure
      setAndStoreRefreshToken(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
      toast({ toastTitle: "Google Sign-In Attempted", toastDescription: "Processing..." });
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({ variant: "destructive", toastTitle: "Google Sign-In Failed", toastDescription: error.message });
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setLoading(true);
    try {
      const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
      toast({ toastTitle: "Verification Code Sent", toastDescription: "Please check your phone for the SMS code." });
      return confirmationResult;
    } catch (error: any) {
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
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
    } finally {
      setLoading(false);
    }
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<void> => {
    setLoading(true);
    try {
      await confirmationResult.confirm(code);
      // onAuthStateChanged will handle the rest
      toast({ toastTitle: "Phone Sign-In Successful!", toastDescription: "Processing session..." });
    } catch (error: any) {
      console.error("Error verifying phone code:", error);
      toast({ variant: "destructive", toastTitle: "Verification Failed", toastDescription: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateCourtlyUserRoles = (newRolesInput: UserRole[]) => {
    if (currentUser && typeof window !== 'undefined') {
      const rolesToSet = new Set<UserRole>(newRolesInput.filter(isValidUserRole));
      if (rolesToSet.size === 0 && newRolesInput.length === 0) { // If explicitly clearing to no roles, default to 'user'
         rolesToSet.add('user');
      } else if (rolesToSet.size > 0) { // If any valid roles are present, ensure 'user' is among them
         rolesToSet.add('user');
      } else { // Fallback if somehow newRolesInput was not empty but yielded no valid roles after filter
         rolesToSet.add('user');
      }
      
      const finalRoles = Array.from(rolesToSet);
      const updatedUser: CourtlyUser = { ...currentUser, roles: finalRoles };
      setCurrentUser(updatedUser);
      localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${currentUser.uid}`, JSON.stringify(finalRoles));
    }
  };


  const value = {
    currentUser,
    loading,
    accessToken,
    refreshToken,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithPhoneNumberFlow,
    confirmPhoneNumberCode,
    logoutUser: logoutUserCb,
    updateCourtlyUserRoles,
    attemptTokenRefresh,
    notifications,
    unreadCount,
    addNotification: addNotificationCb,
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


"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
import { initializeFirebaseMessaging, requestNotificationPermission } from '@/lib/firebase/messaging'; // Removed .tsx
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging';
import type { AppNotification, ApiNotification } from '@/lib/types';
import { Bell, Settings, CheckCheck, Trash2, Mailbox } from 'lucide-react';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import { Button } from '@/components/ui/button';
import { initializeAuthHelpers } from '@/lib/apiUtils';


// Define CourtlyUser interface
export interface CourtlyUser extends FirebaseUser {
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  role?: 'user' | 'owner';
}

interface AuthContextType {
  currentUser: CourtlyUser | null;
  loading: boolean;
  profileCompletionPending: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setProfileCompletionPending: (pending: boolean) => void;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<CourtlyUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<CourtlyUser | null>;
  signInWithGoogle: () => Promise<CourtlyUser | null>;
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<CourtlyUser | null>;
  logoutUser: () => Promise<void>;
  updateCourtlyUserRole: (role: 'user' | 'owner') => void;
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
const PROFILE_COMPLETION_PENDING_PREFIX = 'profileCompletionPending_';
const COURTLY_USER_ROLE_PREFIX = 'courtly_user_role_';


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
  const [profileCompletionPending, setProfileCompletionPendingState] = useState(false);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const getNotificationStorageKey = useCallback((uid: string | null | undefined) => {
    return uid ? `courtly-app-notifications-${uid}` : null;
  }, []);

  const setAndStoreAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    if (token) {
      localStorage.setItem(CUSTOM_ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
    }
  }, []);

  const setAndStoreRefreshToken = useCallback((token: string | null) => {
    setRefreshTokenState(token);
    if (token) {
      localStorage.setItem(CUSTOM_REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
    }
  }, []);
  
  const setProfileCompletionPending = useCallback((pending: boolean, uid?: string) => {
    setProfileCompletionPendingState(pending);
    if (uid) {
      if (pending) {
        localStorage.setItem(`${PROFILE_COMPLETION_PENDING_PREFIX}${uid}`, 'true');
      } else {
        localStorage.removeItem(`${PROFILE_COMPLETION_PENDING_PREFIX}${uid}`);
      }
    }
  }, []);


  const saveNotificationsToStorage = useCallback((updatedNotifications: AppNotification[], uid: string | null | undefined) => {
    const storageKey = getNotificationStorageKey(uid);
    if (storageKey) {
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
  }, [getNotificationStorageKey, saveNotificationsToStorage]);


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
      if (currentUser?.uid) {
        saveNotificationsToStorage(updated, currentUser.uid);
      }
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
        if (currentUser?.uid) {
          saveNotificationsToStorage(updated, currentUser.uid);
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
  }, [saveNotificationsToStorage, toast, currentUser]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await markNotificationsAsReadApi(unreadIds);
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        if (currentUser?.uid) {
          saveNotificationsToStorage(updated, currentUser.uid);
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
  }, [notifications, saveNotificationsToStorage, toast, currentUser]);


  const clearAllNotifications = useCallback(async () => {
    console.log("Simulating: Would call API to clear/delete all notifications for user if endpoint existed.");
    setNotifications([]);
    setUnreadCount(0);
    if (currentUser?.uid) {
      saveNotificationsToStorage([], currentUser.uid);
    }
    toast({ toastTitle: "Notifications Cleared" });
  }, [saveNotificationsToStorage, toast, currentUser]);

  const logoutUser = useCallback(async () => {
    const uidBeforeLogout = currentUser?.uid;
    try {
      await signOut(auth);
      toast({ toastTitle: "Logged Out", toastDescription: "You have been successfully logged out." });
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ variant: "destructive", toastTitle: "Logout Failed", toastDescription: error.message });
    } finally {
      if (uidBeforeLogout) {
        const notificationKey = getNotificationStorageKey(uidBeforeLogout);
        if (notificationKey) localStorage.removeItem(notificationKey);
        localStorage.removeItem(`${PROFILE_COMPLETION_PENDING_PREFIX}${uidBeforeLogout}`);
        localStorage.removeItem(`${COURTLY_USER_ROLE_PREFIX}${uidBeforeLogout}`);
      }
      setAndStoreAccessToken(null);
      setAndStoreRefreshToken(null);
      setProfileCompletionPending(false); // No UID to pass here as user is logged out
      setCurrentUser(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser, getNotificationStorageKey, toast, setAndStoreAccessToken, setAndStoreRefreshToken, setProfileCompletionPending]);


  const handleCustomApiLogin = useCallback(async (firebaseUser: FirebaseUser): Promise<CourtlyUser | null> => {
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
        await signOut(auth); // Sign out Firebase user if custom login fails
        return null;
      }

      const customTokenData = await response.json();
      setAndStoreAccessToken(customTokenData.accessToken);
      setAndStoreRefreshToken(customTokenData.refreshToken);
      
      // Construct CourtlyUser and determine profile completion status
      const storedRole = localStorage.getItem(`${COURTLY_USER_ROLE_PREFIX}${firebaseUser.uid}`) as 'user' | 'owner' | null;
      const courtlyUser: CourtlyUser = {
        ...firebaseUser,
        role: storedRole || undefined,
      };
      setCurrentUser(courtlyUser);

      const isPendingCompletionStorage = localStorage.getItem(`${PROFILE_COMPLETION_PENDING_PREFIX}${firebaseUser.uid}`) === 'true';
      const newProfileCompletionPending = isPendingCompletionStorage || !courtlyUser.role;
      setProfileCompletionPending(newProfileCompletionPending, firebaseUser.uid);

      return courtlyUser;

    } catch (error) {
      console.error("Error during custom API login:", error);
      toast({ variant: "destructive", toastTitle: "Login Error", toastDescription: "Failed to communicate with authentication server." });
      await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure:", e));
      return null;
    }
  }, [toast, setAndStoreAccessToken, setAndStoreRefreshToken, setProfileCompletionPending]);


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
          await logoutUser();
        } else {
           toast({ variant: "destructive", toastTitle: "Refresh Error", toastDescription: errorData.message });
        }
        return false;
      }

      const newTokens = await response.json();
      if (!newTokens.accessToken) {
        console.error("AUTH_CONTEXT: Token refresh successful but no new access token received.");
        await logoutUser();
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
  }, [setAndStoreAccessToken, setAndStoreRefreshToken, logoutUser, toast, refreshToken]);

  useEffect(() => {
    initializeAuthHelpers({
      getAccessToken: () => accessToken,
      attemptTokenRefresh,
      logoutUser,
    });
  }, [accessToken, attemptTokenRefresh, logoutUser]);


  useEffect(() => {
    if (currentUser?.uid) {
      fetchAndSetWeeklyNotifications(currentUser);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.uid, fetchAndSetWeeklyNotifications]);


  useEffect(() => {
    let unsubscribeFcmOnMessage: (() => void) | null = null;

    const setupFcm = async (fcmUser: CourtlyUser | null) => {
      if (fcmUser) {
        const messaging = await initializeFirebaseMessaging();
        if (messaging) {
          unsubscribeFcmOnMessage = onMessage(messaging, (payload: MessagePayload) => {
            console.log('Foreground Message received. ', payload);
            const title = payload.notification?.title || 'New Notification';
            const body = payload.notification?.body;
            addNotification(title, body, payload.data?.href, payload.messageId);
            toast({
              toastTitle: (<div className="flex items-center">
                             <Bell className="h-5 w-5 text-primary mr-2" />
                             <span>{title}</span>
                           </div>),
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

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const existingLSAccessToken = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY) : null;
        const existingLSRefreshToken = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY) : null;

        let courtlyUserForFcmSetup: CourtlyUser | null = null;

        if (existingLSAccessToken && existingLSRefreshToken) {
          setAccessTokenState(existingLSAccessToken);
          setRefreshTokenState(existingLSRefreshToken);
          // Construct CourtlyUser and determine profile completion status
          const storedRole = localStorage.getItem(`${COURTLY_USER_ROLE_PREFIX}${firebaseUser.uid}`) as 'user' | 'owner' | null;
          const courtlyUser: CourtlyUser = {
            ...firebaseUser,
            role: storedRole || undefined,
          };
          setCurrentUser(courtlyUser);
          courtlyUserForFcmSetup = courtlyUser;

          const isPendingCompletionStorage = localStorage.getItem(`${PROFILE_COMPLETION_PENDING_PREFIX}${firebaseUser.uid}`) === 'true';
          const newProfileCompletionPending = isPendingCompletionStorage || !courtlyUser.role;
          setProfileCompletionPending(newProfileCompletionPending, firebaseUser.uid);

        } else {
           console.log("Firebase user exists, but no custom tokens in localStorage. Attempting custom API login.");
           const courtlyUserAfterCustomLogin = await handleCustomApiLogin(firebaseUser);
           if (courtlyUserAfterCustomLogin) {
               courtlyUserForFcmSetup = courtlyUserAfterCustomLogin;
           } else {
                console.warn("Custom API login failed for existing Firebase user. User may need to re-authenticate fully.");
                // Fallback to basic user if custom login fails
                const storedRole = localStorage.getItem(`${COURTLY_USER_ROLE_PREFIX}${firebaseUser.uid}`) as 'user' | 'owner' | null;
                const basicUser: CourtlyUser = { ...firebaseUser, role: storedRole || undefined };
                setCurrentUser(basicUser);
                courtlyUserForFcmSetup = basicUser;
                setProfileCompletionPending(!basicUser.role, firebaseUser.uid); // Pending if no role
           }
        }
        if (courtlyUserForFcmSetup) {
            await setupFcm(courtlyUserForFcmSetup);
        }

      } else { // No Firebase user
        setAndStoreAccessToken(null);
        setAndStoreRefreshToken(null);
        setProfileCompletionPending(false);
        setCurrentUser(null);
        setNotifications([]);
        setUnreadCount(0);
        if (unsubscribeFcmOnMessage) {
          unsubscribeFcmOnMessage();
          unsubscribeFcmOnMessage = null;
        }
        await setupFcm(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFcmOnMessage) {
        unsubscribeFcmOnMessage();
      }
    };
  }, [handleCustomApiLogin, setAndStoreAccessToken, setAndStoreRefreshToken, addNotification, toast, setProfileCompletionPending]);


  useEffect(() => {
    if (loading) return;

    const authPages = ['/login', '/register'];
    const isAuthPage = authPages.includes(pathname);
    const isCompleteProfilePage = pathname === '/auth/complete-profile';
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser) {
      if (profileCompletionPending) {
        if (!isCompleteProfilePage) {
          router.push('/auth/complete-profile');
        }
      } else if (accessToken && refreshToken) {
        if (isAuthPage || isCompleteProfilePage) {
          router.push(currentUser.role === 'owner' ? '/dashboard/owner' : '/dashboard/user');
        }
      } else {
        if (isProtectedPath) {
          console.warn("User on protected path without custom tokens. Logging out.");
          logoutUser();
        }
      }
    } else {
      if (isProtectedPath || isCompleteProfilePage) {
        router.push('/login');
      }
    }
  }, [currentUser, profileCompletionPending, loading, router, pathname, accessToken, refreshToken, logoutUser]);

  useEffect(() => {
    if (loading) return;

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
        const { dismiss } = toast({
          toastTitle: (
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-primary mr-2" />
              <span>Stay Updated!</span>
            </div>
          ),
          toastDescription: "Enable notifications for timely booking and club updates.",
          duration: 15000,
          toastAction: (
            <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
              <Button
                size="sm"
                onClick={async () => {
                  dismiss();
                  await requestNotificationPermission();
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
                  localStorage.setItem(LAST_NOTIFICATION_REMINDER_KEY, now.toString());
                }}
                className="w-full sm:w-auto"
              >
                Maybe Later
              </Button>
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


  const signUpWithEmail = async (email: string, password: string, name: string): Promise<CourtlyUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: name });

      const courtlyUser = await handleCustomApiLogin(firebaseUser);
      if (!courtlyUser) {
        await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure during signup:", e));
        return null;
      }
      
      setProfileCompletionPending(true, firebaseUser.uid);

      toast({ toastTitle: "Registration Successful!", toastDescription: "Please complete your profile." });
      return courtlyUser;
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

  const signInWithEmail = async (email: string, password: string): Promise<CourtlyUser | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const courtlyUser = await handleCustomApiLogin(firebaseUser);
      if (!courtlyUser) return null;

      toast({ toastTitle: "Login Successful!", toastDescription: "Welcome back!" });
      return courtlyUser;
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: "Invalid email or password." });
      } else {
        console.error("Error signing in:", error);
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: error.message || "An unexpected error occurred." });
      }
      setAndStoreAccessToken(null);
      setAndStoreRefreshToken(null);
      return null;
    }
  };

  const signInWithGoogle = async (): Promise<CourtlyUser | null> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const courtlyUser = await handleCustomApiLogin(firebaseUser);
      if (!courtlyUser) return null;

      toast({ toastTitle: "Google Sign-In Successful!", toastDescription: "Welcome!" });
      return courtlyUser;
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

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<CourtlyUser | null> => {
    try {
      const userCredential = await confirmationResult.confirm(code);
      const firebaseUser = userCredential.user;

      const courtlyUser = await handleCustomApiLogin(firebaseUser);
      if (!courtlyUser) return null;

      setProfileCompletionPending(true, firebaseUser.uid);

      toast({ toastTitle: "Phone Sign-In Successful!", toastDescription: "Please complete your profile." });
      return courtlyUser;
    } catch (error: any) {
      console.error("Error verifying phone code:", error);
      toast({ variant: "destructive", toastTitle: "Verification Failed", toastDescription: error.message });
      return null;
    }
  };

  const updateCourtlyUserRole = (role: 'user' | 'owner') => {
    if (currentUser) {
      const updatedUser: CourtlyUser = {
        ...currentUser,
        role: role,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem(`${COURTLY_USER_ROLE_PREFIX}${currentUser.uid}`, role);
      // Profile is now complete, so remove the pending flag
      setProfileCompletionPending(false, currentUser.uid);
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
    updateCourtlyUserRole,
    attemptTokenRefresh,
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

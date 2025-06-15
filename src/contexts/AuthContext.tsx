
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser, // Renamed for clarity
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
  type UserMetadata, // Import UserMetadata
  type UserInfo,      // Import UserInfo
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { initializeFirebaseMessaging, requestNotificationPermission } from '@/lib/firebase/messaging';
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging';
import type { AppNotification, ApiNotification } from '@/lib/types';
import { Bell, Settings, CheckCheck, Trash2, Mailbox } from 'lucide-react';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import { Button } from '@/components/ui/button';
import { initializeAuthHelpers } from '@/lib/apiUtils';


// Define CourtlyUser interface
export interface CourtlyUser extends FirebaseUser { // Extends FirebaseUser (aliased User)
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  role?: 'user' | 'owner';
  customDataLoaded?: boolean;
  // Add other custom fields from your backend if needed
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

const mockFetchCustomProfile = async (uid: string): Promise<Partial<CourtlyUser>> => {
  console.log(`mockFetchCustomProfile called for UID: ${uid}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const storedRole = localStorage.getItem(`courtly_user_role_${uid}`) as 'user' | 'owner' | null;
  const profile: Partial<CourtlyUser> = {
    role: storedRole || undefined,
  };
  console.log(`mockFetchCustomProfile for UID: ${uid} returning:`, profile);
  return profile;
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CourtlyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCompletionPending, setProfileCompletionPending] = useState(false);
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
        localStorage.removeItem(`profileCompletionPending_${uidBeforeLogout}`);
        localStorage.removeItem(`courtly_user_role_${uidBeforeLogout}`);
      }
      setAndStoreAccessToken(null);
      setAndStoreRefreshToken(null);
      setProfileCompletionPending(false);
      setCurrentUser(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser, getNotificationStorageKey, toast, setAndStoreAccessToken, setAndStoreRefreshToken]);

  const loadAndMergeCustomUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<CourtlyUser> => {
    const pendingFlag = localStorage.getItem(`profileCompletionPending_${firebaseUser.uid}`) === 'true';
    let customData: Partial<CourtlyUser> = {};

    try {
      customData = await mockFetchCustomProfile(firebaseUser.uid);
    } catch (error) {
      console.error("Error fetching custom profile data:", error);
    }

    // Construct the CourtlyUser object carefully
    const mergedUser: CourtlyUser = {
      // Core FirebaseUser properties (methods are implicitly part of FirebaseUser)
      ...firebaseUser, // Spread the original firebaseUser to retain all its methods and properties

      // Explicitly set potentially overridden or custom properties
      // Ensure types match CourtlyUser which extends FirebaseUser
      displayName: customData.displayName ?? firebaseUser.displayName,
      email: customData.email ?? firebaseUser.email,
      phoneNumber: customData.phoneNumber ?? firebaseUser.phoneNumber,
      photoURL: customData.photoURL ?? firebaseUser.photoURL,

      // Custom properties
      role: customData.role || undefined,
      customDataLoaded: true,
    };

    setCurrentUser(mergedUser);
    setProfileCompletionPending(pendingFlag || !mergedUser.role);

    return mergedUser;
  }, []);


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
        await signOut(auth);
        return null;
      }

      const customTokenData = await response.json();
      setAndStoreAccessToken(customTokenData.accessToken);
      setAndStoreRefreshToken(customTokenData.refreshToken);

      const courtlyUser = await loadAndMergeCustomUserData(firebaseUser);
      return courtlyUser;

    } catch (error) {
      console.error("Error during custom API login:", error);
      toast({ variant: "destructive", toastTitle: "Login Error", toastDescription: "Failed to communicate with authentication server." });
      await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure:", e));
      return null;
    }
  }, [toast, setAndStoreAccessToken, setAndStoreRefreshToken, loadAndMergeCustomUserData]);

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = refreshToken || localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
    if (!currentRefreshToken) {
      console.log("AUTH_CONTEXT: No refresh token available for refresh attempt.");
      return false;
    }

    console.log("AUTH_CONTEXT: Attempting to refresh token...");
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
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
      setAndStoreAccessToken(newTokens.accessToken);
      if (newTokens.refreshToken) {
        setAndStoreRefreshToken(newTokens.refreshToken);
      }
      if (!newTokens.accessToken) {
        console.error("AUTH_CONTEXT: Token refresh successful but no new access token received.");
        await logoutUser();
        return false;
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
        const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!VAPID_KEY) {
        }
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
        const existingLSAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
        const existingLSRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);

        if (existingLSAccessToken && existingLSRefreshToken) {
          setAccessTokenState(existingLSAccessToken); // Set state from LS
          setRefreshTokenState(existingLSRefreshToken); // Set state from LS
          const courtlyUser = await loadAndMergeCustomUserData(firebaseUser);
          // setCurrentUser is called within loadAndMergeCustomUserData
          await setupFcm(courtlyUser);
        } else {
           console.log("Firebase user exists, but no custom tokens in localStorage. Attempting custom API login.");
           const courtlyUserAfterCustomLogin = await handleCustomApiLogin(firebaseUser);
           if (courtlyUserAfterCustomLogin) {
                await setupFcm(courtlyUserAfterCustomLogin);
           } else {
                console.warn("Custom API login failed for existing Firebase user. User may need to re-authenticate fully.");
                const defaultLoadedUser = await loadAndMergeCustomUserData(firebaseUser); // Load with defaults
                await setupFcm(defaultLoadedUser);
           }
        }
      } else {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNotification, toast, loadAndMergeCustomUserData, setAndStoreAccessToken, setAndStoreRefreshToken, handleCustomApiLogin]);


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
      } else if (accessToken && refreshToken) { // Check for custom tokens
        if (isAuthPage || isCompleteProfilePage) {
          router.push(currentUser.role === 'owner' ? '/dashboard/owner' : '/dashboard/user');
        }
      } else { // Firebase user exists, but no custom tokens (or profile complete but tokens missing)
        if (isProtectedPath) {
          console.warn("User on protected path without custom tokens. Logging out.");
          logoutUser();
        }
        // If on non-protected path but tokens are missing, they can stay but API calls will fail/refresh
      }
    } else { // No Firebase user
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

      localStorage.setItem(`profileCompletionPending_${firebaseUser.uid}`, 'true');
      setProfileCompletionPending(true);

      // Update currentUser state with the newly signed-up user's details
      // loadAndMergeCustomUserData will be called eventually by onAuthStateChanged or handleCustomApiLogin,
      // but we can optimistically update some parts here.
      // The user returned from handleCustomApiLogin is already the merged CourtlyUser.
      // setCurrentUser is called within loadAndMergeCustomUserData which is called by handleCustomApiLogin

      toast({ toastTitle: "Registration Successful!", toastDescription: "Please complete your profile." });
      return courtlyUser; // Return the CourtlyUser from the custom login flow
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
      if (!courtlyUser) return null; // Custom login failed, already handled inside

      toast({ toastTitle: "Login Successful!", toastDescription: "Welcome back!" });
      return courtlyUser;
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: "Invalid email or password." });
      } else {
        console.error("Error signing in:", error);
        toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: error.message || "An unexpected error occurred." });
      }
      setAndStoreAccessToken(null); // Ensure custom tokens are cleared on Firebase-level login failure too
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

      localStorage.setItem(`profileCompletionPending_${firebaseUser.uid}`, 'true');
      setProfileCompletionPending(true);

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
      // Create a new object for the state update
      const updatedUser: CourtlyUser = {
        ...currentUser, // Spread existing properties
        role: role,     // Update role
        customDataLoaded: true, // Assuming role update means custom data is now more complete
      };
      setCurrentUser(updatedUser);
      localStorage.setItem(`courtly_user_role_${currentUser.uid}`, role);
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


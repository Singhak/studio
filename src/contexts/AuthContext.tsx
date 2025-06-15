
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
  type ConfirmationResult,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { initializeFirebaseMessaging, requestNotificationPermission } from '@/lib/firebase/messaging.tsx';
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging';
import type { AppNotification, ApiNotification, AppUser as CourtlyUser } from '@/lib/types'; // Renamed AppUser to CourtlyUser
import { Bell, Settings, CheckCheck, Trash2, Mailbox } from 'lucide-react';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import { Button } from '@/components/ui/button';
import { getApiAuthHeaders, getApiBaseUrl } from '@/lib/apiUtils';


interface AuthContextType {
  currentUser: CourtlyUser | null; // Changed from User | null
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
  attemptTokenRefresh: () => Promise<boolean>; // New method
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

// Mock function to simulate fetching custom user profile from backend
const mockFetchCustomProfile = async (uid: string): Promise<Partial<CourtlyUser>> => {
  console.log(`mockFetchCustomProfile called for UID: ${uid}`);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  const storedRole = localStorage.getItem(`courtly_user_role_${uid}`) as 'user' | 'owner' | null;
  const profile: Partial<CourtlyUser> = {
    role: storedRole || 'user', // Default to 'user' if no role is stored
    // Simulate other custom fields if needed
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

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
    if (storedAccessToken) setAccessTokenState(storedAccessToken);
    if (storedRefreshToken) setRefreshTokenState(storedRefreshToken);
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

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAndSetWeeklyNotifications(currentUser);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.uid, fetchAndSetWeeklyNotifications]);


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
      const updated = [newAppNotification, ...prev.slice(0, 19)]; // Keep max 20 notifications
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


  const loadAndMergeCustomUserData = useCallback(async (firebaseUser: User): Promise<CourtlyUser> => {
    const pendingFlag = localStorage.getItem(`profileCompletionPending_${firebaseUser.uid}`) === 'true';
    let customData: Partial<CourtlyUser> = {};
    let mergedUser: CourtlyUser;

    try {
      customData = await mockFetchCustomProfile(firebaseUser.uid);
    } catch (error) {
      console.error("Error fetching custom profile data:", error);
      // Proceed with Firebase data only
    }
    
    mergedUser = {
      ...firebaseUser, // Spread all properties from Firebase User
      ...customData,   // Spread custom data, potentially overriding some from Firebase User if names clash
      role: customData.role || 'user', // Ensure role has a default
      customDataLoaded: true,
      // Ensure standard Firebase User properties are correctly typed if overridden by customData
      // This explicit mapping helps maintain type integrity for Firebase User properties.
      displayName: customData.displayName ?? firebaseUser.displayName,
      email: customData.email ?? firebaseUser.email,
      emailVerified: customData.emailVerified ?? firebaseUser.emailVerified,
      isAnonymous: customData.isAnonymous ?? firebaseUser.isAnonymous,
      metadata: customData.metadata ?? firebaseUser.metadata,
      phoneNumber: customData.phoneNumber ?? firebaseUser.phoneNumber,
      photoURL: customData.photoURL ?? firebaseUser.photoURL,
      providerData: customData.providerData ?? firebaseUser.providerData,
      providerId: customData.providerId ?? firebaseUser.providerId,
      tenantId: customData.tenantId ?? firebaseUser.tenantId,
      uid: firebaseUser.uid, // uid must come from firebaseUser
      // Add any other specific Firebase User properties that might be in customData
    };

    setCurrentUser(mergedUser);
    setProfileCompletionPending(pendingFlag || !customData.role); // Pending if flag set OR role not fetched
    
    return mergedUser;
  }, []);


  const handleCustomApiLogin = useCallback(async (firebaseUser: User): Promise<CourtlyUser | null> => {
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
        await signOut(auth); // Sign out from Firebase
        return null;
      }

      const customTokenData = await response.json();
      setAndStoreAccessToken(customTokenData.accessToken);
      setAndStoreRefreshToken(customTokenData.refreshToken);
      
      // Load custom data and merge
      const courtlyUser = await loadAndMergeCustomUserData(firebaseUser);
      return courtlyUser;

    } catch (error) {
      console.error("Error during custom API login:", error);
      toast({ variant: "destructive", toastTitle: "Login Error", toastDescription: "Failed to communicate with authentication server." });
      await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure:", e));
      return null;
    }
  }, [toast, setAndStoreAccessToken, setAndStoreRefreshToken, loadAndMergeCustomUserData]);

  const logoutUser = useCallback(async () => {
    const uidBeforeLogout = currentUser?.uid;
    try {
      await signOut(auth); // Firebase sign out
      toast({ toastTitle: "Logged Out", toastDescription: "You have been successfully logged out." });
      // router.push('/'); // Redirection will be handled by useEffect based on currentUser
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ variant: "destructive", toastTitle: "Logout Failed", toastDescription: error.message });
    } finally {
      if (uidBeforeLogout) {
        const notificationKey = getNotificationStorageKey(uidBeforeLogout);
        if (notificationKey) localStorage.removeItem(notificationKey);
        localStorage.removeItem(`profileCompletionPending_${uidBeforeLogout}`);
        localStorage.removeItem(`courtly_user_role_${uidBeforeLogout}`); // Clear stored role
      }
      setAndStoreAccessToken(null);
      setAndStoreRefreshToken(null);
      setProfileCompletionPending(false);
      setCurrentUser(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser, getNotificationStorageKey, toast, setAndStoreAccessToken, setAndStoreRefreshToken]);


  useEffect(() => {
    let unsubscribeFcmOnMessage: (() => void) | null = null;

    const setupFcm = async (fcmUser: CourtlyUser | null) => { // Takes CourtlyUser
      if (fcmUser) {
        const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!VAPID_KEY) {
          // Warning logged in messaging.tsx
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
      setLoading(true); // Start loading when auth state changes
      if (firebaseUser) {
        // Check if already logged in via custom API (e.g. page refresh)
        const existingAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
        const existingRefreshToken = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);

        if (existingAccessToken && existingRefreshToken) {
          setAccessTokenState(existingAccessToken);
          setRefreshTokenState(existingRefreshToken);
          const courtlyUser = await loadAndMergeCustomUserData(firebaseUser);
          setCurrentUser(courtlyUser);
          await setupFcm(courtlyUser);
        } else {
          // This case implies Firebase user exists, but no custom tokens.
          // This could happen if handleCustomApiLogin failed previously or tokens were cleared.
          // For now, we treat this as needing a full login or refresh.
          // Depending on app logic, you might attempt handleCustomApiLogin here if an ID token is available.
          // Or, if this state is unexpected, log out fully.
          console.warn("Firebase user exists but no custom tokens found. User might need to re-authenticate with custom backend.");
          // To prevent being stuck, we'll treat as logged out from custom system.
          // loadAndMerge will run with default custom data.
          const courtlyUserWithDefaults = await loadAndMergeCustomUserData(firebaseUser);
          setCurrentUser(courtlyUserWithDefaults); // Sets user with default role, customDataLoaded: true
          setAndStoreAccessToken(null); // Ensure custom tokens are cleared
          setAndStoreRefreshToken(null);
           await setupFcm(courtlyUserWithDefaults);
        }
      } else {
        // No Firebase user
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
      setLoading(false); // Finish loading
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFcmOnMessage) {
        unsubscribeFcmOnMessage();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNotification, toast, loadAndMergeCustomUserData, setAndStoreAccessToken, setAndStoreRefreshToken]);


  useEffect(() => {
    if (loading) return;

    const authPages = ['/login', '/register']; // '/auth/complete-profile' handled separately
    const isAuthPage = authPages.includes(pathname);
    const isCompleteProfilePage = pathname === '/auth/complete-profile';
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser) { // currentUser is now CourtlyUser
      if (profileCompletionPending) {
        if (!isCompleteProfilePage) {
          router.push('/auth/complete-profile');
        }
      } else if (accessToken && refreshToken) { // Custom tokens exist
        if (isAuthPage || isCompleteProfilePage) {
          router.push('/dashboard/user'); 
        }
      } else { 
        // Firebase user exists, profile not pending, but NO custom tokens
        // This means custom auth is not established.
        if (isProtectedPath) {
          console.warn("User on protected path without custom tokens. Logging out from custom session.");
          logoutUser(); // This will clear Firebase session too if desired by full logout
        }
        // If on a public page, they can stay, but won't have access to protected features.
      }
    } else { // No currentUser (neither Firebase nor custom)
      if (isProtectedPath || isCompleteProfilePage) {
        router.push('/login');
      }
    }
  }, [currentUser, profileCompletionPending, loading, router, pathname, accessToken, refreshToken, logoutUser]);

  useEffect(() => {
    if (loading) {
      return;
    }
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: toastId, dismiss } = toast({
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

      // Now, attempt custom API login
      const courtlyUser = await handleCustomApiLogin(firebaseUser);
      if (!courtlyUser) {
        // Custom login failed, Firebase user might still exist but we should clean up
        await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure during signup:", e));
        return null;
      }
      
      localStorage.setItem(`profileCompletionPending_${firebaseUser.uid}`, 'true');
      setProfileCompletionPending(true); // Ensure this is set for new sign-ups
      
      // Update current user state with the name if it was set
      setCurrentUser(prev => prev ? ({...prev, displayName: name, customDataLoaded: true }) : null);


      toast({ toastTitle: "Registration Successful!", toastDescription: "Please complete your profile." });
      return courtlyUser; // Return the user from custom login, which includes merged data
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
      if (!courtlyUser) return null; // Custom login failed

      // loadAndMergeCustomUserData is called within handleCustomApiLogin
      // setProfileCompletionPending is handled by loadAndMergeCustomUserData
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

      // loadAndMergeCustomUserData handles profile completion pending status
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
      
      // loadAndMergeCustomUserData handles profile completion pending status
      // But for phone auth, it's new, so explicitly set it.
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
      const updatedUser = { ...currentUser, role, customDataLoaded: true };
      setCurrentUser(updatedUser);
      // Persist this change for mockFetchCustomProfile
      localStorage.setItem(`courtly_user_role_${currentUser.uid}`, role);
    }
  };

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) {
      console.log("AUTH_CONTEXT: No refresh token available to attempt refresh.");
      await logoutUser(); // No refresh token means session is truly over for custom API
      return false;
    }

    console.log("AUTH_CONTEXT: Attempting to refresh token...");
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Token refresh failed with status " + response.status }));
        console.error("AUTH_CONTEXT: Token refresh failed.", errorData.message);
        if (response.status === 401 || response.status === 403) { // Invalid/expired refresh token
          toast({ variant: "destructive", toastTitle: "Session Expired", toastDescription: "Please log in again."});
          await logoutUser();
        } else {
           toast({ variant: "destructive", toastTitle: "Refresh Error", toastDescription: errorData.message });
        }
        return false;
      }

      const newTokens = await response.json();
      setAndStoreAccessToken(newTokens.accessToken);
      if (newTokens.refreshToken) { // Backend might issue a new refresh token
        setAndStoreRefreshToken(newTokens.refreshToken);
      }
      console.log("AUTH_CONTEXT: Tokens refreshed successfully.");
      toast({ toastTitle: "Session Refreshed", toastDescription: "Your session has been extended."});
      return true;
    } catch (error) {
      console.error("AUTH_CONTEXT: Error during token refresh:", error);
      toast({ variant: "destructive", toastTitle: "Network Error", toastDescription: "Could not refresh session. Please check connection." });
      // Don't logout on network error, user might just be offline temporarily
      return false;
    }
  }, [refreshToken, setAndStoreAccessToken, setAndStoreRefreshToken, logoutUser, toast]);


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
    attemptTokenRefresh, // Expose the new method
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

// Global type augmentation for window.recaptchaVerifier - already in global.d.ts
// Removed from here to avoid duplication as it's better placed in a .d.ts file.
// if (typeof window !== 'undefined') {
//   (window as any).recaptchaVerifier = (window as any).recaptchaVerifier || undefined;
// }

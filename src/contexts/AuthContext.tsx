
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser, // Renamed to avoid conflict
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
import { getMessaging, onMessage, type MessagePayload } from 'firebase/messaging'; // onMessage is fine here
import type { AppNotification, ApiNotification } from '@/lib/types';
import { Bell, Settings } from 'lucide-react';
import { markNotificationsAsReadApi, getWeeklyNotificationsApi } from '@/services/notificationService';
import { Button } from '@/components/ui/button';

// Define the extended CourtlyUser type
export interface CourtlyUser extends FirebaseUser {
  role?: 'user' | 'owner';
  customDataLoaded: boolean; // Flag to indicate if custom backend data has been loaded
  // Add other custom fields here as needed, e.g., preferences, subscriptionStatus
}

interface AuthContextType {
  currentUser: CourtlyUser | null; // Updated type
  loading: boolean;
  profileCompletionPending: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setProfileCompletionPending: (pending: boolean) => void;
  updateCourtlyUserRole: (role: 'user' | 'owner') => void; // New function
  signUpWithEmail: (email: string, password: string) => Promise<CourtlyUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<CourtlyUser | null>;
  signInWithGoogle: () => Promise<CourtlyUser | null>;
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<CourtlyUser | null>;
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

// Mock function to simulate fetching extended user profile from backend
const mockFetchCustomProfile = async (uid: string, token: string): Promise<{ role?: 'user' | 'owner', isProfileComplete?: boolean }> => {
  console.log(`Simulating fetch for custom profile for UID: ${uid} with token (first 10 chars): ${token.substring(0,10)}...`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // In a real app, this would be an API call:
  // const response = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
  // if (!response.ok) throw new Error('Failed to fetch custom profile');
  // const data = await response.json();
  // return { role: data.role, isProfileComplete: data.isProfileComplete };

  // For simulation, let's try to get role from localStorage if set by complete-profile,
  // or return a default/undefined role if not found.
  const storedRole = localStorage.getItem(`courtly_user_role_${uid}`) as 'user' | 'owner' | null;
  if (storedRole) {
    return { role: storedRole, isProfileComplete: true };
  }
  // Simulate a new user or user whose role isn't set in backend yet
  return { role: undefined, isProfileComplete: false };
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CourtlyUser | null>(null); // Updated type
  const [loading, setLoading] = useState(true);
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
            console.error(`Failed to parse stored notifications (key: ${storageKey}). Data was: "${stored.substring(0,100)}..."`, parseError);
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

  const loadAndMergeCustomUserData = useCallback(async (firebaseUser: FirebaseUser, token: string) => {
    try {
      const customProfile = await mockFetchCustomProfile(firebaseUser.uid, token);
      setCurrentUser(prev => ({
        ...(prev || firebaseUser), // Spread previous state or firebaseUser if prev is null
        ...firebaseUser, // Ensure Firebase props are up-to-date
        role: customProfile.role || prev?.role, // Use fetched role, fallback to existing if any
        customDataLoaded: true,
      }));
      // If the fetched profile indicates completion (e.g., role is present), update profileCompletionPending
      if (customProfile.isProfileComplete) {
        setProfileCompletionPending(false);
        localStorage.removeItem(`profileCompletionPending_${firebaseUser.uid}`);
      }
    } catch (error) {
      console.error("Failed to load and merge custom user data:", error);
      // Keep existing currentUser (which is at least the FirebaseUser part)
      // but mark customDataLoaded as true to prevent repeated fetches on error, or handle error state
      setCurrentUser(prev => ({
        ...(prev || firebaseUser),
        ...firebaseUser,
        customDataLoaded: true, // Or handle error state specifically
      }));
      toast({ variant: "destructive", toastTitle: "Profile Load Error", toastDescription: "Could not load your complete profile." });
    }
  }, [toast]);


  const handleCustomApiLogin = async (firebaseUser: FirebaseUser): Promise<boolean> => {
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
      const newAccessToken = customTokenData.accessToken;
      const newRefreshToken = customTokenData.refreshToken;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem(CUSTOM_ACCESS_TOKEN_KEY, newAccessToken);
      localStorage.setItem(CUSTOM_REFRESH_TOKEN_KEY, newRefreshToken);

      // Now load custom user data with the new access token
      await loadAndMergeCustomUserData(firebaseUser, newAccessToken);
      return true;
    } catch (error) {
      console.error("Error during custom API login:", error);
      toast({ variant: "destructive", toastTitle: "Login Error", toastDescription: "Failed to communicate with authentication server." });
      await signOut(auth).catch(e => console.error("Error signing out Firebase user after custom login failure:", e));
      return false;
    }
  };
  
  const updateCourtlyUserRole = useCallback((role: 'user' | 'owner') => {
    setCurrentUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, role, customDataLoaded: true };
      // Persist role change for mockFetch to pick up on next load (simulation)
      localStorage.setItem(`courtly_user_role_${prevUser.uid}`, role);
      return updatedUser;
    });
  }, []);

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
          localStorage.removeItem(`courtly_user_role_${uidBeforeLogout}`); // Clear simulated role
      }
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
      localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
      setProfileCompletionPending(false);
      setCurrentUser(null); 
      setNotifications([]); 
      setUnreadCount(0);
      router.push('/'); // Ensure redirection to home after logout.
    }
  }, [currentUser, getNotificationStorageKey, toast, router]);


  useEffect(() => {
    let unsubscribeFcmOnMessage: (() => void) | null = null;

    const setupFcm = async (fcmUser: FirebaseUser | null) => { 
      if (fcmUser) { 
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

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Initial set with Firebase data, customDataLoaded: false
        setCurrentUser({ ...firebaseUser, customDataLoaded: false, role: undefined });
        
        const storedAccessToken = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
        if (storedAccessToken) {
          setAccessToken(storedAccessToken); // ensure token state is updated
          await loadAndMergeCustomUserData(firebaseUser, storedAccessToken);
        } else {
          // No access token, implies fresh login sequence will handle full profile or new user.
          // If profileCompletionPending was stored, honor it.
          if (localStorage.getItem(`profileCompletionPending_${firebaseUser.uid}`) === 'true') {
            setProfileCompletionPending(true);
            localStorage.removeItem(`profileCompletionPending_${firebaseUser.uid}`);
          }
        }
      } else { 
        setCurrentUser(null);
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
      await setupFcm(firebaseUser); 
      setLoading(false); 
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFcmOnMessage) { 
        unsubscribeFcmOnMessage();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNotification, toast, loadAndMergeCustomUserData]);


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
      } else if (currentUser.customDataLoaded) { // Check if custom data (incl. role) is loaded
        if (isAuthPage) {
            // If role is owner, default to owner dashboard, else user dashboard
            router.push(currentUser.role === 'owner' ? '/dashboard/owner' : '/dashboard/user');
        }
      } else if (!currentUser.customDataLoaded && accessToken) {
        // Custom data is still loading, remain on page unless it's an auth page
        if (isAuthPage) {
            // Potentially show a loading indicator or wait, but for now, redirect to avoid being stuck on auth page
            console.log("Custom data not yet loaded, but access token exists. Redirecting from auth page.");
            router.push('/dashboard/user'); 
        }
      }
    } else { 
      if (isProtectedPath) {
        router.push('/login');
      }
    }
  }, [currentUser, profileCompletionPending, loading, router, pathname, accessToken]);

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
        const {id: toastId, dismiss} = toast({
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


  const signUpWithEmail = async (email: string, password: string): Promise<CourtlyUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) return null;

      localStorage.setItem(`profileCompletionPending_${firebaseUser.uid}`, 'true');
      setProfileCompletionPending(true); 
      toast({ toastTitle: "Registration Successful!", toastDescription: "Please complete your profile." });
      // currentUser will be set by onAuthStateChanged and loadAndMergeCustomUserData
      return currentUser; // Return the state variable which should be updated
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

      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) {
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
        localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
        return null;
      }
        
      // profileCompletionPending will be set by loadAndMergeCustomUserData
      toast({ toastTitle: "Login Successful!", toastDescription: "Welcome back!" });
      return currentUser; // Return the state variable
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

  const signInWithGoogle = async (): Promise<CourtlyUser | null> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) return null;

      // profileCompletionPending will be set by loadAndMergeCustomUserData
      // The toast message can be adjusted based on whether profile is complete after loadAndMerge
      if (profileCompletionPending) { // Check local state which might be updated by loadAndMerge
         toast({ toastTitle: "Google Sign-In Successful!", toastDescription: "Welcome! Please complete your profile." });
      } else {
         toast({ toastTitle: "Google Sign-In Successful!", toastDescription: "Welcome back!" });
      }
      return currentUser; // Return the state variable
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

      const customLoginSuccess = await handleCustomApiLogin(firebaseUser);
      if (!customLoginSuccess) return null;
      
      localStorage.setItem(`profileCompletionPending_${firebaseUser.uid}`, 'true');
      setProfileCompletionPending(true); 
      toast({ toastTitle: "Phone Sign-In Successful!", toastDescription: "Please complete your profile." });
      return currentUser; // Return the state variable
    } catch (error: any) {
      console.error("Error verifying phone code:", error);
      toast({ variant: "destructive", toastTitle: "Verification Failed", toastDescription: error.message });
      return null;
    }
  };


  const value: AuthContextType = {
    currentUser,
    loading, 
    profileCompletionPending,
    accessToken,
    refreshToken,
    setProfileCompletionPending,
    updateCourtlyUserRole,
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


"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User as FirebaseUser, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast, type ToastFn } from "@/hooks/use-toast";
import { initializeAuthHelpers } from '@/lib/apiUtils';
import { Button } from '@/components/ui/button'; // For notification reminder action

// Import helpers
import { CUSTOM_ACCESS_TOKEN_KEY, CUSTOM_REFRESH_TOKEN_KEY, COURTLY_USER_ROLES_PREFIX } from './authHelpers/constants';
import { getStoredRoles, updateCurrentUserRoles as updateRolesHelper } from './authHelpers/roleManager';
import {
  signUpWithEmailFirebase,
  signInWithEmailFirebase,
  signInWithGoogleFirebase,
  signInWithPhoneNumberFirebase,
  confirmPhoneNumberCodeFirebase,
  logoutFirebase
} from './authHelpers/firebaseAuthActions';
import {
  handleCustomApiLogin,
  attemptTokenRefresh as attemptTokenRefreshApi,
  clearCustomTokens,
  loadTokensFromStorage,
} from './authHelpers/tokenManager';
import {
  fetchAndSetWeeklyAppNotifications,
  addAppNotification as addNotificationManager,
  markAppNotificationAsRead as markNotificationReadManager,
  markAllAppNotificationsAsRead as markAllNotificationsReadManager,
  clearAllAppNotifications as clearAllNotificationsManager,
  setupFcmMessaging,
  showNotificationPermissionReminder,
} from './authHelpers/notificationManager';

export type UserRole = 'user' | 'owner' | 'admin' | 'editor';

export interface CourtlyUser extends FirebaseUser { // Keep FirebaseUser properties directly for simplicity
  roles: UserRole[];
}
// For functions passed to helpers that need CourtlyUser
export type SetupFcmFn = (user: CourtlyUser | null) => Promise<(() => void) | null>;


// Notification types (can be moved to a shared types file if used elsewhere extensively)
export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
  href?: string;
}

export interface ApiNotificationData {
  bookingId?: string;
  type?: string;
  href?: string;
  [key: string]: any;
}

export interface ApiNotification {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  data?: ApiNotificationData;
  __v?: number;
}


interface AuthContextType {
  currentUser: CourtlyUser | null;
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  updateCourtlyUserRoles: (roles: UserRole[]) => void;
  attemptTokenRefresh: () => Promise<boolean>;
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (title: string, body?: string, href?: string, id?: string) => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const processingUidRef = React.useRef<string | null>(null); // To prevent re-entrant onAuthStateChanged processing

  const setAndStoreAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem(CUSTOM_ACCESS_TOKEN_KEY, token);
      else localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
    }
  }, []);

  const setAndStoreRefreshToken = useCallback((token: string | null) => {
    setRefreshTokenState(token);
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem(CUSTOM_REFRESH_TOKEN_KEY, token);
      else localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
    }
  }, []);

  const addNotificationCb = useCallback((title: string, body?: string, href?: string, id?: string) => {
    addNotificationManager(title, body, href, id, notifications, currentUser?.uid, setNotifications, setUnreadCount);
  }, [notifications, currentUser?.uid]);

  const setupFcm = useCallback(async (user: CourtlyUser | null): Promise<(() => void) | null> => {
      if (unsubscribeFcmOnMessageRef.current) {
          unsubscribeFcmOnMessageRef.current();
          unsubscribeFcmOnMessageRef.current = null;
      }
      if (user) {
          const unsubscribe = await setupFcmMessaging(user, toast, addNotificationCb);
          unsubscribeFcmOnMessageRef.current = unsubscribe;
          return unsubscribe;
      }
      return null;
  }, [toast, addNotificationCb]); // Ensure dependencies are stable


  const fullLogoutSequence = useCallback(async () => {
    const uidBeforeLogout = auth.currentUser?.uid; // Capture before Firebase logout
    await logoutFirebase(auth, toast); // Firebase sign out
    
    // Clear local custom tokens
    clearCustomTokens();
    setAccessTokenState(null);
    setRefreshTokenState(null);
    
    // Clear user state in context
    setCurrentUser(null);
    
    // Clear notifications and related local storage for the logged-out user
    setNotifications([]);
    setUnreadCount(0);
    if (uidBeforeLogout && typeof window !== 'undefined') {
        localStorage.removeItem(`${NOTIFICATION_STORAGE_PREFIX}${uidBeforeLogout}`);
        localStorage.removeItem(`${COURTLY_USER_ROLES_PREFIX}${uidBeforeLogout}`);
    }
    
    // Clean up FCM listeners
    if (unsubscribeFcmOnMessageRef.current) {
        unsubscribeFcmOnMessageRef.current();
        unsubscribeFcmOnMessageRef.current = null;
    }
    await setupFcm(null); // Ensure FCM is reset for logged-out state
    
    processingUidRef.current = null; // Reset processing flag
    router.push('/login'); // Redirect to login
  }, [toast, setAccessTokenState, setRefreshTokenState, setupFcm, router]);


  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    return attemptTokenRefreshApi({
        currentRefreshToken: refreshToken,
        toast,
        setAndStoreAccessToken,
        setAndStoreRefreshToken,
        performLogout: fullLogoutSequence,
    });
  }, [refreshToken, toast, setAndStoreAccessToken, setAndStoreRefreshToken, fullLogoutSequence]);


  // Effect for onAuthStateChanged and initial loading
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      const currentProcessingUid = processingUidRef.current;

      if (firebaseUser && currentProcessingUid === firebaseUser.uid) {
        console.log(`AUTH_CONTEXT: Already processing auth event for UID: ${firebaseUser.uid}. Skipping.`);
        setLoading(false);
        return;
      }
      
      processingUidRef.current = firebaseUser ? firebaseUser.uid : null;

      try {
        if (firebaseUser) {
          console.log(`AUTH_CONTEXT: Firebase user ${firebaseUser.uid} detected.`);
          const storedTokens = loadTokensFromStorage();

          if (storedTokens.accessToken && storedTokens.refreshToken) {
            console.log("AUTH_CONTEXT: Found custom tokens in localStorage. Hydrating session.");
            setAndStoreAccessToken(storedTokens.accessToken);
            setAndStoreRefreshToken(storedTokens.refreshToken);
            
            const userRoles = getStoredRoles(firebaseUser.uid);
            let finalRoles = userRoles.length > 0 ? userRoles : (['user'] as UserRole[]);
             if (userRoles.length === 0 && typeof window !== 'undefined') {
                localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${firebaseUser.uid}`, JSON.stringify(finalRoles));
            }
            if (finalRoles.length > 0 && !finalRoles.includes('user')) {
                finalRoles = ['user', ...finalRoles];
            } else if (finalRoles.length === 0) {
                finalRoles = ['user'];
            }


            const courtlyUserInstance: CourtlyUser = {
              ...(firebaseUser as any), // Spread to ensure all FirebaseUser props/methods are available
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              phoneNumber: firebaseUser.phoneNumber,
              photoURL: firebaseUser.photoURL,
              uid: firebaseUser.uid,
              roles: finalRoles,
            };
            setCurrentUser(courtlyUserInstance);
            await setupFcm(courtlyUserInstance);
          } else {
            console.log("AUTH_CONTEXT: No custom tokens in localStorage. Attempting custom API login.");
            const loggedInUser = await handleCustomApiLogin({
              firebaseUser,
              auth,
              toast,
              setupFcm,
              setAndStoreAccessToken,
              setAndStoreRefreshToken,
            });
            setCurrentUser(loggedInUser); // This will be CourtlyUser or null
            if (!loggedInUser) { // If custom login failed
                await logoutFirebase(auth, toast); // Sign out from Firebase
                clearCustomTokens();
                // onAuthStateChanged will fire again with null user, handled by the 'else' block
            }
          }
        } else {
          console.log("AUTH_CONTEXT: No Firebase user. Clearing session.");
          clearCustomTokens();
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
        // Potentially clear session here too if a critical error occurs
        clearCustomTokens();
        setAndStoreAccessToken(null);
        setAndStoreRefreshToken(null);
        setCurrentUser(null);
      } finally {
        if (processingUidRef.current === (firebaseUser ? firebaseUser.uid : null)) {
             processingUidRef.current = null; // Clear processing UID for this specific event
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
  }, [toast, setupFcm, setAndStoreAccessToken, setAndStoreRefreshToken]); // Dependencies carefully chosen

  // Effect for routing based on auth state
  useEffect(() => {
    if (loading) return;
    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser && accessToken && refreshToken) { // User is fully authenticated (Firebase + Custom Tokens)
      if (isAuthPage) {
        if (currentUser.roles.includes('owner')) {
          router.push('/dashboard/owner');
        } else {
          router.push('/dashboard/user');
        }
      }
    } else if (!currentUser && isProtectedPath) { // No user, but on protected path
        router.push('/login');
    } else if (currentUser && (!accessToken || !refreshToken) && isProtectedPath) { // Firebase user but no custom tokens
        console.warn("AUTH_CONTEXT: Firebase user exists but custom tokens are missing on a protected path. Logging out.");
        fullLogoutSequence(); // This will eventually redirect to /login
    }
  }, [currentUser, loading, router, pathname, accessToken, refreshToken, fullLogoutSequence]);

  // Effect for initializing apiUtils
  useEffect(() => {
    initializeAuthHelpers({
      getAccessToken: () => accessToken,
      attemptTokenRefresh,
      logoutUser: fullLogoutSequence,
    });
  }, [accessToken, attemptTokenRefresh, fullLogoutSequence]);

  // Effect for fetching notifications for the current user
  useEffect(() => {
    if (currentUser?.uid) {
      fetchAndSetWeeklyAppNotifications(currentUser, setNotifications, setUnreadCount);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.uid]); // Runs when currentUser.uid changes

  // Effect for showing notification permission reminder
  useEffect(() => {
    if (loading) return;
    showNotificationPermissionReminder(toast, Button);
  }, [loading, toast]);


  // Exposed context methods
  const signUpWithEmail = async (email: string, password: string, name: string): Promise<void> => {
    setLoading(true);
    await signUpWithEmailFirebase(auth, email, password, name, toast);
    // onAuthStateChanged will handle the rest of the login flow
    setLoading(false);
  };

  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    await signInWithEmailFirebase(auth, email, password, toast);
    // onAuthStateChanged will handle the rest
    setLoading(false);
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    await signInWithGoogleFirebase(auth, toast);
    // onAuthStateChanged will handle the rest
    setLoading(false);
  };

  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setLoading(true);
    const result = await signInWithPhoneNumberFirebase(auth, phoneNumber, appVerifier, toast);
    setLoading(false);
    return result;
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<void> => {
    setLoading(true);
    await confirmPhoneNumberCodeFirebase(confirmationResult, code, toast);
    // onAuthStateChanged will handle the rest
    setLoading(false);
  };

  const updateCourtlyUserRoles = (roles: UserRole[]) => {
    const updatedUser = updateRolesHelper(currentUser, roles, setCurrentUser);
    // If roles changed and redirection is needed based on new primary role
    if (updatedUser && currentUser) {
        const oldPrimaryRole = currentUser.roles.includes('owner') ? 'owner' : 'user';
        const newPrimaryRole = updatedUser.roles.includes('owner') ? 'owner' : 'user';
        if (oldPrimaryRole !== newPrimaryRole) {
            router.push(newPrimaryRole === 'owner' ? '/dashboard/owner' : '/dashboard/user');
        }
    }
  };
  
  const markNotificationAsRead = async (notificationId: string) => {
    await markNotificationReadManager(notificationId, notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  };
  const markAllNotificationsAsRead = async () => {
    await markAllNotificationsReadManager(notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  };
  const clearAllNotifications = async () => {
    await clearAllNotificationsManager(currentUser?.uid, toast, setNotifications, setUnreadCount);
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
    logoutUser: fullLogoutSequence, // Use the comprehensive logout sequence
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

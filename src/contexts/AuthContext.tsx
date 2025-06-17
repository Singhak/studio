
// src/contexts/AuthContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as FirebaseUser, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast, type ToastFn } from "@/hooks/use-toast";
import { initializeAuthHelpers } from '@/lib/apiUtils';
import { Button } from '@/components/ui/button';
import type { UserRole, AppNotification, ApiNotification } from '@/lib/types';


// Import helpers
import { CUSTOM_ACCESS_TOKEN_KEY, CUSTOM_REFRESH_TOKEN_KEY, COURTLY_USER_ROLES_PREFIX, NOTIFICATION_STORAGE_PREFIX } from './authHelpers/constants';
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
  getNotificationStorageKey
} from './authHelpers/notificationManager';


export interface CourtlyUser extends FirebaseUser {
  roles: UserRole[];
}

export interface SetupFcmFn {
  (user: CourtlyUser | null): Promise<(() => void) | null>;
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
  
  const isProcessingLoginRef = React.useRef(false);
  const processingUidRef = React.useRef<string | null>(null);


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

  const setupFcm: SetupFcmFn = useCallback(async (user: CourtlyUser | null): Promise<(() => void) | null> => {
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
  }, [toast, addNotificationCb]);


  const fullLogoutSequence = useCallback(async () => {
    const uidBeforeLogout = auth.currentUser?.uid;
    await logoutFirebase(auth, toast);

    clearCustomTokens();
    setAndStoreAccessToken(null);
    setAndStoreRefreshToken(null);
    // setCurrentUser(null) is handled by onAuthStateChanged

    if (uidBeforeLogout && typeof window !== 'undefined') {
        localStorage.removeItem(`${COURTLY_USER_ROLES_PREFIX}${uidBeforeLogout}`);
        const notificationStorageKey = getNotificationStorageKey(uidBeforeLogout);
        if (notificationStorageKey) {
            localStorage.removeItem(notificationStorageKey);
        }
    }
    
    router.push('/login');
  }, [toast, setAndStoreAccessToken, setAndStoreRefreshToken, router]);


  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    return attemptTokenRefreshApi({
        currentRefreshToken: refreshToken,
        toast,
        setAndStoreAccessToken,
        setAndStoreRefreshToken,
        performLogout: fullLogoutSequence,
    });
  }, [refreshToken, toast, setAndStoreAccessToken, setAndStoreRefreshToken, fullLogoutSequence]);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentEventUid = firebaseUser?.uid || null;

      if (isProcessingLoginRef.current && processingUidRef.current === currentEventUid) {
        console.log(`AUTH_CONTEXT: onAuthStateChanged re-entrant for UID: ${currentEventUid}. Processing already in progress. Skipping.`);
        return;
      }
      if (isProcessingLoginRef.current && processingUidRef.current !== currentEventUid) {
          console.warn(`AUTH_CONTEXT: New auth event for UID ${currentEventUid} while processing ${processingUidRef.current}. This is expected if logout is triggered during login attempt. Proceeding with new event.`);
      }

      // Indicate start of processing for this specific event
      isProcessingLoginRef.current = true;
      processingUidRef.current = currentEventUid;
      setLoading(true);

      try {
        if (firebaseUser) {
          console.log(`AUTH_CONTEXT: Firebase user ${firebaseUser.uid} detected. Attempting custom session.`);
          // handleCustomApiLogin now calls setAndStoreAccessToken, setAndStoreRefreshToken, and setupFcm internally on success
          const loggedInCourtlyUser = await handleCustomApiLogin({
            firebaseUser,
            auth, // auth is not directly used by handleCustomApiLogin, but kept for interface consistency
            toast,
            setupFcm, // Pass the setupFcm function
            setAndStoreAccessToken, // Pass the setters
            setAndStoreRefreshToken,
          });

          if (!loggedInCourtlyUser) {
            console.warn("AUTH_CONTEXT: Custom API login failed or returned no user, despite Firebase user existing. Initiating full Firebase logout.");
            await logoutFirebase(auth, toast); // This will trigger onAuthStateChanged again with firebaseUser = null.
                                              // The current event's finally block will run.
                                              // The new (null) event will start its own processing cycle.
          } else {
            setCurrentUser(loggedInCourtlyUser); // Set the fully formed CourtlyUser
            console.log(`AUTH_CONTEXT: Custom session successful for ${loggedInCourtlyUser.uid}.`);
          }
        } else { // No Firebase user (firebaseUser is null)
          console.log("AUTH_CONTEXT: No Firebase user detected by onAuthStateChanged. Clearing session.");
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
          await setupFcm(null); // Ensure FCM is cleaned up/reset for no user
        }
      } catch (e) {
        console.error("AUTH_CONTEXT: Critical error in onAuthStateChanged's main try block:", e);
        clearCustomTokens();
        setAndStoreAccessToken(null);
        setAndStoreRefreshToken(null);
        setCurrentUser(null);
        if (auth.currentUser) { 
            console.error("AUTH_CONTEXT: Firebase user still present after critical error. Forcing logout.");
            await logoutFirebase(auth, toast); // Attempt to logout Firebase user if one was present
        }
      } finally {
        // This finally block is for the event (currentEventUid) that was being processed.
        // Only mark processing as done if this finally block corresponds to the UID currently marked as processing.
        if (processingUidRef.current === currentEventUid) {
            isProcessingLoginRef.current = false;
            // processingUidRef.current = null; // Optionally clear the UID marker here or let the next event overwrite
        }
        setLoading(false); // Indicate that this specific event's processing is finished
      }
    });
  
    return () => {
      unsubscribeAuth();
      if (unsubscribeFcmOnMessageRef.current) {
        unsubscribeFcmOnMessageRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, setupFcm, setAndStoreAccessToken, setAndStoreRefreshToken]);


  useEffect(() => {
    if (loading) return; // Wait for auth processing to finish before making routing decisions

    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser && accessToken && refreshToken) {
      // User is fully authenticated (Firebase user + custom tokens)
      if (isAuthPage) {
        router.push(currentUser.roles.includes('owner') ? '/dashboard/owner' : '/dashboard/user');
      }
    } else if (!currentUser && isProtectedPath) {
      // No user (neither Firebase nor custom tokens imply a valid session), but on protected path
      router.push('/login');
    } else if (!loading && currentUser && (!accessToken || !refreshToken) && isProtectedPath) {
      // Firebase user exists, but custom tokens are missing, and we are NOT in a loading state from onAuthStateChanged.
      // This indicates a potential desync or failure in custom token acquisition after Firebase auth.
      console.warn("AUTH_CONTEXT: Redirection logic: Firebase user exists, but custom tokens missing on protected path (and not loading). Triggering full logout.");
      fullLogoutSequence();
    }
    // If !currentUser and !isProtectedPath, do nothing (e.g., user is on home page, not logged in).
    // If currentUser && tokens && !isProtectedPath, do nothing (e.g., user is on home page, logged in).
  }, [currentUser, loading, router, pathname, accessToken, refreshToken, fullLogoutSequence]);

  useEffect(() => {
    initializeAuthHelpers({
      getAccessToken: () => accessToken,
      attemptTokenRefresh,
      logoutUser: fullLogoutSequence,
    });
  }, [accessToken, attemptTokenRefresh, fullLogoutSequence]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAndSetWeeklyAppNotifications(currentUser, setNotifications, setUnreadCount);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (loading) return;
    showNotificationPermissionReminder(toast, Button);
  }, [loading, toast]);


  const signUpWithEmail = async (email: string, password: string, name: string): Promise<void> => {
    await signUpWithEmailFirebase(auth, email, password, name, toast);
    // onAuthStateChanged will handle the rest
  };

  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    await signInWithEmailFirebase(auth, email, password, toast);
    // onAuthStateChanged will handle the rest
  };

  const signInWithGoogle = async (): Promise<void> => {
    await signInWithGoogleFirebase(auth, toast);
    // onAuthStateChanged will handle the rest
  };

  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    return signInWithPhoneNumberFirebase(auth, phoneNumber, appVerifier, toast);
    // After confirmation, onAuthStateChanged will handle the rest
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<void> => {
    await confirmPhoneNumberCodeFirebase(confirmationResult, code, toast);
    // onAuthStateChanged will handle the rest
  };

  const updateCourtlyUserRoles = (roles: UserRole[]) => {
    const updatedUser = updateRolesHelper(currentUser, roles, setCurrentUser);
    if (updatedUser && currentUser) {
        const oldPrimaryRoleIsOwner = currentUser.roles.includes('owner');
        const newPrimaryRoleIsOwner = updatedUser.roles.includes('owner');
        if (oldPrimaryRoleIsOwner !== newPrimaryRoleIsOwner) {
            router.push(newPrimaryRoleIsOwner ? '/dashboard/owner' : '/dashboard/user');
        } else if (pathname === '/auth/complete-profile') { 
             router.push(newPrimaryRoleIsOwner ? '/dashboard/owner' : '/dashboard/user');
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
    logoutUser: fullLogoutSequence,
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

// Ensure window.recaptchaVerifier is declared for global use if not already.
declare global {
  interface Window { recaptchaVerifier?: RecaptchaVerifier }
}

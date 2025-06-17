
// src/contexts/AuthContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User as FirebaseUser, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast, type ToastFn } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import type { UserRole, AppNotification } from '@/lib/types'; // Removed ApiNotification as it's handled by notificationManager

// Import helpers
import { CUSTOM_ACCESS_TOKEN_KEY, CUSTOM_REFRESH_TOKEN_KEY, COURTLY_USER_ROLES_PREFIX, NOTIFICATION_STORAGE_PREFIX } from './authHelpers/constants';
// getStoredRoles, updateCurrentUserRoles are used by roleManager itself or components directly
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
  // loadTokensFromStorage, // Not directly used inside AuthContext after initial setup
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
} from './authHelpers/notificationManager.tsx'; // Note .tsx extension
import { initializeAuthHelpers } from '@/lib/apiUtils';


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
  const unsubscribeFcmOnMessageRef = useRef<(() => void) | null>(null);
  
  const isProcessingLoginRef = useRef(false);
  const processingUidRef = useRef<string | null>(null);


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

    clearCustomTokens(); // From tokenManager
    setAndStoreAccessToken(null);
    setAndStoreRefreshToken(null);
    // setCurrentUser(null) is handled by onAuthStateChanged after logoutFirebase

    if (uidBeforeLogout && typeof window !== 'undefined') {
        localStorage.removeItem(`${COURTLY_USER_ROLES_PREFIX}${uidBeforeLogout}`);
        const notificationStorageKey = getNotificationStorageKey(uidBeforeLogout);
        if (notificationStorageKey) {
            localStorage.removeItem(notificationStorageKey);
        }
    }
    setNotifications([]); // Clear local notification state immediately
    setUnreadCount(0);
    
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
      console.log(`AUTH_CONTEXT: onAuthStateChanged event received. Firebase user UID: ${currentEventUid || 'null'}. Current processing UID: ${processingUidRef.current}, isProcessing: ${isProcessingLoginRef.current}`);


      if (isProcessingLoginRef.current && processingUidRef.current === currentEventUid) {
        console.log(`AUTH_CONTEXT: onAuthStateChanged RE-ENTRANT for UID: ${currentEventUid}. Current processing for this specific UID/state not finished. Skipping new event.`);
        return;
      }

      if (isProcessingLoginRef.current && processingUidRef.current !== currentEventUid) {
          console.warn(`AUTH_CONTEXT: New auth event for UID ${currentEventUid} arrived while an older event for UID ${processingUidRef.current} was still processing. The new event will take precedence. Old event's finally block might run later but its effect on isProcessingLoginRef should be guarded.`);
      }

      isProcessingLoginRef.current = true;
      processingUidRef.current = currentEventUid;
      setLoading(true);

      try {
        if (firebaseUser) {
          console.log(`AUTH_CONTEXT: Firebase user ${firebaseUser.uid} detected. Attempting custom session.`);
          const loggedInCourtlyUser = await handleCustomApiLogin({
            firebaseUser,
            auth,
            toast,
            setupFcm,
            setAndStoreAccessToken,
            setAndStoreRefreshToken,
          });

          if (!loggedInCourtlyUser) {
            console.warn(`AUTH_CONTEXT: Custom API login failed or returned no user for Firebase UID ${firebaseUser.uid}. Initiating full Firebase logout.`);
            await logoutFirebase(auth, toast); // This will trigger onAuthStateChanged(null)
          } else {
            setCurrentUser(loggedInCourtlyUser);
            console.log(`AUTH_CONTEXT: Custom session successful for ${loggedInCourtlyUser.uid}. Roles: ${loggedInCourtlyUser.roles.join(', ')}`);
          }
        } else { // No Firebase user (firebaseUser is null)
          if (currentUser !== null || accessToken !== null || refreshToken !== null) {
            console.log("AUTH_CONTEXT: No Firebase user detected by onAuthStateChanged. Current app state indicates an active session. Clearing session.");
            clearCustomTokens();
            setAndStoreAccessToken(null);
            setAndStoreRefreshToken(null);
            setCurrentUser(null); // This will trigger re-render
            setNotifications([]);
            setUnreadCount(0);
          } else {
            console.log("AUTH_CONTEXT: No Firebase user detected, and app state is already clean (no user, no tokens). No session state changes needed.");
          }
          
          if (unsubscribeFcmOnMessageRef.current) {
            console.log("AUTH_CONTEXT: Cleaning up existing FCM listener.");
            unsubscribeFcmOnMessageRef.current();
            unsubscribeFcmOnMessageRef.current = null;
          }
          await setupFcm(null);
        }
      } catch (e) {
        console.error(`AUTH_CONTEXT: Critical error in onAuthStateChanged's main try block for UID ${currentEventUid}:`, e);
        if (auth.currentUser) { 
            console.error("AUTH_CONTEXT: Firebase user still present after critical error. Forcing logout.");
            await logoutFirebase(auth, toast);
        } else {
            clearCustomTokens();
            setAndStoreAccessToken(null); setAndStoreRefreshToken(null); setCurrentUser(null);
        }
      } finally {
        if (processingUidRef.current === currentEventUid) {
            isProcessingLoginRef.current = false;
             console.log(`AUTH_CONTEXT: Finished processing for UID: ${currentEventUid}. isProcessingLoginRef set to false.`);
        } else {
            console.warn(`AUTH_CONTEXT: Finally block for superseded event UID ${currentEventUid} (current active processing is for ${processingUidRef.current}). No change to isProcessingLoginRef from this older event's finally.`);
        }
        setLoading(false);
        console.log(`AUTH_CONTEXT: setLoading(false) after processing UID: ${currentEventUid}.`);
      }
    });
  
    return () => {
      console.log("AUTH_CONTEXT: Unsubscribing from onAuthStateChanged.");
      unsubscribeAuth();
      if (unsubscribeFcmOnMessageRef.current) {
        console.log("AUTH_CONTEXT: Cleaning up FCM listener on AuthProvider unmount.");
        unsubscribeFcmOnMessageRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, setupFcm, setAndStoreAccessToken, setAndStoreRefreshToken, currentUser, accessToken, refreshToken]); // Added currentUser, accessToken, refreshToken to deps for the conditional clearing logic

  useEffect(() => {
    if (loading) {
        console.log("AUTH_CONTEXT: Redirection logic waiting: Auth is loading.");
        return;
    }

    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard');

    console.log(`AUTH_CONTEXT: Redirection check. Path: ${pathname}, IsAuthPage: ${isAuthPage}, IsProtected: ${isProtectedPath}, CurrentUser: ${!!currentUser}, AccessToken: ${!!accessToken}`);

    if (currentUser && accessToken && refreshToken) {
      // User is fully authenticated (Firebase user + custom tokens)
      if (isAuthPage) {
        const targetDashboard = currentUser.roles.includes('owner') ? '/dashboard/owner' : '/dashboard/user';
        console.log(`AUTH_CONTEXT: User authenticated, on auth page. Redirecting to ${targetDashboard}.`);
        router.push(targetDashboard);
      }
    } else if (!currentUser && isProtectedPath) {
      // No user (neither Firebase nor custom tokens imply a valid session), but on protected path
      console.log("AUTH_CONTEXT: No user, on protected path. Redirecting to /login.");
      router.push('/login');
    } else if (currentUser && (!accessToken || !refreshToken) && isProtectedPath) {
      // Firebase user exists, but custom tokens are missing, and we are NOT in a loading state.
      console.warn("AUTH_CONTEXT: Redirection logic: Firebase user exists, but custom tokens missing on protected path (and not loading). Triggering full logout.");
      fullLogoutSequence();
    } else {
        console.log("AUTH_CONTEXT: Redirection logic: No redirection needed based on current state.");
    }
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
  };

  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    await signInWithEmailFirebase(auth, email, password, toast);
  };

  const signInWithGoogle = async (): Promise<void> => {
    await signInWithGoogleFirebase(auth, toast);
  };

  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    return signInWithPhoneNumberFirebase(auth, phoneNumber, appVerifier, toast);
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<void> => {
    await confirmPhoneNumberCodeFirebase(confirmationResult, code, toast);
  };

  const updateCourtlyUserRolesCb = useCallback((roles: UserRole[]) => { // Renamed to avoid conflict, used in value
    if (currentUser && typeof window !== 'undefined') {
      const rolesToSet = new Set<UserRole>(roles.filter(role => ['user', 'owner', 'admin', 'editor'].includes(role)));
      if (rolesToSet.size > 0 || roles.length > 0) rolesToSet.add('user');
      else rolesToSet.add('user');
      
      const finalRoles = Array.from(rolesToSet);
      const updatedUser: CourtlyUser = { ...currentUser, roles: finalRoles };
      
      localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${currentUser.uid}`, JSON.stringify(finalRoles));
      setCurrentUser(updatedUser); // This will trigger the redirection useEffect

      // Check if primary role view needs to change for immediate redirection
      const currentPrimaryIsOwner = currentUser.roles.includes('owner');
      const newPrimaryIsOwner = finalRoles.includes('owner');
      if (currentPrimaryIsOwner !== newPrimaryIsOwner || pathname === '/auth/complete-profile') {
          router.push(newPrimaryIsOwner ? '/dashboard/owner' : '/dashboard/user');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, router, pathname]); // Add router, pathname as dependencies
  
  const markNotificationAsReadCb = async (notificationId: string) => { // Renamed
    await markNotificationReadManager(notificationId, notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  };
  const markAllNotificationsAsReadCb = async () => { // Renamed
    await markAllNotificationsReadManager(notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  };
  const clearAllNotificationsCb = async () => { // Renamed
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
    updateCourtlyUserRoles: updateCourtlyUserRolesCb,
    attemptTokenRefresh,
    notifications,
    unreadCount,
    addNotification: addNotificationCb,
    markNotificationAsRead: markNotificationAsReadCb,
    markAllNotificationsAsRead: markAllNotificationsAsReadCb,
    clearAllNotifications: clearAllNotificationsCb,
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

declare global {
  interface Window { recaptchaVerifier?: RecaptchaVerifier }
}

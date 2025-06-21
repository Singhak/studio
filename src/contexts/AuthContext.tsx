
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
import type { UserRole, AppNotification } from '@/lib/types'; // Corrected import

import { CLIENT_INSTANCE_ID_KEY, CUSTOM_ACCESS_TOKEN_KEY, CUSTOM_REFRESH_TOKEN_KEY, COURTLY_USER_ROLES_PREFIX, NOTIFICATION_STORAGE_PREFIX } from './authHelpers/constants';
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

const getOrCreateClientInstanceId = (): string => {
  if (typeof window !== 'undefined') {
    let instanceId = localStorage.getItem(CLIENT_INSTANCE_ID_KEY);
    if (!instanceId) {
      instanceId = crypto.randomUUID();
      localStorage.setItem(CLIENT_INSTANCE_ID_KEY, instanceId);
      console.log("AUTH_CONTEXT: New client instance ID created:", instanceId);
    }
    return instanceId;
  }
  return 'client-id-unavailable-ssr-or-no-window';
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CourtlyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessTokenState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    return null;
  });
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
    return null;
  });
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

  const setupFcm: SetupFcmFn = useCallback(async (userForFcmSetup: CourtlyUser | null): Promise<(() => void) | null> => {
      if (unsubscribeFcmOnMessageRef.current) {
          unsubscribeFcmOnMessageRef.current();
          unsubscribeFcmOnMessageRef.current = null;
      }
      if (userForFcmSetup) {
          const unsubscribe = await setupFcmMessaging(userForFcmSetup, toast, addNotificationCb);
          unsubscribeFcmOnMessageRef.current = unsubscribe;
          return unsubscribe;
      }
      return null;
  }, [toast, addNotificationCb]);


  const fullLogoutSequence = useCallback(async () => {
    console.log("AUTH_CONTEXT: fullLogoutSequence initiated.");
    const uidBeforeLogout = auth.currentUser?.uid;
    await logoutFirebase(auth, toast); 

    clearCustomTokens();
    setAndStoreAccessToken(null);
    setAndStoreRefreshToken(null);
    setCurrentUser(null); 

    if (uidBeforeLogout && typeof window !== 'undefined') {
        localStorage.removeItem(`${COURTLY_USER_ROLES_PREFIX}${uidBeforeLogout}`);
        const notificationStorageKey = getNotificationStorageKey(uidBeforeLogout);
        if (notificationStorageKey) {
            localStorage.removeItem(notificationStorageKey);
        }
    }
    setNotifications([]);
    setUnreadCount(0);
    
    router.push('/login');
    console.log("AUTH_CONTEXT: fullLogoutSequence completed.");
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
      const eventUid = firebaseUser?.uid || `null_user_event_${Date.now()}`;
      console.log(`AUTH_CONTEXT: [EVENT START] onAuthStateChanged. Firebase UID: ${eventUid}. Current isProcessing: ${isProcessingLoginRef.current}, for UID: ${processingUidRef.current}`);

      if (isProcessingLoginRef.current && processingUidRef.current === eventUid) {
        console.log(`AUTH_CONTEXT: [RE-ENTRANT] Event for UID: ${eventUid}. Already processing this state. Skipping.`);
        return;
      }
      
      isProcessingLoginRef.current = true;
      processingUidRef.current = eventUid; 
      console.log(`AUTH_CONTEXT: [PROCESSING] Event for UID: ${eventUid}. Setting loading = true.`);
      setLoading(true);

      try {
        if (firebaseUser) {
          console.log(`AUTH_CONTEXT: [USER DETECTED] Firebase user ${firebaseUser.uid}. Attempting custom session.`);
          const clientInstanceId = getOrCreateClientInstanceId();
          console.log(`AUTH_CONTEXT: [DEVICE_ID] Using clientInstanceId: ${clientInstanceId} for login API call.`);
          const loggedInCourtlyUser = await handleCustomApiLogin({
            firebaseUser,
            auth,
            toast,
            setupFcm, 
            setAndStoreAccessToken,
            setAndStoreRefreshToken,
            clientInstanceId,
          });

          if (!loggedInCourtlyUser) {
            console.warn(`AUTH_CONTEXT: [CUSTOM LOGIN FAILED] For Firebase UID ${firebaseUser.uid}. Forcing Firebase logout.`);
            await logoutFirebase(auth, toast); 
          } else {
            console.log(`AUTH_CONTEXT: [CUSTOM LOGIN SUCCESS] For ${loggedInCourtlyUser.uid}. Roles: ${loggedInCourtlyUser.roles.join(', ')}. Setting currentUser.`);
            setCurrentUser(loggedInCourtlyUser);
          }
        } else { 
          if (currentUser !== null || accessToken !== null || refreshToken !== null) {
            console.log("AUTH_CONTEXT: No Firebase user detected by onAuthStateChanged. Current app state indicates an active session. Clearing session.");
            clearCustomTokens();
            setAndStoreAccessToken(null);
            setAndStoreRefreshToken(null);
            setCurrentUser(null); 
            setNotifications([]);
            setUnreadCount(0);
          } else {
            console.log("AUTH_CONTEXT: No Firebase user detected, and app state is already clean (no user, no tokens). No session state changes needed.");
          }
          
          if (unsubscribeFcmOnMessageRef.current) {
            console.log("AUTH_CONTEXT: [FCM CLEANUP] Cleaning up existing FCM listener.");
            unsubscribeFcmOnMessageRef.current();
            unsubscribeFcmOnMessageRef.current = null;
          }
          await setupFcm(null); 
        }
      } catch (e) {
        console.error(`AUTH_CONTEXT: [CRITICAL ERROR] During onAuthStateChanged for UID ${eventUid}:`, e);
        if (auth.currentUser) { 
            console.error("AUTH_CONTEXT: [CRITICAL ERROR] Firebase user still present. Forcing logout to reset state.");
            await logoutFirebase(auth, toast);
        } else {
            console.error("AUTH_CONTEXT: [CRITICAL ERROR] Firebase user already null. Ensuring local cleanup.");
            clearCustomTokens();
            setAndStoreAccessToken(null); setAndStoreRefreshToken(null); setCurrentUser(null);
            setNotifications([]); setUnreadCount(0);
        }
      } finally {
        if (processingUidRef.current === eventUid) {
            isProcessingLoginRef.current = false;
            processingUidRef.current = null; 
            setLoading(false); 
            console.log(`AUTH_CONTEXT: [EVENT END] For UID: ${eventUid}. loading=false, isProcessingLoginRef=false.`);
        } else {
            console.warn(`AUTH_CONTEXT: [FINALLY SUPERSEDED] For event UID ${eventUid}. Current processing is for ${processingUidRef.current}. No changes to flags/loading by this old event.`);
        }
      }
    });
  
    return () => {
      console.log("AUTH_CONTEXT: Unsubscribing from onAuthStateChanged listener.");
      unsubscribeAuth();
      if (unsubscribeFcmOnMessageRef.current) {
        console.log("AUTH_CONTEXT: Cleaning up FCM listener on AuthProvider unmount.");
        unsubscribeFcmOnMessageRef.current();
      }
    };
  }, [toast, setAndStoreAccessToken, setAndStoreRefreshToken]);

  useEffect(() => {
    console.log(`AUTH_CONTEXT: [REDIRECTION CHECK] Loading: ${loading}, Path: ${pathname}, CurrentUser: ${!!currentUser}, AccessToken: ${!!accessToken}`);

    if (loading) {
        console.log("AUTH_CONTEXT: [REDIRECTION] Auth is loading. Waiting.");
        return;
    }

    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser && accessToken && refreshToken) {
      if (isAuthPage) {
        const targetDashboard = currentUser.roles.includes('owner') ? '/dashboard/owner' : '/dashboard/user';
        console.log(`AUTH_CONTEXT: [REDIRECTION] User authenticated, on auth page. Redirecting to ${targetDashboard}.`);
        router.push(targetDashboard);
      }
    } else if (!currentUser && isProtectedPath) {
      console.log("AUTH_CONTEXT: [REDIRECTION] No user, on protected path. Redirecting to /login.");
      router.push('/login');
    } else if (currentUser && (!accessToken || !refreshToken) && isProtectedPath) {
      console.warn("AUTH_CONTEXT: [REDIRECTION] Firebase user exists, but custom tokens missing on protected path (and not loading). Initiating full logout.");
      fullLogoutSequence();
    } else {
        console.log("AUTH_CONTEXT: [REDIRECTION] No redirection condition met.");
    }
  }, [currentUser, loading, router, pathname, accessToken, refreshToken, fullLogoutSequence]);

  useEffect(() => {
    initializeAuthHelpers({
      getAccessToken: () => accessToken ? accessToken : localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY),
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

  const updateCourtlyUserRolesCb = useCallback((roles: UserRole[]) => {
    if (currentUser && typeof window !== 'undefined') {
      const rolesToSet = new Set<UserRole>(roles.filter(role => ['user', 'owner', 'admin', 'editor'].includes(role)));
      if (rolesToSet.size > 0 || roles.length > 0) rolesToSet.add('user');
      else rolesToSet.add('user');
      
      const finalRoles = Array.from(rolesToSet);
      const updatedUser: CourtlyUser = { ...currentUser, roles: finalRoles };
      
      localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${currentUser.uid}`, JSON.stringify(finalRoles));
      setCurrentUser(updatedUser);
      console.log("AUTH_CONTEXT: Roles updated. Current path:", pathname, "New roles:", finalRoles);
    }
  }, [currentUser, pathname]);
  
  const markNotificationAsReadCb = async (notificationId: string) => {
    await markNotificationReadManager(notificationId, notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  };
  const markAllNotificationsAsReadCb = async () => {
    await markAllNotificationsReadManager(notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  };
  const clearAllNotificationsCb = async () => {
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

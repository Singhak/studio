
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User as FirebaseUser, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import type { ToastFn } from "@/hooks/use-toast"; // Ensure ToastFn is correctly imported
import { useToast } from "@/hooks/use-toast";
import { initializeAuthHelpers } from '@/lib/apiUtils';
import { Button } from '@/components/ui/button';

// Import helpers
import { CUSTOM_ACCESS_TOKEN_KEY, CUSTOM_REFRESH_TOKEN_KEY, COURTLY_USER_ROLES_PREFIX, NOTIFICATION_STORAGE_PREFIX } from './authHelpers/constants';
import { getStoredRoles, updateCurrentUserRoles as updateRolesHelper, type UserRole } from './authHelpers/roleManager';
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
  getNotificationStorageKey // Import getNotificationStorageKey
} from './authHelpers/notificationManager';


export interface CourtlyUser extends FirebaseUser {
  roles: UserRole[];
}
export type SetupFcmFn = (user: CourtlyUser | null) => Promise<(() => void) | null>;

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
  }, [toast, addNotificationCb]);


  const fullLogoutSequence = useCallback(async () => {
    const uidBeforeLogout = auth.currentUser?.uid;
    await logoutFirebase(auth, toast);
    
    clearCustomTokens();
    setAccessTokenState(null);
    setRefreshTokenState(null);
    setCurrentUser(null);
    
    setNotifications([]);
    setUnreadCount(0);
    if (uidBeforeLogout && typeof window !== 'undefined') {
        const notificationStorageKey = getNotificationStorageKey(uidBeforeLogout);
        if (notificationStorageKey) {
            localStorage.removeItem(notificationStorageKey);
        }
        localStorage.removeItem(`${COURTLY_USER_ROLES_PREFIX}${uidBeforeLogout}`);
    }
    
    if (unsubscribeFcmOnMessageRef.current) {
        unsubscribeFcmOnMessageRef.current();
        unsubscribeFcmOnMessageRef.current = null;
    }
    await setupFcm(null);
    
    isProcessingLoginRef.current = false;
    processingUidRef.current = null;
    router.push('/login');
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


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); 
  
      if (firebaseUser && processingUidRef.current === firebaseUser.uid && isProcessingLoginRef.current) {
        console.log(`AUTH_CONTEXT: Already processing login for UID: ${firebaseUser.uid}. Skipping re-entry.`);
        setLoading(false);
        return;
      }
  
      processingUidRef.current = firebaseUser ? firebaseUser.uid : null;
      isProcessingLoginRef.current = true;
  
      try {
        if (firebaseUser) {
          console.log(`AUTH_CONTEXT: Firebase user ${firebaseUser.uid} detected.`);
          const storedTokens = loadTokensFromStorage();
  
          if (storedTokens.accessToken && storedTokens.refreshToken) {
            console.log("AUTH_CONTEXT: Found custom tokens. Hydrating session.");
            setAndStoreAccessToken(storedTokens.accessToken);
            setAndStoreRefreshToken(storedTokens.refreshToken);
            
            const userRoles = getStoredRoles(firebaseUser.uid);
            const courtlyUserInstance: CourtlyUser = {
              ...(firebaseUser as any),
              roles: userRoles.length > 0 ? userRoles : ['user'],
            };
            setCurrentUser(courtlyUserInstance);
            await setupFcm(courtlyUserInstance);
          } else {
            console.log("AUTH_CONTEXT: No custom tokens. Attempting custom API login.");
            const loggedInUser = await handleCustomApiLogin({
              firebaseUser,
              auth,
              toast,
              setupFcm,
              setAndStoreAccessToken,
              setAndStoreRefreshToken,
            });
            setCurrentUser(loggedInUser);
            if (!loggedInUser) {
              console.warn("AUTH_CONTEXT: Custom API login failed for Firebase user. Session might be invalid.");
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
        clearCustomTokens();
        setAndStoreAccessToken(null);
        setAndStoreRefreshToken(null);
        setCurrentUser(null);
      } finally {
        if ((firebaseUser && processingUidRef.current === firebaseUser.uid) || !firebaseUser) {
            isProcessingLoginRef.current = false;
            if (!firebaseUser) {
                processingUidRef.current = null;
            }
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
  }, [toast, setupFcm, setAndStoreAccessToken, setAndStoreRefreshToken]); 


  useEffect(() => {
    if (loading) return;
    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard');

    if (currentUser && accessToken && refreshToken) {
      if (isAuthPage) {
        if (currentUser.roles.includes('owner')) {
          router.push('/dashboard/owner');
        } else {
          router.push('/dashboard/user');
        }
      }
    } else if (!currentUser && isProtectedPath) {
        router.push('/login');
    } else if (currentUser && (!accessToken || !refreshToken) && isProtectedPath) {
        console.warn("AUTH_CONTEXT: Firebase user exists but custom tokens are missing on a protected path. Logging out.");
        fullLogoutSequence();
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
    setLoading(true);
    await signUpWithEmailFirebase(auth, email, password, name, toast);
    // onAuthStateChanged will handle the rest
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

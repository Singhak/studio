
// src/contexts/AuthContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User as FirebaseUser, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast, type ToastFn } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import type { UserRole, AppNotification, ClubAddress } from '@/lib/types';

import { CLIENT_INSTANCE_ID_KEY, CUSTOM_ACCESS_TOKEN_KEY, CUSTOM_REFRESH_TOKEN_KEY, COURTLY_USER_ROLES_PREFIX } from './authHelpers/constants';
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
  getNotificationStorageKey,
  saveNotificationsToStorage,
} from './authHelpers/notificationManager.tsx';
import { initializeAuthHelpers } from '@/lib/apiUtils';


export interface CourtlyUser extends FirebaseUser {
  roles: UserRole[];
  whatsappNumber?: string | null;
  address?: Partial<ClubAddress>;
}

export interface SetupFcmFn {
  (user: CourtlyUser | null): Promise<(() => void) | null>;
}
interface AuthContextType {
  currentUser: CourtlyUser | null;
  loading: boolean;
  profileCompletionPending: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  updateCourtlyUserRoles: (roles: UserRole[]) => void;
  updateCourtlyUserProfile: (profileData: Partial<Pick<CourtlyUser, 'displayName' | 'phoneNumber' | 'whatsappNumber' | 'address' | 'roles'>>) => void;
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
    }
    return instanceId;
  }
  return 'client-id-unavailable-ssr-or-no-window';
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined);
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
  const unsubscribeFcmOnMessageRef = useRef<(() => void) | null>(null);
  
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

  // Effect to load tokens from storage on initial mount
  useEffect(() => {
    const { accessToken: storedAccess, refreshToken: storedRefresh } = loadTokensFromStorage();
    setAccessTokenState(storedAccess);
    setRefreshTokenState(storedRefresh);
  }, []);

  const addNotificationCb = useCallback((title: string, body?: string, href?: string, id?: string) => {
    addNotificationManager(title, body, href, id, notifications, currentUser?.uid, setNotifications, setUnreadCount);
  }, [notifications, currentUser?.uid]);

  const setupFcm = useCallback(async (userForFcmSetup: CourtlyUser | null): Promise<(() => void) | null> => {
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
    await logoutFirebase(auth, toast);
    // onAuthStateChanged will handle the rest of the cleanup
  }, [toast]);

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    return attemptTokenRefreshApi({
        currentRefreshToken: refreshToken,
        toast,
        setAndStoreAccessToken,
        setAndStoreRefreshToken,
        performLogout: fullLogoutSequence,
    });
  }, [refreshToken, toast, setAndStoreAccessToken, setAndStoreRefreshToken, fullLogoutSequence]);

  // Effect 1: Firebase listener. Runs only once.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Effect 2: Process user changes from Firebase listener.
  useEffect(() => {
    const processUserChange = async () => {
      setLoading(true);
      if (firebaseUser) {
        // This is a login or refresh event
        const isNewUser = Date.parse(firebaseUser.metadata.lastSignInTime!) - Date.parse(firebaseUser.metadata.creationTime!) < 5000;
        
        const clientInstanceId = getOrCreateClientInstanceId();
        const loggedInCourtlyUser = await handleCustomApiLogin({
          firebaseUser, auth, toast, setupFcm, setAndStoreAccessToken, setAndStoreRefreshToken, clientInstanceId,
        });

        if (loggedInCourtlyUser) {
          setCurrentUser(loggedInCourtlyUser);
          if (isNewUser) {
            console.log("AUTH_CONTEXT: New user detected, setting profile completion pending.");
            setProfileCompletionPending(true);
          } else {
            setProfileCompletionPending(false);
          }
        }
      } else {
        // This is a logout event
        clearCustomTokens();
        setAndStoreAccessToken(null);
        setAndStoreRefreshToken(null);
        setCurrentUser(null);
        setProfileCompletionPending(false);
        if (typeof window !== 'undefined' && currentUser?.uid) {
            localStorage.removeItem(`${COURTLY_USER_ROLES_PREFIX}${currentUser.uid}`);
            const notificationKey = getNotificationStorageKey(currentUser.uid);
            if(notificationKey) localStorage.removeItem(notificationKey);
        }
        setNotifications([]);
        setUnreadCount(0);
        if (unsubscribeFcmOnMessageRef.current) {
          unsubscribeFcmOnMessageRef.current();
          unsubscribeFcmOnMessageRef.current = null;
        }
      }
      setLoading(false);
    };

    if (firebaseUser !== undefined) {
      processUserChange();
    }
  }, [firebaseUser, setAndStoreAccessToken, setAndStoreRefreshToken, setupFcm, toast, currentUser?.uid]);


  // Effect 3: Redirection logic
  useEffect(() => {
    if (loading) return;

    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/profile');

    if (profileCompletionPending && pathname !== '/auth/complete-profile') {
      console.log("AUTH_CONTEXT: [REDIRECTION] Profile completion pending. Redirecting to /auth/complete-profile.");
      router.push('/auth/complete-profile');
      return;
    }

    if (currentUser && accessToken) {
      if (isAuthPage && !profileCompletionPending) {
        const targetDashboard = currentUser.roles.includes('owner') ? '/dashboard/owner' : '/dashboard/user';
        console.log(`AUTH_CONTEXT: [REDIRECTION] User authenticated, on auth page. Redirecting to ${targetDashboard}.`);
        router.push(targetDashboard);
      }
    } else if (!currentUser && isProtectedPath) {
      console.log("AUTH_CONTEXT: [REDIRECTION] No user, on protected path. Redirecting to /login.");
      router.push('/login');
    }
  }, [currentUser, loading, router, pathname, accessToken, profileCompletionPending]);

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

  const updateCourtlyUserRoles = useCallback((roles: UserRole[]) => {
    if (!currentUser) return;
    const rolesToSet = new Set<UserRole>(roles);
    rolesToSet.add('user');
    const finalRoles = Array.from(rolesToSet);
    
    const updatedUser: CourtlyUser = { ...currentUser, roles: finalRoles };
    
    localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${currentUser.uid}`, JSON.stringify(finalRoles));
    setCurrentUser(updatedUser);
    
    if (profileCompletionPending) {
        setProfileCompletionPending(false);
    }
  }, [currentUser, profileCompletionPending]);

  const updateCourtlyUserProfile = useCallback((profileData: Partial<Pick<CourtlyUser, 'displayName' | 'phoneNumber' | 'whatsappNumber' | 'address' | 'roles'>>) => {
    setCurrentUser(prevUser => {
        if (!prevUser) return null;

        const mergedData: Partial<CourtlyUser> = { ...profileData };
        if (mergedData.displayName === undefined) delete mergedData.displayName;
        if (mergedData.phoneNumber === undefined) delete mergedData.phoneNumber;
        
        const updatedUser: CourtlyUser = { ...prevUser, ...mergedData };
        
        if (profileData.roles) {
            localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${prevUser.uid}`, JSON.stringify(profileData.roles));
        }
        
        console.log("Simulating user profile update. New state:", updatedUser);
        return updatedUser;
    });
    if (auth.currentUser && profileData.displayName) {
        updateProfile(auth.currentUser, { displayName: profileData.displayName }).catch(e => console.error("Firebase profile update failed:", e));
    }
  }, []);
  
  const markNotificationAsReadCb = useCallback(async (notificationId: string) => {
    await markNotificationReadManager(notificationId, notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  }, [notifications, currentUser?.uid, toast]);
  
  const markAllNotificationsAsReadCb = useCallback(async () => {
    await markAllNotificationsReadManager(notifications, currentUser?.uid, toast, setNotifications, setUnreadCount);
  }, [notifications, currentUser?.uid, toast]);
  
  const clearAllNotificationsCb = useCallback(async () => {
    await clearAllNotificationsManager(currentUser?.uid, toast, setNotifications, setUnreadCount);
  }, [currentUser?.uid, toast]);


  const value = {
    currentUser,
    loading,
    profileCompletionPending,
    accessToken,
    refreshToken,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithPhoneNumberFlow,
    confirmPhoneNumberCode,
    logoutUser: fullLogoutSequence,
    updateCourtlyUserRoles,
    updateCourtlyUserProfile,
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

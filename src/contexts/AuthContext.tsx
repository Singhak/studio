
// src/contexts/AuthContext.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { User as FirebaseUser, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useToast, type ToastFn } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import type { UserRole, AppNotification, ClubAddress } from '@/lib/types';

import { PLAYCE_USER_ROLES_PREFIX } from './authHelpers/constants';
import {
  signUpWithEmailFirebase,
  signInWithEmailFirebase,
  signInWithGoogleFirebase,
  signInWithPhoneNumberFirebase,
  confirmPhoneNumberCodeFirebase,
  logoutFirebase
} from './authHelpers/firebaseAuthActions';
import { getStoredRoles } from './authHelpers/roleManager';
import {
  fetchAndSetWeeklyAppNotifications,
  addAppNotification,
  markAppNotificationAsRead,
  markAllAppNotificationsAsRead,
  clearAllAppNotifications,
  setupFcmMessaging,
  showNotificationPermissionReminder,
  getNotificationStorageKey,
  saveNotificationsToStorage,
} from '@/lib/firebase/messaging';


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
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  updateCourtlyUserRoles: (roles: UserRole[]) => void;
  updateCourtlyUserProfile: (profileData: Partial<Pick<CourtlyUser, 'displayName' | 'phoneNumber' | 'whatsappNumber' | 'address' | 'roles'>>) => void;
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
  const [profileCompletionPending, setProfileCompletionPending] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  
  const unsubscribeFcmOnMessageRef = useRef<(() => void) | null>(null);
  
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  
  const addNotificationCb = useCallback((title: string, body?: string, href?: string, id?: string) => {
    addAppNotification(
        title, body, href, id,
        currentUserRef.current?.uid,
        setNotifications
    );
  }, [setNotifications]);

  const fullLogoutSequence = useCallback(async () => {
    const uidToClean = currentUserRef.current?.uid; 
    await logoutFirebase(auth, toast);
    if (uidToClean && typeof window !== 'undefined') {
        localStorage.removeItem(`${PLAYCE_USER_ROLES_PREFIX}${uidToClean}`);
        const notificationKey = getNotificationStorageKey(uidToClean);
        if (notificationKey) localStorage.removeItem(notificationKey);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);

      if (user) {
        const isNewUser = user.metadata.lastSignInTime ? (new Date(user.metadata.lastSignInTime).getTime() - new Date(user.metadata.creationTime!).getTime() < 5000) : false;
        
        const userRoles = getStoredRoles(user.uid);
        const finalRoles: UserRole[] = userRoles.length > 0 ? userRoles : ['user'];
         if (userRoles.length === 0 && typeof window !== 'undefined') {
            localStorage.setItem(`${PLAYCE_USER_ROLES_PREFIX}${user.uid}`, JSON.stringify(finalRoles));
        }

        const courtlyUser: CourtlyUser = {
            ...user,
            roles: finalRoles,
        };
        
        setCurrentUser(courtlyUser);
        setProfileCompletionPending(isNewUser);

      } else {
        setCurrentUser(null);
        setProfileCompletionPending(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const setup = async () => {
      if (currentUser) {
          if (unsubscribeFcmOnMessageRef.current) {
              unsubscribeFcmOnMessageRef.current();
          }
          unsubscribeFcmOnMessageRef.current = await setupFcmMessaging(currentUser, toast, addNotificationCb);
          fetchAndSetWeeklyAppNotifications(currentUser, setNotifications);
      } else {
          if (unsubscribeFcmOnMessageRef.current) {
              unsubscribeFcmOnMessageRef.current();
              unsubscribeFcmOnMessageRef.current = null;
          }
          setNotifications([]);
      }
    };
    setup();
  }, [currentUser, toast, addNotificationCb]);


  useEffect(() => {
    if (loading) return;

    const authPages = ['/login', '/register', '/auth/complete-profile'];
    const isAuthPage = authPages.includes(pathname);
    const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/profile');

    if (profileCompletionPending && pathname !== '/auth/complete-profile') {
      router.push('/auth/complete-profile');
      return;
    }

    if (currentUser) {
      if (isAuthPage && !profileCompletionPending) {
        const targetDashboard = currentUser.roles.includes('owner') ? '/dashboard/owner' : '/dashboard/user';
        router.push(targetDashboard);
      }
    } else if (!currentUser && isProtectedPath) {
      router.push('/login');
    }
  }, [currentUser, loading, router, pathname, profileCompletionPending]);

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
    
    localStorage.setItem(`${PLAYCE_USER_ROLES_PREFIX}${currentUser.uid}`, JSON.stringify(finalRoles));
    setCurrentUser(updatedUser);
    
    if (profileCompletionPending) {
        setProfileCompletionPending(false);
    }
  }, [currentUser, profileCompletionPending]);

  const updateCourtlyUserProfile = useCallback((profileData: Partial<Pick<CourtlyUser, 'displayName' | 'phoneNumber' | 'whatsappNumber' | 'address' | 'roles'>>) => {
    setCurrentUser(prevUser => {
        if (!prevUser) return null;
        
        const updatedUser: CourtlyUser = {
            ...prevUser,
            ...profileData,
        };

        if (profileData.roles) {
            localStorage.setItem(`${PLAYCE_USER_ROLES_PREFIX}${prevUser.uid}`, JSON.stringify(profileData.roles));
        }

        return updatedUser;
    });

    if (auth.currentUser && profileData.displayName) {
        updateProfile(auth.currentUser, { displayName: profileData.displayName }).catch(e => console.error("Firebase profile update failed:", e));
    }
  }, []);
  
  const markNotificationAsReadCb = useCallback(async (notificationId: string) => {
    markAppNotificationAsRead(
      notificationId,
      currentUserRef.current?.uid,
      toast,
      setNotifications
    );
  }, [toast, setNotifications]);
  
  const markAllNotificationsAsReadCb = useCallback(async () => {
    markAllAppNotificationsAsRead(
      currentUserRef.current?.uid,
      toast,
      setNotifications
    );
  }, [toast, setNotifications]);
  
  const clearAllNotificationsCb = useCallback(async () => {
    clearAllAppNotifications(currentUserRef.current?.uid, toast, setNotifications);
  }, [toast, setNotifications]);


  const value = {
    currentUser,
    loading,
    profileCompletionPending,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithPhoneNumberFlow,
    confirmPhoneNumberCode,
    logoutUser: fullLogoutSequence,
    updateCourtlyUserRoles,
    updateCourtlyUserProfile,
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

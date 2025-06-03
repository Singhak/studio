
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
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
  type ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // Your Firebase auth instance
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { requestNotificationPermission, onForegroundMessageListener } from '@/lib/firebase/messaging.tsx'; // Import FCM functions - .tsx extension
import { Bell } from 'lucide-react'; // Import the Bell icon

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  profileCompletionPending: boolean;
  setProfileCompletionPending: (pending: boolean) => void;
  signUpWithEmail: (email: string, password: string) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  signInWithPhoneNumberFlow: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  confirmPhoneNumberCode: (confirmationResult: ConfirmationResult, code: string) => Promise<User | null>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCompletionPending, setProfileCompletionPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribeForegroundMessages: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => { // Made async
      setCurrentUser(user);
      if (user) {
        if (localStorage.getItem(`profileCompletionPending_${user.uid}`) === 'true') {
          setProfileCompletionPending(true);
          localStorage.removeItem(`profileCompletionPending_${user.uid}`);
        }
        // Request notification permission and listen for foreground messages
        await requestNotificationPermission(); // Call this to get token and show initial toasts
        unsubscribeForegroundMessages = await onForegroundMessageListener(); // Set up listener
      } else {
        // If user logs out, unsubscribe from foreground messages
        if (unsubscribeForegroundMessages) {
          unsubscribeForegroundMessages();
          unsubscribeForegroundMessages = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeForegroundMessages) {
        unsubscribeForegroundMessages();
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (loading) return;

    if (currentUser && profileCompletionPending && pathname !== '/auth/complete-profile') {
      router.push('/auth/complete-profile');
    } else if (currentUser && !profileCompletionPending) {
      const authPages = ['/login', '/register', '/auth/complete-profile'];
      if (authPages.includes(pathname)) {
        router.push('/dashboard/user');
      }
    } else if (!currentUser) {
      const protectedAuthPages = ['/auth/complete-profile'];
      if (protectedAuthPages.includes(pathname)) {
        router.push('/login');
      }
    }
  }, [currentUser, profileCompletionPending, loading, router, pathname]);


  const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem(`profileCompletionPending_${userCredential.user.uid}`, 'true');
      setProfileCompletionPending(true);
      toast({ title: "Registration Successful!", description: "Please complete your profile." });
      return userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: "destructive", title: "Registration Failed", description: "This email address is already in use. Please try logging in or use a different email address." });
      } else {
        console.error("Error signing up:", error);
        toast({ variant: "destructive", title: "Registration Failed", description: error.message });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setProfileCompletionPending(false);
      toast({ title: "Login Successful!", description: "Welcome back!" });
      return userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        toast({ variant: "destructive", title: "Login Failed", description: "No account found with this email. Please check your email or sign up." });
      } else if (error.code === 'auth/wrong-password') {
        toast({ variant: "destructive", title: "Login Failed", description: "Incorrect password. Please try again." });
      } else {
        console.error("Error signing in:", error);
        toast({ variant: "destructive", title: "Login Failed", description: "An unexpected error occurred. Please try again." });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      localStorage.setItem(`profileCompletionPending_${result.user.uid}`, 'true');
      setProfileCompletionPending(true);
      toast({ title: "Google Sign-In Successful!", description: "Please complete your profile if this is your first time." });
      return result.user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({ variant: "destructive", title: "Google Sign-In Failed", description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setLoading(true);
    try {
      const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
      toast({ title: "Verification Code Sent", description: "Please check your phone for the SMS code." });
      setLoading(false);
      return confirmationResult;
    } catch (error: any) {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
           if(typeof grecaptcha !== 'undefined' && grecaptcha.reset) grecaptcha.reset(widgetId);
        });
      }
      if (error.code === 'auth/operation-not-allowed') {
        toast({ variant: "destructive", title: "Phone Sign-In Error", description: "Phone number sign-in is not enabled for this project. Please enable it in the Firebase console." });
      } else {
        console.error("Error sending SMS for phone auth:", error);
        toast({ variant: "destructive", title: "Phone Sign-In Error", description: error.message });
      }
      setLoading(false);
      return null;
    }
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(code);
      localStorage.setItem(`profileCompletionPending_${userCredential.user.uid}`, 'true');
      setProfileCompletionPending(true);
      toast({ title: "Phone Sign-In Successful!", description: "Please complete your profile." });
      setLoading(false);
      return userCredential.user;
    } catch (error: any) {
      console.error("Error verifying phone code:", error);
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
      setLoading(false);
      return null;
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setProfileCompletionPending(false);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/');
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    profileCompletionPending,
    setProfileCompletionPending,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithPhoneNumberFlow,
    confirmPhoneNumberCode,
    logoutUser,
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

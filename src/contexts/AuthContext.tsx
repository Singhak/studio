
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
  // PhoneAuthProvider, // Not directly used here, but for types in firebase/auth
  RecaptchaVerifier,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  type ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // Your Firebase auth instance
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname

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
  const pathname = usePathname(); // Get current pathname

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && localStorage.getItem(`profileCompletionPending_${user.uid}`) === 'true') {
        setProfileCompletionPending(true);
        localStorage.removeItem(`profileCompletionPending_${user.uid}`); // Clean up
      }
      setLoading(false);
    });
    return () => unsubscribe(); 
  }, []);

  useEffect(() => {
    if (loading) return; // Don't run redirection logic until auth state is resolved

    if (currentUser && profileCompletionPending && pathname !== '/auth/complete-profile') {
      router.push('/auth/complete-profile');
    } else if (currentUser && !profileCompletionPending) {
      const authPages = ['/login', '/register', '/auth/complete-profile'];
      if (authPages.includes(pathname)) {
         // For now, always redirect to user dashboard. 
         // Later, this could check a persisted role.
        router.push('/dashboard/user');
      }
    } else if (!currentUser) {
      const protectedAuthPages = ['/auth/complete-profile'];
      // Basic protection for complete-profile page
      if (protectedAuthPages.includes(pathname)) {
        router.push('/login');
      }
      // More robust protected route handling would be done with middleware or HOCs
    }
  }, [currentUser, profileCompletionPending, loading, router, pathname]);


  const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Instead of setting currentUser directly, onAuthStateChanged will pick it up.
      // Set pending flag, onAuthStateChanged will handle it
      localStorage.setItem(`profileCompletionPending_${userCredential.user.uid}`, 'true');
      setProfileCompletionPending(true); // Also set in-memory for immediate effect if needed
      return userCredential.user;
    } catch (error: any) {
      console.error("Error signing up:", error);
      alert(`Error signing up: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // For existing users, profile completion is not pending unless determined otherwise (e.g., from Firestore)
      setProfileCompletionPending(false); // Assume complete for direct email sign-in
      return userCredential.user;
    } catch (error: any) {
      console.error("Error signing in:", error);
      alert(`Error signing in: ${error.message}`);
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
      // For Google sign-in, assume profile completion is needed if it's a new user
      // This is a simplification. A real app checks if profile data exists in Firestore.
      // For now, we'll always trigger profile completion for Google sign-in for demo.
      localStorage.setItem(`profileCompletionPending_${result.user.uid}`, 'true');
      setProfileCompletionPending(true);
      return result.user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      alert(`Error signing in with Google: ${error.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const signInWithPhoneNumberFlow = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setLoading(true);
    try {
      const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setLoading(false);
      return confirmationResult;
    } catch (error: any) {
      console.error("Error sending SMS for phone auth:", error);
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
           if(typeof grecaptcha !== 'undefined' && grecaptcha.reset) grecaptcha.reset(widgetId);
        });
      }
      alert(`Error with phone sign-in: ${error.message}`);
      setLoading(false);
      return null;
    }
  };

  const confirmPhoneNumberCode = async (confirmationResult: ConfirmationResult, code: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(code);
      // Similar to Google/Email signup, assume profile completion needed.
      localStorage.setItem(`profileCompletionPending_${userCredential.user.uid}`, 'true');
      setProfileCompletionPending(true);
      setLoading(false);
      return userCredential.user;
    } catch (error: any) {
      console.error("Error verifying phone code:", error);
      alert(`Error verifying code: ${error.message}`);
      setLoading(false);
      return null;
    }
  };


  const logoutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setProfileCompletionPending(false); // Reset on logout
      // onAuthStateChanged will set currentUser to null
      router.push('/'); 
    } catch (error: any) {
      console.error("Error signing out:", error);
      alert(`Error signing out: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    profileCompletionPending,
    setProfileCompletionPending, // Make this available to CompleteProfileForm
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

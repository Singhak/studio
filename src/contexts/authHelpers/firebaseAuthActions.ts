// src/contexts/authHelpers/firebaseAuthActions.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  type ConfirmationResult,
  updateProfile,
  signOut,
  type Auth,
  type RecaptchaVerifier,
  type User as FirebaseUser,
} from 'firebase/auth';
import type { ToastFn } from '@/hooks/use-toast'; // Assuming a type definition for the toast function

export const signUpWithEmailFirebase = async (
  auth: Auth,
  email: string,
  password: string,
  name: string,
  toast: ToastFn
): Promise<FirebaseUser | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    await updateProfile(firebaseUser, { displayName: name });
    toast({ toastTitle: "Registration Successful!", toastDescription: "Welcome! Setting up your session..." });
    return firebaseUser;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      toast({ variant: "destructive", toastTitle: "Registration Failed", toastDescription: "This email address is already in use. Please try logging in or use a different email address." });
    } else {
      console.error("Error signing up with Firebase:", error);
      toast({ variant: "destructive", toastTitle: "Registration Failed", toastDescription: error.message });
    }
    return null;
  }
};

export const signInWithEmailFirebase = async (
  auth: Auth,
  email: string,
  password: string,
  toast: ToastFn
): Promise<FirebaseUser | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    toast({ toastTitle: "Login Attempted", toastDescription: "Processing your login..." });
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential') {
      toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: "Invalid email or password." });
    } else {
      console.error("Error signing in with Firebase:", error);
      toast({ variant: "destructive", toastTitle: "Login Failed", toastDescription: error.message || "An unexpected error occurred." });
    }
    return null;
  }
};

export const signInWithGoogleFirebase = async (
  auth: Auth,
  toast: ToastFn
): Promise<FirebaseUser | null> => {
  const provider = new GoogleAuthProvider();
  try {
    const userCredential = await signInWithPopup(auth, provider);
    toast({ toastTitle: "Google Sign-In Attempted", toastDescription: "Processing..." });
    return userCredential.user;
  } catch (error: any) {
    console.error("Error signing in with Google via Firebase:", error);
    toast({ variant: "destructive", toastTitle: "Google Sign-In Failed", toastDescription: error.message });
    return null;
  }
};

export const signInWithPhoneNumberFirebase = async (
  auth: Auth,
  phoneNumber: string,
  appVerifier: RecaptchaVerifier,
  toast: ToastFn
): Promise<ConfirmationResult | null> => {
  try {
    const confirmationResult = await firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
    toast({ toastTitle: "Verification Code Sent", toastDescription: "Please check your phone for the SMS code." });
    return confirmationResult;
  } catch (error: any) {
    if (typeof window !== 'undefined' && window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    }
    if (error.code === 'auth/operation-not-allowed') {
      toast({ variant: "destructive", toastTitle: "Phone Sign-In Error", toastDescription: "Phone number sign-in is not enabled." });
    } else {
      console.error("Error sending SMS for phone auth via Firebase:", error);
      toast({ variant: "destructive", toastTitle: "Phone Sign-In Error", toastDescription: error.message });
    }
    return null;
  }
};

export const confirmPhoneNumberCodeFirebase = async (
  confirmationResult: ConfirmationResult,
  code: string,
  toast: ToastFn
): Promise<FirebaseUser | null> => {
  try {
    const userCredential = await confirmationResult.confirm(code);
    toast({ toastTitle: "Phone Sign-In Successful!", toastDescription: "Processing session..." });
    return userCredential.user;
  } catch (error: any) {
    console.error("Error verifying phone code with Firebase:", error);
    toast({ variant: "destructive", toastTitle: "Verification Failed", toastDescription: error.message });
    return null;
  }
};

export const logoutFirebase = async (
    authInstance: Auth,
    toast: ToastFn,
): Promise<void> => {
    try {
        await signOut(authInstance);
        toast({ toastTitle: "Logged Out", toastDescription: "You have been successfully logged out." });
    } catch (error: any) {
        console.error("Error signing out from Firebase:", error);
        toast({ variant: "destructive", toastTitle: "Logout Failed", toastDescription: error.message });
        // Re-throw or handle as needed, but the core Firebase signout is done.
    }
};

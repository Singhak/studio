
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
// import { useRouter } from 'next/navigation'; // No longer needed for direct navigation here
import React, { useState, useEffect, useCallback } from 'react';
import { RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'; 
import { auth } from '@/lib/firebase/config'; 

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Smartphone, Chrome, ShieldQuestion, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const phoneFormSchema = z.object({
  phoneNumber: z.string().min(10, {message: "Phone number seems too short."}),
});

const verifyCodeFormSchema = z.object({
  verificationCode: z.string().length(6, {message: "Code must be 6 digits."}),
});


export function LoginForm() {
  const { 
    signInWithEmail, 
    signInWithGoogle, 
    signInWithPhoneNumberFlow,
    confirmPhoneNumberCode, 
    currentUser, 
    loading: authLoading,
    profileCompletionPending
  } = useAuth();
  
  const [isLoadingEmail, setIsLoadingEmail] = useState(false); 
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showVerificationCodeInput, setShowVerificationCodeInput] = useState(false);
  const [confirmationResultState, setConfirmationResultState] = useState<ConfirmationResult | null>(null);
  
  const recaptchaContainerId = "recaptcha-container-login";

  useEffect(() => {
    if (!authLoading && currentUser && !profileCompletionPending) {
      // AuthContext will handle redirection
    }
  }, [currentUser, authLoading, profileCompletionPending]);

  const emailForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phoneNumber: "" },
  });

  const verifyCodeForm = useForm<z.infer<typeof verifyCodeFormSchema>>({
    resolver: zodResolver(verifyCodeFormSchema),
    defaultValues: { verificationCode: "" },
  });


  async function onEmailSubmit(values: z.infer<typeof formSchema>) {
    setIsLoadingEmail(true);
    await signInWithEmail(values.email, values.password);
    setIsLoadingEmail(false);
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    await signInWithGoogle();
    setIsGoogleLoading(false);
  }
  
  const setupRecaptcha = useCallback(() => {
    if (!window.recaptchaVerifier && document.getElementById(recaptchaContainerId)) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        'size': 'invisible',
        'callback': (response: any) => {
            console.log("reCAPTCHA solved (invisible):", response);
        },
        'expired-callback': () => {
           alert("reCAPTCHA expired. Please try again.");
           if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = undefined; // Ensure it's re-created on next attempt
           }
        }
      });
      // It's good practice to render it once after creation if it's invisible,
      // though signInWithPhoneNumber often handles this.
      // window.recaptchaVerifier.render().catch((error: any) => {
      //    console.error("Error rendering reCAPTCHA after setup:", error);
      // });
    }
  }, [auth, recaptchaContainerId]); // auth and recaptchaContainerId are stable

  useEffect(() => {
    if (showPhoneInput) {
        const timer = setTimeout(() => {
            if (document.getElementById(recaptchaContainerId)) {
                setupRecaptcha();
            } else {
                console.warn(`Login Form: reCAPTCHA container '${recaptchaContainerId}' not found during initial setup.`);
            }
        }, 100); 
        return () => clearTimeout(timer);
    }
    return () => {
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = undefined; 
        }
    };
  }, [showPhoneInput, setupRecaptcha]);


  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    setIsPhoneLoading(true);
    if (!window.recaptchaVerifier) {
        setupRecaptcha(); // Attempt to set it up if not already
        // Wait a moment for reCAPTCHA to initialize if setupRecaptcha was just called
        await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    if (!window.recaptchaVerifier) {
        alert("reCAPTCHA not initialized. Please wait a moment and try again.");
        setIsPhoneLoading(false);
        return;
    }
    const appVerifier = window.recaptchaVerifier;
    const formattedPhoneNumber = values.phoneNumber.startsWith('+') ? values.phoneNumber : `+1${values.phoneNumber}`;

    const confirmationResult = await signInWithPhoneNumberFlow(formattedPhoneNumber, appVerifier);
    if (confirmationResult) {
      setConfirmationResultState(confirmationResult);
      setShowVerificationCodeInput(true);
      setShowPhoneInput(false);
    }
    setIsPhoneLoading(false);
  }

  async function onVerifyCodeSubmit(values: z.infer<typeof verifyCodeFormSchema>) {
    if (!confirmationResultState) {
      alert("No confirmation context. Please try phone sign-in again.");
      return;
    }
    setIsVerifyingCode(true);
    await confirmPhoneNumberCode(confirmationResultState, values.verificationCode);
    
    setIsVerifyingCode(false);
    setShowVerificationCodeInput(false); 
    setConfirmationResultState(null);
  }

  const currentLoadingState = isLoadingEmail || isPhoneLoading || isGoogleLoading || isVerifyingCode || authLoading;

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center">
          <LogIn className="mr-2 h-6 w-6 text-primary" /> Login to Rally
        </CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {!showPhoneInput && !showVerificationCodeInput && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={currentLoadingState} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={currentLoadingState} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-base" disabled={currentLoadingState}>
                {isLoadingEmail || authLoading && !isGoogleLoading && !isPhoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </form>
          </Form>
        )}

        {showPhoneInput && !showVerificationCodeInput && (
           <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., 2223334444 (US format)" {...field} disabled={currentLoadingState} />
                    </FormControl>
                     <FormDescription>Enter number without country code if US, or with country code (e.g. +44...)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div id={recaptchaContainerId}></div>
              <div className="flex space-x-2">
                <Button type="submit" className="flex-grow text-base" disabled={currentLoadingState}>
                    {isPhoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldQuestion className="mr-2 h-4 w-4" />}
                    Send Verification Code
                </Button>
                <Button variant="outline" onClick={() => {setShowPhoneInput(false); if(window.recaptchaVerifier) window.recaptchaVerifier.clear(); window.recaptchaVerifier = undefined;}} disabled={currentLoadingState}>Cancel</Button>
              </div>
            </form>
          </Form>
        )}

        {showVerificationCodeInput && (
          <Form {...verifyCodeForm}>
            <form onSubmit={verifyCodeForm.handleSubmit(onVerifyCodeSubmit)} className="space-y-4">
              <FormField
                control={verifyCodeForm.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Enter 6-digit code" {...field} disabled={currentLoadingState} maxLength={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-2">
                <Button type="submit" className="flex-grow text-base" disabled={currentLoadingState}>
                  {isVerifyingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Verify & Sign In
                </Button>
                 <Button variant="outline" onClick={() => {setShowVerificationCodeInput(false); setConfirmationResultState(null); setShowPhoneInput(true);}} disabled={currentLoadingState}>Back</Button>
              </div>
            </form>
          </Form>
        )}


        {!showPhoneInput && !showVerificationCodeInput && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <Button variant="outline" className="w-full text-base" onClick={handleGoogleSignIn} disabled={currentLoadingState}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                Sign In with Google
              </Button>
              <Button variant="outline" className="w-full text-base" onClick={() => {setShowPhoneInput(true); emailForm.reset(); }} disabled={currentLoadingState}>
                {isPhoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                Sign In with Phone
              </Button>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 pt-6">
        <Button variant="link" asChild className="text-sm">
          <Link href="/forgot-password">Forgot password?</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/register">Sign up</Link>
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}

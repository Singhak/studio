
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react'; // Added useEffect
import { RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'; // Added ConfirmationResult
import { auth } from '@/lib/firebase/config'; // Added auth import

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Smartphone, Chrome, ShieldQuestion, Loader2 } from "lucide-react"; // Added Smartphone, Chrome, ShieldQuestion, Loader2
import { Separator } from "@/components/ui/separator"; // Added Separator
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

// Schema for phone number input - can be expanded
const phoneFormSchema = z.object({
  phoneNumber: z.string().min(10, {message: "Phone number seems too short."}),
});

const verifyCodeFormSchema = z.object({
  verificationCode: z.string().length(6, {message: "Code must be 6 digits."}),
});


export function LoginForm() {
  const { signInWithEmail, signInWithGoogle, signInWithPhoneNumberFlow, currentUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showVerificationCodeInput, setShowVerificationCodeInput] = useState(false);
  const [confirmationResultState, setConfirmationResultState] = useState<ConfirmationResult | null>(null);
  
  const recaptchaContainerId = "recaptcha-container-login";


  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard/user'); // Or wherever you want to redirect logged-in users
    }
  }, [currentUser, router]);

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
    setIsLoading(true);
    const user = await signInWithEmail(values.email, values.password);
    setIsLoading(false);
    if (user) {
      router.push('/dashboard/user'); // Redirect after successful login
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    const user = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (user) {
      router.push('/dashboard/user');
    }
  }
  
  // Initialize reCAPTCHA
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier && document.getElementById(recaptchaContainerId)) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        'size': 'invisible', // or 'normal'
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          // This callback is for 'normal' size. For 'invisible', it's triggered on button click.
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
           alert("reCAPTCHA expired. Please try again.");
           if ((window as any).recaptchaVerifier) {
                (window as any).recaptchaVerifier.render().then((widgetId: any) => {
                    if(typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
                        grecaptcha.reset(widgetId);
                    }
                });
            }
        }
      });
    }
  };

  useEffect(() => {
    if (showPhoneInput) {
        // Delay setup slightly to ensure DOM element is available
        setTimeout(setupRecaptcha, 100);
    }
    // Cleanup reCAPTCHA on component unmount or when phone input is hidden
    return () => {
        if ((window as any).recaptchaVerifier) {
            (window as any).recaptchaVerifier.clear();
            (window as any).recaptchaVerifier = null;
        }
    };
  }, [showPhoneInput]);


  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    setIsPhoneLoading(true);
    if (!(window as any).recaptchaVerifier) {
        alert("reCAPTCHA not initialized. Please wait a moment and try again.");
        setIsPhoneLoading(false);
        return;
    }
    const appVerifier = (window as any).recaptchaVerifier;
    // Ensure phone number is in E.164 format (e.g. +1XXXXXXXXXX)
    // This is a naive check, a library like libphonenumber-js is better for production
    const formattedPhoneNumber = values.phoneNumber.startsWith('+') ? values.phoneNumber : `+1${values.phoneNumber}`;

    const confirmationResult = await signInWithPhoneNumberFlow(formattedPhoneNumber, appVerifier);
    if (confirmationResult) {
      setConfirmationResultState(confirmationResult);
      setShowVerificationCodeInput(true);
      setShowPhoneInput(false); // Hide phone input, show code input
    }
    setIsPhoneLoading(false);
  }

  async function onVerifyCodeSubmit(values: z.infer<typeof verifyCodeFormSchema>) {
    if (!confirmationResultState) {
      alert("No confirmation context. Please try phone sign-in again.");
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await confirmationResultState.confirm(values.verificationCode);
      // User signed in successfully.
      if (userCredential.user) {
        router.push('/dashboard/user');
      }
    } catch (error: any) {
      alert(`Error verifying code: ${error.message}`);
      // Invalid code
    } finally {
      setIsLoading(false);
      setShowVerificationCodeInput(false);
      setConfirmationResultState(null);
    }
  }


  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center">
          <LogIn className="mr-2 h-6 w-6 text-primary" /> Login to Courtly
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
                      <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} />
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
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-base" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
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
                      <Input type="tel" placeholder="e.g., 2223334444 (US format)" {...field} disabled={isPhoneLoading} />
                    </FormControl>
                     <FormDescription>Enter number without country code if US, or with country code (e.g. +44...)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div id={recaptchaContainerId}></div> {/* reCAPTCHA will render here if 'normal' size or be invisible */}
              <div className="flex space-x-2">
                <Button type="submit" className="flex-grow text-base" disabled={isPhoneLoading}>
                    {isPhoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldQuestion className="mr-2 h-4 w-4" />}
                    Send Verification Code
                </Button>
                <Button variant="outline" onClick={() => {setShowPhoneInput(false); if((window as any).recaptchaVerifier) (window as any).recaptchaVerifier.clear();}}>Cancel</Button>
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
                      <Input type="text" placeholder="Enter 6-digit code" {...field} disabled={isLoading} maxLength={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-2">
                <Button type="submit" className="flex-grow text-base" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Verify & Sign In
                </Button>
                 <Button variant="outline" onClick={() => {setShowVerificationCodeInput(false); setConfirmationResultState(null); setShowPhoneInput(true);}}>Back</Button>
              </div>
            </form>
          </Form>
        )}


        {!showPhoneInput && !showVerificationCodeInput && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <Button variant="outline" className="w-full text-base" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                Sign In with Google
              </Button>
              <Button variant="outline" className="w-full text-base" onClick={() => {setShowPhoneInput(true); emailForm.reset(); }} disabled={isPhoneLoading}>
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

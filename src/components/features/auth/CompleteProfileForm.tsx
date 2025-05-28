
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Loader2 } from "lucide-react";

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  userType: z.enum(["user", "owner"], { required_error: "Please select your account type." }),
  // Add other fields like address if needed later
  // address: z.string().optional(),
});

export function CompleteProfileForm() {
  const { currentUser, setProfileCompletionPending, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If no user is logged in, or auth is still loading, redirect to login.
    // This page should only be accessible if a user just signed up/in.
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: currentUser?.displayName || "",
      userType: "user",
    },
  });

  // Pre-fill name if available from Google auth
  useEffect(() => {
    if (currentUser?.displayName && !form.getValues("fullName")) {
      form.setValue("fullName", currentUser.displayName);
    }
  }, [currentUser, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!currentUser) {
      alert("No user session found. Please log in again.");
      router.push('/login');
      setIsSubmitting(false);
      return;
    }

    console.log("Profile details to save:", {
      uid: currentUser.uid,
      email: currentUser.email,
      phone: currentUser.phoneNumber,
      ...values,
    });
    // In a real app, you'd save this data to Firestore or your backend here.
    // Example: await updateUserProfile(currentUser.uid, values);

    // For prototype, we just log and set completion pending to false
    setProfileCompletionPending(false); 
    setIsSubmitting(false);

    if (values.userType === "owner") {
      router.push('/dashboard/owner/register-club'); // Or /dashboard/owner if club already registered
    } else {
      router.push('/dashboard/user');
    }
  }

  if (authLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center">
          <UserCheck className="mr-2 h-6 w-6 text-primary" /> Complete Your Profile
        </CardTitle>
        <CardDescription>Just a few more details to get you started on Courtly.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Alex Smith" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>How will you primarily use Courtly?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
                      disabled={isSubmitting}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="user" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          As a Player (booking courts)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="owner" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          As a Club Owner (listing my club)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>You can be both! This helps us tailor your initial experience.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Placeholder for address or other fields */}
            {/* 
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main St, Cityville" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> 
            */}

            <Button type="submit" className="w-full text-base" disabled={isSubmitting || authLoading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Save and Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

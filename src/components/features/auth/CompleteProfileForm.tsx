
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
import type { UserRole } from "@/lib/types";

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  userType: z.enum(["user", "owner"], { required_error: "Please select your account type." }),
});

export function CompleteProfileForm() {
  const { currentUser, updateCourtlyUserRoles, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: currentUser?.displayName || "",
      userType: currentUser?.roles?.includes("owner") ? "owner" : "user",
    },
  });

  useEffect(() => {
    if (currentUser?.displayName && !form.getValues("fullName")) {
      form.setValue("fullName", currentUser.displayName);
    }
    if (currentUser?.roles) {
        form.setValue("userType", currentUser.roles.includes("owner") ? "owner" : "user");
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

    let newRolesArray: UserRole[]; // Explicitly typed as UserRole[]
    if (values.userType === "owner") {
      newRolesArray = ['user', 'owner']; // TypeScript will check if 'user' and 'owner' are valid UserRole literals
    } else {
      newRolesArray = ['user']; // TypeScript will check if 'user' is a valid UserRole literal
    }
    
    console.log("Profile details to save (simulated):", {
      uid: currentUser.uid,
      email: currentUser.email,
      phone: currentUser.phoneNumber,
      fullName: values.fullName,
      roles: newRolesArray,
    });

    updateCourtlyUserRoles(newRolesArray); // Pass the correctly typed array, no 'as UserRole[]' cast needed
    setIsSubmitting(false);

    if (newRolesArray.includes("owner")) {
      router.push('/dashboard/owner'); 
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
        <CardDescription>Update your details and primary role preference.</CardDescription>
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
                  <FormLabel>Select your primary account type:</FormLabel>
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
                  <FormDescription>This helps us tailor your experience. You can have multiple roles!</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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

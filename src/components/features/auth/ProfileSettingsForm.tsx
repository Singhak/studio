"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User, KeyRound, ShieldCheck, Trash2, Loader2, Save } from "lucide-react";
import type { UserRole } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  userType: z.enum(["user", "owner"], { required_error: "Please select your account type." }),
});

export function ProfileSettingsForm() {
  const { currentUser, updateCourtlyUserRoles, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      userType: "user",
    },
  });

  // Populate form with current user data once loaded
  useEffect(() => {
    if (currentUser) {
      form.setValue("fullName", currentUser.displayName || "");
      form.setValue("userType", currentUser.roles?.includes("owner") ? "owner" : "user");
    }
  }, [currentUser, form]);

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    setIsSubmitting(true);
    if (!currentUser) {
      toast({ variant: 'destructive', toastTitle: "Error", toastDescription: "No user session found. Please log in again." });
      router.push('/login');
      setIsSubmitting(false);
      return;
    }

    try {
      // This is a simulation. In a real app, you would have separate API calls
      // to update display name and roles.
      // await updateProfile(currentUser, { displayName: values.fullName });

      const newRolesArray: UserRole[] = values.userType === "owner" ? ['user', 'owner'] : ['user'];
      updateCourtlyUserRoles(newRolesArray);

      toast({ toastTitle: "Profile Updated", toastDescription: "Your settings have been saved successfully." });
    } catch (error) {
       toast({ variant: 'destructive', toastTitle: "Update Failed", toastDescription: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (authLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Profile Information Form */}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5"/>Profile Information</CardTitle>
                        <CardDescription>Update your personal details and account type.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                         <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                                <Input value={currentUser.email || "No email provided"} disabled readOnly />
                            </FormControl>
                            <FormDescription>Your email address cannot be changed.</FormDescription>
                        </FormItem>

                        <FormField
                            control={form.control}
                            name="userType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Primary Account Type</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
                                    disabled={isSubmitting}
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="user" /></FormControl>
                                        <FormLabel className="font-normal">Player (booking courts)</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="owner" /></FormControl>
                                        <FormLabel className="font-normal">Club Owner (listing club)</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormDescription>This helps tailor your dashboard experience.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" className="ml-auto" disabled={isSubmitting || authLoading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
        
        {/* Security Section */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5"/>Security</CardTitle>
                <CardDescription>Manage your account's security settings.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Change your account password.</p>
                <Button variant="outline" onClick={() => toast({toastTitle: "Placeholder", toastDescription: "Password change functionality would be here."})}>
                    Change Password
                </Button>
            </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive"><ShieldCheck className="mr-2 h-5 w-5"/>Danger Zone</CardTitle>
                <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove your data from our servers.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => toast({variant: "destructive", toastTitle: "Placeholder", toastDescription: "Account deletion functionality would be here."})}>
                            Continue
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    </div>
  );
}

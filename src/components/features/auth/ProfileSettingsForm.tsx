
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
import { Label } from "@/components/ui/label"; // Direct import for display-only fields
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User, KeyRound, ShieldCheck, Trash2, Loader2, Save, Phone, MessageSquareText, MapPin } from "lucide-react";
import type { UserRole, ClubAddress, CourtlyUserBase } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
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
import { updateUserProfile } from "@/services/userService";


const profileFormSchema = z.object({
    name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    userType: z.enum(["user", "owner"]),
    phoneNumber: z.string().or(z.literal('')),
    isWhatsappSameAsPhone: z.boolean().default(false),
    whatsappNumber: z.string().optional().or(z.literal('')),
    address: z.object({
        street: z.string().optional().or(z.literal('')),
        city: z.string().min(1, "City is required."),
        state: z.string().min(1, "State is required."),
        zipCode: z.string().min(1, "Zip code is required."),
    }).partial().refine(data => {
        // if any part of address is filled, city, state, zip are required
        if (Object.values(data).some(v => v && v.length > 0)) {
            return !!data.city && !!data.state && !!data.zipCode;
        }
        return true;
    }, {
        message: "City, state, and zip code are required if providing an address.",
        path: ["city"], // Show error under the first required field
    }),
})
    .superRefine((data, ctx) => {
        if (!data.isWhatsappSameAsPhone && (!data.phoneNumber || data.phoneNumber.trim() === '')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "phone Number number is required",
                path: ['phoneNumber'],
            });
        }
    });


export function ProfileSettingsForm() {
    const { currentUser, updateCourtlyUserProfile, loading: authLoading } = useAuth();
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
            name: "",
            userType: "user",
            phoneNumber: "",
            isWhatsappSameAsPhone: false,
            whatsappNumber: "",
            address: {
                street: "",
                city: "",
                state: "",
                zipCode: "",
            },
        },
    });

    const isWhatsappSame = form.watch("isWhatsappSameAsPhone");
    const phoneNumberValue = form.watch("phoneNumber");

    useEffect(() => {
        if (isWhatsappSame) {
            form.setValue("whatsappNumber", phoneNumberValue || "");
        }
    }, [isWhatsappSame, phoneNumberValue, form]);

    // Populate form with current user data once loaded
    useEffect(() => {
        if (currentUser) {
            form.setValue("name", currentUser.displayName || "");
            form.setValue("userType", currentUser.roles?.includes("owner") ? "owner" : "user");
            form.setValue("phoneNumber", currentUser.phoneNumber || "");
            form.setValue("whatsappNumber", currentUser.whatsappNumber || "");

            if (currentUser.phoneNumber && currentUser.whatsappNumber === currentUser.phoneNumber) {
                form.setValue("isWhatsappSameAsPhone", true);
            }

            if (currentUser.address) {
                form.setValue("address.street", currentUser.address.street || "");
                form.setValue("address.city", currentUser.address.city || "");
                form.setValue("address.state", currentUser.address.state || "");
                form.setValue("address.zipCode", currentUser.address.zipCode || "");
            }
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
            const newRolesArray: UserRole[] = values.userType === "owner" ? ['user', 'owner'] : ['user'];
            const finalWhatsappNumber = values.isWhatsappSameAsPhone ? values.phoneNumber : values.whatsappNumber;

            const addressIsEmpty = Object.values(values.address).every(val => !val || val.trim() === '');
            const updatedProfile: CourtlyUserBase = {
                name: values.name,
                phoneNumber: values.phoneNumber,
                whatsappNumber: finalWhatsappNumber,
                address: addressIsEmpty ? undefined : values.address as ClubAddress,
            }
            await updateUserProfile(updatedProfile);
            updateCourtlyUserProfile({ ...updatedProfile, displayName: values.name, roles: newRolesArray });
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Profile Information Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" />Profile Information</CardTitle>
                            <CardDescription>Update your personal details and account type.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
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
                            <div className="space-y-2">
                                <Label htmlFor="email-display">Email Address</Label>
                                <Input id="email-display" value={currentUser.email || "No email provided"} disabled readOnly />
                                <p className="text-sm text-muted-foreground">Your email address cannot be changed.</p>
                            </div>
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
                                                    <FormControl>
                                                        <RadioGroupItem value="user" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Player (booking courts)</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="owner" />
                                                    </FormControl>
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
                    </Card>

                    {/* Contact Information Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><Phone className="mr-2 h-5 w-5" />Contact Information</CardTitle>
                            <CardDescription>Manage your contact numbers.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl>
                                            <Input type="tel" placeholder="e.g., +12223334444" {...field} value={field.value ?? ""} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="whatsappNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center"><MessageSquareText className="mr-2 h-4 w-4" />WhatsApp Number</FormLabel>
                                        <FormControl>
                                            <Input type="tel" placeholder="Your WhatsApp number" {...field} value={field.value ?? ""} disabled={isSubmitting || isWhatsappSame} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isWhatsappSameAsPhone"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>WhatsApp number is same as Phone Number</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Address Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5" />Address</CardTitle>
                            <CardDescription>Your primary address. Optional, but helps with local features.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="address.street"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Street Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123 Main St" {...field} value={field.value ?? ""} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="address.city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Anytown" {...field} value={field.value ?? ""} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State / Province</FormLabel>
                                            <FormControl>
                                                <Input placeholder="CA" {...field} value={field.value ?? ""} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.zipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Zip / Postal Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="12345" {...field} value={field.value ?? ""} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" className="ml-auto" disabled={isSubmitting || authLoading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save All Changes
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Security Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5" />Security</CardTitle>
                    <CardDescription>Manage your account's security settings.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Change your account password.</p>
                    <Button variant="outline" onClick={() => toast({ toastTitle: "Placeholder", toastDescription: "Password change functionality would be here." })}>
                        Change Password
                    </Button>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center text-destructive"><ShieldCheck className="mr-2 h-5 w-5" />Danger Zone</CardTitle>
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
                                <AlertDialogAction onClick={() => toast({ variant: "destructive", toastTitle: "Placeholder", toastDescription: "Account deletion functionality would be here." })}>
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

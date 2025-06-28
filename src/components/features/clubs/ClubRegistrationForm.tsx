
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SPORTS_TYPES } from "@/lib/types";
import { PlusCircle, Trash2, Building, MapPin, Info, Phone, Mail, DollarSign, Clock, ImageUp, ShieldQuestion, Palette, Loader2, Globe } from "lucide-react";
import { registerClub } from '@/services/clubService';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import type { Club } from '@/lib/types';
import React, { useState } from 'react';

// Service schema remains but services are not submitted with initial club registration via this form's current API call.
const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required."),
  description: z.string().optional(),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Price must be positive.")
  ),
  durationMinutes: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().int().positive("Duration must be positive.")
  ),
  sport: z.enum(SPORTS_TYPES).optional(),
  serviceImages: z.any().optional(),
});

const formSchema = z.object({
  clubName: z.string().min(3, "Club name must be at least 3 characters."),
  primarySport: z.enum(SPORTS_TYPES, { required_error: "Please select a primary sport for your club." }),
  
  addressStreet: z.string().min(3, "Street is required."),
  addressCity: z.string().min(2, "City is required."),
  addressState: z.string().min(2, "State is required.").max(50),
  addressZipCode: z.string().min(3, "Zip code is required.").max(10),

  locationLongitude: z.preprocess(
    (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && val.trim() !== '') {
        const num = parseFloat(val);
        return isNaN(num) ? undefined : num; // Let z.number handle NaN by making it undefined first
      }
      return undefined;
    },
    z.number({ required_error: "Longitude is required.", invalid_type_error: "Longitude must be a valid number." })
      .min(-180, "Longitude must be between -180 and 180.")
      .max(180, "Longitude must be between -180 and 180.")
  ),
  locationLatitude: z.preprocess(
    (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && val.trim() !== '') {
        const num = parseFloat(val);
        return isNaN(num) ? undefined : num; // Let z.number handle NaN by making it undefined first
      }
      return undefined;
    },
    z.number({ required_error: "Latitude is required.", invalid_type_error: "Latitude must be a valid number." })
      .min(-90, "Latitude must be between -90 and 90.")
      .max(90, "Latitude must be between -90 and 90.")
  ),

  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description too long."),
  contactEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  clubImages: z.any().optional(),
  amenities: z.string().optional(), // Comma-separated string from input
});

export type ClubRegistrationFormValues = z.infer<typeof formSchema>;

export function ClubRegistrationForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClubRegistrationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clubName: "",
      primarySport: undefined,
      addressStreet: "",
      addressCity: "",
      addressState: "",
      addressZipCode: "",
      locationLongitude: undefined, // Keep as undefined initially
      locationLatitude: undefined,  // Keep as undefined initially
      description: "",
      contactEmail: "",
      contactPhone: "",
      clubImages: undefined,
      amenities: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services" as any, // Services not directly submitted, but field array logic can be kept for future
  });

  async function onSubmit(values: ClubRegistrationFormValues) {
    setIsSubmitting(true);

    let imageUrls: string[] = [];
    if (values.clubImages && values.clubImages.length > 0) {
      for (let i = 0; i < values.clubImages.length; i++) {
        const file = values.clubImages[i] as File;
        // Simulate URL: in a real app, upload file and get URL from storage
        imageUrls.push(`https://placehold.co/600x400.png?text=${encodeURIComponent(file.name.substring(0,20))}`);
      }
      console.log("Simulated image URLs for club:", imageUrls);
    }

    const amenitiesArray = values.amenities 
      ? values.amenities.split(',').map(a => a.trim()).filter(a => a.length > 0) 
      : [];

    const clubDataToSubmit = {
      name: values.clubName,
      address: {
        street: values.addressStreet,
        city: values.addressCity,
        state: values.addressState,
        zipCode: values.addressZipCode,
      },
      location: {
        type: "Point" as "Point",
        coordinates: [values.locationLongitude as number, values.locationLatitude as number] as [number, number],
      },
      description: values.description,
      contactEmail: values.contactEmail || undefined,
      contactPhone: values.contactPhone || undefined,
      images: imageUrls,
      amenities: amenitiesArray,
    };

    try {
      const registeredClub = await registerClub(clubDataToSubmit);
      console.log("Club registered successfully via API (simulated):", registeredClub);
      toast({
        toastTitle: "Club Registration Submitted!",
        toastDescription: `${registeredClub.name} has been submitted for registration.`,
      });
      router.push(`/dashboard/owner`); 
    } catch (error) {
      console.error("Club registration API call failed:", error);
      toast({
        variant: "destructive",
        toastTitle: "Club Registration Failed",
        toastDescription: error instanceof Error ? error.message : "An unexpected error occurred during submission.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <Building className="mr-3 h-7 w-7 text-primary" /> Register Your Club
        </CardTitle>
        <CardDescription>
          List your sports club on Playce to reach more players and manage bookings easily.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
                <CardHeader><CardTitle className="text-xl">Basic Information</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                    control={form.control}
                    name="clubName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground"/>Club Name</FormLabel>
                        <FormControl><Input placeholder="e.g., City Sports Arena" {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="primarySport"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center"><ShieldQuestion className="mr-2 h-4 w-4 text-muted-foreground"/>Primary Sport of Club</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select club's main sport" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {SPORTS_TYPES.map(sportType => (
                                <SelectItem key={sportType} value={sportType}>{sportType}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormDescription>This helps categorize your club. Not sent in initial registration API per current spec but good to collect.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Club Description</FormLabel>
                        <FormControl><Textarea placeholder="Tell us about your club, facilities, and atmosphere..." {...field} rows={4} disabled={isSubmitting}/></FormControl>
                        <FormDescription>Max 1000 characters. Highlight what makes your club special.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">Location Details</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="addressStreet"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/>Street Address</FormLabel>
                            <FormControl><Input placeholder="123 Champion Lane" {...field} disabled={isSubmitting}/></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid md:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="addressCity"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl><Input placeholder="Sportsville" {...field} disabled={isSubmitting}/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="addressState"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>State / Province</FormLabel>
                                <FormControl><Input placeholder="CA" {...field} disabled={isSubmitting}/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="addressZipCode"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Zip / Postal Code</FormLabel>
                                <FormControl><Input placeholder="90210" {...field} disabled={isSubmitting}/></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="locationLatitude"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground"/>Latitude</FormLabel>
                                <FormControl><Input type="number" step="any" placeholder="33.9850" {...field} disabled={isSubmitting}/></FormControl>
                                <FormDescription>E.g., 33.9850</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="locationLongitude"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground"/>Longitude</FormLabel>
                                <FormControl><Input type="number" step="any" placeholder="-118.4004" {...field} disabled={isSubmitting}/></FormControl>
                                <FormDescription>E.g., -118.4004</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle className="text-xl">Contact & Other Details</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Contact Email (Optional)</FormLabel>
                            <FormControl><Input type="email" placeholder="contact@yourclub.com" {...field} disabled={isSubmitting}/></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground"/>Contact Phone (Optional)</FormLabel>
                            <FormControl><Input type="tel" placeholder="+1 555 123 4567" {...field} disabled={isSubmitting}/></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>

                    <FormField
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Amenities</FormLabel>
                        <FormControl><Input placeholder="Parking, Cafe, Showers, Pro Shop, WiFi" {...field} disabled={isSubmitting}/></FormControl>
                        <FormDescription>Enter comma-separated list of amenities.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="clubImages"
                    render={({ field: { onChange, value, ...rest } }) => ( 
                        <FormItem>
                        <FormLabel className="flex items-center"><ImageUp className="mr-2 h-4 w-4 text-muted-foreground"/>Club Images</FormLabel>
                        <FormControl>
                            <Input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            onChange={(e) => onChange(e.target.files)} 
                            disabled={isSubmitting}
                            {...rest} 
                            />
                        </FormControl>
                        <FormDescription>Upload one or more images for your club. These will be shown as placeholders.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>
            
            <Card className="border-dashed mt-8 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">Services & Pricing (Separate Step)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Services, their specific details (like sport type if different from club's primary, pricing, duration, service-specific images), and availability are typically managed after the initial club registration.
                  You will be able to add and manage these from your club's dashboard once it's approved.
                </p>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full text-base" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              Register Club
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateClub, type UpdateClubPayload } from '@/services/clubService';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import type { Club } from '@/lib/types';
import React, { useState } from 'react';
import { Loader2, Save, Building, MapPin, Info, Phone, Mail, ImageUp, Globe } from "lucide-react";
import Link from 'next/link';

const editFormSchema = z.object({
  name: z.string().min(3, "Club name must be at least 3 characters."),
  
  address: z.object({
    street: z.string().min(3, "Street is required."),
    city: z.string().min(2, "City is required."),
    state: z.string().min(2, "State is required.").max(50),
    zipCode: z.string().min(3, "Zip code is required.").max(10),
  }),

  location: z.object({
    coordinates: z.tuple([
      z.preprocess(
        (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : val),
        z.number({ invalid_type_error: "Longitude must be a valid number." }).min(-180).max(180)
      ),
      z.preprocess(
        (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : val),
        z.number({ invalid_type_error: "Latitude must be a valid number." }).min(-90).max(90)
      ),
    ]),
  }),

  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description too long."),
  contactEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),
  images: z.any().optional(), // For new FileList uploads
  amenities: z.string().optional(), // Comma-separated string from input
});

export type EditClubFormValues = z.infer<typeof editFormSchema>;

interface EditClubFormProps {
    club: Club;
}

export function EditClubForm({ club }: EditClubFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditClubFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: club.name || "",
      address: {
        street: club.address?.street || "",
        city: club.address?.city || "",
        state: club.address?.state || "",
        zipCode: club.address?.zipCode || "",
      },
      location: {
        coordinates: [
          club.location?.coordinates[0] ?? 0,
          club.location?.coordinates[1] ?? 0,
        ],
      },
      description: club.description || "",
      contactEmail: club.contactEmail || "",
      contactPhone: club.contactPhone || "",
      images: undefined,
      amenities: club.amenities?.join(', ') || "",
    },
  });

  async function onSubmit(values: EditClubFormValues) {
    setIsSubmitting(true);

    let newImageUrls: string[] = [];
    if (values.images && values.images.length > 0) {
      for (let i = 0; i < values.images.length; i++) {
        const file = values.images[i] as File;
        newImageUrls.push(`https://placehold.co/600x400.png?text=${encodeURIComponent(file.name.substring(0,20))}`);
      }
      console.log("Simulated new image URLs:", newImageUrls);
    }

    const amenitiesArray = values.amenities 
      ? values.amenities.split(',').map(a => a.trim()).filter(a => a.length > 0) 
      : [];
      
    const payload: UpdateClubPayload = {
        name: values.name,
        address: values.address,
        location: {
            ...club.location,
            type: "Point",
            coordinates: values.location.coordinates,
        },
        description: values.description,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
        // If new images are uploaded, they replace old ones. Otherwise, keep old ones.
        images: newImageUrls.length > 0 ? newImageUrls : club.images,
        amenities: amenitiesArray,
    };

    try {
      await updateClub(club._id, payload);
      toast({
        toastTitle: "Club Updated!",
        toastDescription: `${payload.name} has been successfully updated.`,
      });
      // Redirect to owner dashboard after successful update
      router.push(`/dashboard/owner`); 
    } catch (error) {
      console.error("Club update failed:", error);
      toast({
        variant: "destructive",
        toastTitle: "Club Update Failed",
        toastDescription: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <Building className="mr-3 h-7 w-7 text-primary" /> Edit {club.name}
        </CardTitle>
        <CardDescription>
          Update your club's information below. Changes will be reflected across Courtly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Club Description</FormLabel>
                  <FormControl><Textarea placeholder="Tell us about your club..." {...field} rows={4} disabled={isSubmitting}/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <fieldset className="space-y-4 p-4 border rounded-md">
                <legend className="text-lg font-medium -ml-1 px-1">Location Details</legend>
                <FormField
                    control={form.control}
                    name="address.street"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/>Street Address</FormLabel>
                        <FormControl><Input placeholder="123 Champion Lane" {...field} disabled={isSubmitting}/></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="address.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Sportsville" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="address.state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="CA" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="address.zipCode" render={({ field }) => (<FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input placeholder="90210" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="location.coordinates.1" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground"/>Latitude</FormLabel><FormControl><Input type="number" step="any" placeholder="33.9850" {...field} value={field.value ?? ''} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="location.coordinates.0" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground"/>Longitude</FormLabel><FormControl><Input type="number" step="any" placeholder="-118.4004" {...field} value={field.value ?? ''} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                </div>
            </fieldset>

            <fieldset className="space-y-4 p-4 border rounded-md">
                 <legend className="text-lg font-medium -ml-1 px-1">Contact & Other Details</legend>
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Contact Email</FormLabel><FormControl><Input type="email" placeholder="contact@yourclub.com" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground"/>Contact Phone</FormLabel><FormControl><Input type="tel" placeholder="+1 555 123 4567" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <FormField
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Amenities</FormLabel>
                        <FormControl><Input placeholder="Parking, Cafe, Showers" {...field} disabled={isSubmitting}/></FormControl>
                        <FormDescription>Enter comma-separated list of amenities.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="images"
                    render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><ImageUp className="mr-2 h-4 w-4 text-muted-foreground"/>Upload New Images</FormLabel>
                        <FormControl><Input type="file" multiple accept="image/*" onChange={(e) => onChange(e.target.files)} disabled={isSubmitting} {...rest} /></FormControl>
                        <FormDescription>Uploading new images will replace the existing ones. Leave empty to keep current images.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </fieldset>
            
            <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" asChild><Link href="/dashboard/owner">Cancel</Link></Button>
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Save Changes
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

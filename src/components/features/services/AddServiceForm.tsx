
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { SPORTS_TYPES, DAYS_OF_WEEK, type SportType, type DayOfWeek, type Service } from "@/lib/types";
import { addClubService, type AddServicePayload } from '@/services/clubService';
import { useToast } from "@/hooks/use-toast";
import React, { useState } from 'react';
import { PlusCircle, ImageUp, Clock, DollarSign, Users, Tag, Info, CalendarDays, Loader2 } from "lucide-react";

const serviceFormSchema = z.object({
  name: z.string().min(3, "Service name must be at least 3 characters."),
  sportType: z.enum(SPORTS_TYPES, { required_error: "Please select a sport type." }),
  hourlyPrice: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : undefined),
    z.number({ invalid_type_error: "Hourly price must be a number." }).positive("Hourly price must be positive.")
  ),
  capacity: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseInt(val, 10) : undefined),
    z.number({ invalid_type_error: "Capacity must be a number." }).int().positive("Capacity must be a positive integer.")
  ),
  description: z.string().max(500, "Description too long.").optional(),
  images: z.any().optional(), // For FileList
  isActive: z.boolean().default(true),
  availableDays: z.array(z.enum(DAYS_OF_WEEK)).min(1, "Select at least one available day."),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
  slotDurationMinutes: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? parseInt(val, 10) : undefined),
    z.number({ invalid_type_error: "Slot duration must be a number." }).int().positive("Slot duration must be positive.")
  ),
}).refine(data => {
    if(data.openingTime && data.closingTime) {
        return data.openingTime < data.closingTime;
    }
    return true;
}, {
    message: "Opening time must be before closing time.",
    path: ["closingTime"],
});


export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface AddServiceFormProps {
  clubId: string;
  onServiceAdded: (newService: Service) => void;
  onClose: () => void;
}

export function AddServiceForm({ clubId, onServiceAdded, onClose }: AddServiceFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      sportType: undefined,
      hourlyPrice: undefined,
      capacity: undefined,
      description: "",
      images: undefined,
      isActive: true,
      availableDays: [...DAYS_OF_WEEK],
      openingTime: "09:00",
      closingTime: "21:00",
      slotDurationMinutes: 60,
    },
  });

  async function onSubmit(values: ServiceFormValues) {
    setIsSubmitting(true);

    let imageUrls: string[] = [];
    if (values.images && values.images.length > 0) {
      for (let i = 0; i < values.images.length; i++) {
        const file = values.images[i] as File;
        imageUrls.push(`https://placehold.co/300x200.png?text=${encodeURIComponent(file.name.substring(0,15))}`);
      }
    }

    const servicePayload: AddServicePayload = {
      club: clubId,
      name: values.name,
      sportType: values.sportType,
      hourlyPrice: values.hourlyPrice,
      capacity: values.capacity,
      description: values.description,
      images: imageUrls,
      isActive: values.isActive,
      availableDays: values.availableDays,
      openingTime: values.openingTime,
      closingTime: values.closingTime,
      slotDurationMinutes: values.slotDurationMinutes,
    };

    try {
      const newService = await addClubService(servicePayload);
      toast({
        toastTitle: "Service Added!",
        toastDescription: `${newService.name} has been successfully added to the club.`,
      });
      onServiceAdded(newService);
      form.reset();
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        toastTitle: "Failed to Add Service",
        toastDescription: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl flex items-center"><PlusCircle className="mr-2 h-6 w-6 text-primary" />Add New Service</DialogTitle>
        <DialogDescription>Fill in the details for the new service offered by your club.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Tag className="mr-2 h-4 w-4 text-muted-foreground"/>Service Name</FormLabel>
                <FormControl><Input placeholder="e.g., Evening Tennis Court" {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sportType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Sport Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {SPORTS_TYPES.map(sport => <SelectItem key={sport} value={sport}>{sport}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hourlyPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>Hourly Price</FormLabel>
                  <FormControl><Input type="number" placeholder="25" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground"/>Capacity (e.g., players)</FormLabel>
                  <FormControl><Input type="number" placeholder="4" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Description (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Details about this service..." {...field} rows={3} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slotDurationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Default Slot Duration (minutes)</FormLabel>
                <FormControl><Input type="number" placeholder="60" {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormItem>
            <FormLabel className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Available Days</FormLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {DAYS_OF_WEEK.map((day) => (
              <FormField
                key={day}
                control={form.control}
                name="availableDays"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(day)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...(field.value || []), day])
                            : field.onChange(field.value?.filter((value) => value !== day));
                        }}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormLabel className="font-normal text-sm">{day}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
            </div>
            <FormMessage>{form.formState.errors.availableDays?.message}</FormMessage>
          </FormItem>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="openingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Opening Time</FormLabel>
                  <FormControl><Input type="time" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="closingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground"/>Closing Time</FormLabel>
                  <FormControl><Input type="time" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="images"
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel className="flex items-center"><ImageUp className="mr-2 h-4 w-4 text-muted-foreground"/>Service Images (Optional)</FormLabel>
                <FormControl>
                  <Input type="file" multiple accept="image/*" onChange={(e) => onChange(e.target.files)} disabled={isSubmitting} {...rest} />
                </FormControl>
                <FormDescription>Upload images for this service. These will be shown as placeholders.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Active Service</FormLabel>
                  <FormDescription>
                    Make this service available for bookings.
                  </FormDescription>
                </div>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                </FormControl>
              </FormItem>
            )}
          />

          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Service
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}


"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Send, Loader2, BellRing, Info } from "lucide-react"; // Added Info icon
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

const promotionFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }).max(100, { message: "Title is too long." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }).max(500, { message: "Message is too long." }),
  // targetLink: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')), // Optional field for a link
});

type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export default function PromotionsPage() {
  const { toast } = useToast();
  const { addNotification } = useAuth(); // Get addNotification from AuthContext
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      title: "",
      message: "",
      // targetLink: "",
    },
  });

  const onSubmit = async (data: PromotionFormValues) => {
    setIsSubmitting(true);
    console.log("Sending promotion:", data);

    // Simulate API call for sending promotion
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Add notification to the owner's list (simulating they get a copy or confirmation)
    addNotification(
      `Promotion Sent: "${data.title}"`, 
      data.message,
      // data.targetLink || undefined // Pass link if provided
    );

    toast({
      toastTitle: "Promotion Sent (Simulation)",
      toastDescription: `Your message "${data.title}" has been 'sent' to all users.`,
      action: (
        <div className="flex items-center text-green-500">
          <BellRing className="mr-2 h-5 w-5" />
          Success
        </div>
      )
    });
    form.reset();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Send Promotion</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="mr-3 h-6 w-6 text-primary" />
            Compose Promotional Notification
          </CardTitle>
          <CardDescription>
            Craft a message to send to all your club users. This will appear as a push notification if they have enabled them.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Weekend Discount Bonanza!" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>
                      A catchy title for your notification (max 100 chars).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Get 20% off all court bookings this weekend! Use code WEEKEND20."
                        rows={5}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      The main content of your notification (max 500 chars).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 
              <FormField
                control={form.control}
                name="targetLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Link (Optional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://yourclub.com/special-offer" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>
                      If this promotion links to a specific page, enter the full URL here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              */}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto ml-auto text-base" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Promotion to All Users
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
       <Card className="mt-8 border-dashed">
        <CardHeader>
            <CardTitle className="text-xl text-muted-foreground flex items-center gap-2">
              <Info className="w-5 h-5" /> Developer Note: Simulation
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                This page simulates sending a promotional notification. Clicking "Send Promotion"
                will add a notification to your own notification list (viewable via the bell icon in the header)
                and show a success toast. 
                <br/><br/>
                In a real application, this would trigger a backend process to send Firebase Cloud Messages (FCM) 
                to all subscribed users. For this prototype, actual push notifications to *other users* are not implemented here.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}

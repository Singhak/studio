
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Booking, Club, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Using Dialog components
import { Label } from "@/components/ui/label";
import { Star, MessageSquare, Award, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockClubs } from "@/lib/mockData"; // To find club name

const reviewFormSchema = z.object({
  clubRating: z.number().min(1, "Club rating is required.").max(5),
  serviceRating: z.number().min(1, "Service rating is required.").max(5),
  comment: z.string().max(500, "Comment cannot exceed 500 characters.").optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  booking: Booking;
  onReviewSubmit: (reviewData: ReviewFormValues) => void; // Callback after successful submission
}

const StarRatingInput = ({
  rating,
  setRating,
  maxStars = 5,
  label,
  icon: IconComponent,
}: {
  rating: number;
  setRating: (rating: number) => void;
  maxStars?: number;
  label: string;
  icon: React.ElementType;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="space-y-1">
      <Label className="flex items-center text-base">
        <IconComponent className="mr-2 h-5 w-5 text-primary" />
        {label}
      </Label>
      <div className="flex items-center space-x-1">
        {[...Array(maxStars)].map((_, index) => {
          const starValue = index + 1;
          return (
            <button
              key={starValue}
              type="button"
              className="focus:outline-none"
              onClick={() => setRating(starValue)}
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`Rate ${starValue} out of ${maxStars} stars`}
            >
              <Star
                className={`h-7 w-7 cursor-pointer transition-colors duration-150
                  ${(hoverRating || rating) >= starValue ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50"}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export function ReviewForm({ booking, onReviewSubmit }: ReviewFormProps) {
  const { toast } = useToast();
  const [clubRating, setClubRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);

  const club = mockClubs.find(c => c.id === booking.clubId);
  const service = club?.services.find(s => s.id === booking.serviceId);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      comment: "",
    },
  });

  const handleSubmit = (data: ReviewFormValues) => {
    if (clubRating === 0 || serviceRating === 0) {
      toast({
        variant: "destructive",
        title: "Missing Ratings",
        description: "Please provide a rating for both the club and the service.",
      });
      return;
    }

    const reviewData = {
      ...data,
      clubRating,
      serviceRating,
      bookingId: booking.id,
      clubId: booking.clubId,
      serviceId: booking.serviceId,
      // userId: currentUser.id, // In a real app, get current user ID
    };
    console.log("Review Submitted:", reviewData);
    toast({
      title: "Review Submitted!",
      description: "Thank you for your feedback.",
    });
    onReviewSubmit(reviewData); // Call the callback, which should close the dialog
    form.reset();
    setClubRating(0);
    setServiceRating(0);
  };

  if (!club || !service) {
    return (
      <div className="p-4 text-center text-destructive">
        Could not load club or service details for this booking.
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">Leave a Review</DialogTitle>
        <DialogDescription>
          Share your experience for your booking at {club.name} for the service: {service.name} on {new Date(booking.date).toLocaleDateString()}.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        <StarRatingInput
          rating={clubRating}
          setRating={setClubRating}
          label={`Rate ${club.name} (Club)`}
          icon={Home}
        />
        {form.formState.errors.clubRating && (
          <p className="text-sm text-destructive">{form.formState.errors.clubRating.message}</p>
        )}

        <StarRatingInput
          rating={serviceRating}
          setRating={setServiceRating}
          label={`Rate your ${service.name} experience`}
          icon={Award}
        />
        {form.formState.errors.serviceRating && (
          <p className="text-sm text-destructive">{form.formState.errors.serviceRating.message}</p>
        )}

        <div>
          <Label htmlFor="comment" className="flex items-center text-base">
            <MessageSquare className="mr-2 h-5 w-5 text-primary" />
            Your Comments (Optional)
          </Label>
          <Textarea
            id="comment"
            placeholder="Tell us more about your experience..."
            {...form.register("comment")}
            rows={4}
            className="mt-1"
          />
          {form.formState.errors.comment && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.comment.message}</p>
          )}
        </div>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Submit Review
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

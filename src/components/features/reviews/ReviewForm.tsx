
"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Star, MessageSquare, Award, Home, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getClubById } from "@/services/clubService";
import { mockServices } from "@/lib/mockData"; // Fallback for service details if not in club

const reviewFormSchema = z.object({
  clubRating: z.number().min(1, "Club rating is required.").max(5),
  serviceRating: z.number().min(1, "Service rating is required.").max(5),
  comment: z.string().max(500, "Comment cannot exceed 500 characters.").optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  booking: Booking;
  onReviewSubmit: (reviewData: ReviewFormValues) => void;
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
  const [clubDetails, setClubDetails] = useState<Club | null>(null);
  const [serviceDetails, setServiceDetails] = useState<Service | null | undefined>(undefined);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      setIsLoadingDetails(true);
      try {
        const fetchedClub = await getClubById(booking.clubId);
        setClubDetails(fetchedClub);
        if (fetchedClub && fetchedClub.services) {
          const foundService = fetchedClub.services.find(s => s._id === booking.serviceId);
          setServiceDetails(foundService);
          if (!foundService) { // Fallback to general mockServices if not found in club's list
            const fallbackService = mockServices.find(s => s._id === booking.serviceId);
            setServiceDetails(fallbackService);
          }
        } else if (fetchedClub) { // Club found but no services array
            const fallbackService = mockServices.find(s => s._id === booking.serviceId);
            setServiceDetails(fallbackService);
        } else {
          setServiceDetails(null); // Club not found
        }
      } catch (error) {
        console.error("Failed to fetch club/service details for review:", error);
        toast({
          variant: "destructive",
          title: "Error loading details",
          description: "Could not load club or service information for this booking.",
        });
      } finally {
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [booking.clubId, booking.serviceId, toast]);

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
    };
    console.log("Review Submitted:", reviewData);
    toast({
      title: "Review Submitted!",
      description: "Thank you for your feedback.",
    });
    onReviewSubmit(reviewData);
    form.reset();
    setClubRating(0);
    setServiceRating(0);
  };

  if (isLoadingDetails) {
    return (
      <div className="p-4 text-center flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground">Loading booking details...</p>
      </div>
    );
  }

  if (!clubDetails) {
    return (
      <div className="p-4 text-center text-destructive">
        Could not load club details for this booking. Please try again later.
      </div>
    );
  }
  if (!serviceDetails) {
     return (
      <div className="p-4 text-center text-destructive">
        Could not load service details for this booking. The service might no longer be offered.
      </div>
    );
  }


  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">Leave a Review</DialogTitle>
        <DialogDescription>
          Share your experience for your booking at {clubDetails.name} for the service: {serviceDetails.name} on {new Date(booking.date).toLocaleDateString()}.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        <StarRatingInput
          rating={clubRating}
          setRating={setClubRating}
          label={`Rate ${clubDetails.name} (Club)`}
          icon={Home}
        />

        <StarRatingInput
          rating={serviceRating}
          setRating={setServiceRating}
          label={`Rate your ${serviceDetails.name} experience`}
          icon={Award}
        />

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
            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Review
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}


"use client";

import { useState, useCallback } from 'react';
import type { Booking, Club, Service, TimeSlot } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookingCalendar } from '@/components/features/booking/BookingCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Calendar, Clock, Edit, Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RescheduleBookingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  club: Club; // Pass the full club object
  service: Service; // Pass the full service object
  onRescheduleConfirm: (newDate: Date, newSlot: TimeSlot) => void;
}

export function RescheduleBookingDialog({
  isOpen,
  onOpenChange,
  booking,
  club,
  service,
  onRescheduleConfirm,
}: RescheduleBookingDialogProps) {
  const { toast } = useToast();
  const [selectedNewDate, setSelectedNewDate] = useState<Date | undefined>(new Date(booking.date)); // Initialize with current booking date
  const [selectedNewSlot, setSelectedNewSlot] = useState<TimeSlot | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleCalendarSlotSelect = useCallback((date: Date | undefined, slot: TimeSlot | null) => {
    setSelectedNewDate(date);
    setSelectedNewSlot(slot);
  }, []);

  const handleConfirm = async () => {
    if (!selectedNewDate || !selectedNewSlot) {
      toast({
        variant: "destructive",
        toastTitle: "Incomplete Selection",
        toastDescription: "Please select a new date and time slot.",
      });
      return;
    }

    // Optional: Add a check to prevent rescheduling to the exact same slot
    if (format(selectedNewDate, 'yyyy-MM-dd') === booking.date && selectedNewSlot.startTime === booking.startTime) {
        toast({
            variant: "default", // Or "destructive" if you want to forbid it
            toastTitle: "Same Slot Selected",
            toastDescription: "You've selected the same date and time as your current booking. Please choose a different slot or cancel.",
        });
        // return; // Uncomment to prevent rescheduling to the same slot
    }


    setIsConfirming(true);
    try {
      // Simulate API call or directly call the parent's handler
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      onRescheduleConfirm(selectedNewDate, selectedNewSlot);
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      toast({
        variant: "destructive",
        toastTitle: "Reschedule Failed",
        toastDescription: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <Edit className="w-6 h-6 mr-2 text-primary" /> Reschedule Booking
          </DialogTitle>
          <DialogDescription>
            Select a new date and time for your booking of "{service.name}" at "{club.name}".
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4 overflow-y-auto flex-grow pr-2">
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Package className="w-5 h-5 mr-2 text-muted-foreground"/>Current Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><strong>Service:</strong> {service.name}</p>
                <p><strong>Club:</strong> {club.name}</p>
                <p className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-muted-foreground"/><strong>Date:</strong> {format(new Date(booking.date), 'EEEE, MMM d, yyyy')}</p>
                <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-muted-foreground"/><strong>Time:</strong> {booking.startTime} - {booking.endTime}</p>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground p-3 border rounded-md bg-accent/20 flex items-start gap-2">
              <AlertTriangle className="w-8 h-8 text-primary mt-0.5 shrink-0" />
              <span>
                Rescheduling will send a request to the club owner. Your booking status will become 'pending' until the owner confirms the new time.
              </span>
            </p>
          </div>

          <BookingCalendar
            selectedService={service} // Pass the service for which to show availability
            onSlotSelect={handleCalendarSlotSelect}
          />
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isConfirming}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedNewDate || !selectedNewSlot || isConfirming}
          >
            {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4"/>}
            Request Reschedule to New Slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


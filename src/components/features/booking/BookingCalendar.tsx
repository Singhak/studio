
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Loader2, AlertTriangle } from 'lucide-react';
import type { TimeSlot, TimeSlotStatus, Service, DayOfWeek, Booking } from '@/lib/types';
import { getBookingsForServiceOnDate } from '@/services/bookingService';
import { format as formatDateFns, parse, addMinutes, isBefore, isEqual, getDay, startOfToday as getStartOfToday } from 'date-fns';
import type { Matcher } from 'react-day-picker';


interface BookingCalendarProps {
  selectedService: Service | null;
  onSlotSelect?: (date: Date | undefined, slot: TimeSlot | null) => void;
}

const legendItems = [
  { label: 'Selected', className: 'bg-primary w-3.5 h-3.5 rounded-sm mr-1.5 shrink-0' },
  { label: 'Available', className: 'border border-input bg-background w-3.5 h-3.5 rounded-sm mr-1.5 shrink-0' },
  { label: 'Pending', className: 'bg-secondary w-3.5 h-3.5 rounded-sm opacity-80 mr-1.5 shrink-0' },
  { label: 'Booked', className: 'bg-muted w-3.5 h-3.5 rounded-sm opacity-70 mr-1.5 shrink-0' },
];


export function BookingCalendar({ selectedService, onSlotSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [internalSelectedTimeSlot, setInternalSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [disabledDaysConfig, setDisabledDaysConfig] = useState<Matcher | undefined>();
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  useEffect(() => {
    setClientLoaded(true);
    const startOfTodayDate = getStartOfToday();
    setDisabledDaysConfig({ before: startOfTodayDate });
  }, []);

  useEffect(() => {
    if (clientLoaded && selectedService) {
      const today = new Date();
      // Only reset date if it's not already today, or if it's a new service.
      // This effect is tricky with onSlotSelect, so let's simplify:
      // When service changes, always reset date to today.
      setSelectedDate(today);
      setInternalSelectedTimeSlot(null);
      if (onSlotSelect) {
        onSlotSelect(today, null);
      }
    } else if (!selectedService) {
      setSelectedDate(undefined);
      setTimeSlots([]);
      setInternalSelectedTimeSlot(null);
      setSlotError(null);
      if (onSlotSelect) {
        onSlotSelect(undefined, null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService, clientLoaded]);

  useEffect(() => {
    if (!clientLoaded || !selectedDate || !selectedService) {
      if (clientLoaded && selectedService && !selectedDate) {
         setTimeSlots([]);
         setSlotError(null);
      } else if (clientLoaded && !selectedService) {
        setTimeSlots([]);
        setSlotError(null);
      }
      setIsLoadingSlots(false);
      return;
    }

    const generateAndSetTimeSlots = async () => {
      setIsLoadingSlots(true);
      setSlotError(null);
      setTimeSlots([]); 

      const serviceDayIndex = getDay(selectedDate);
      const serviceAvailableDaysMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const serviceDayString = Object.keys(serviceAvailableDaysMap).find(key => serviceAvailableDaysMap[key] === serviceDayIndex) as DayOfWeek | undefined;

      if (!serviceDayString || !selectedService.availableDays?.includes(serviceDayString)) {
        setSlotError(`${selectedService.name} is not available on ${formatDateFns(selectedDate, 'EEEE')}.`);
        setTimeSlots([]);
        setIsLoadingSlots(false);
        return;
      }

      try {
        const dateString = formatDateFns(selectedDate, 'yyyy-MM-dd');
        const existingBookings = await getBookingsForServiceOnDate(selectedService._id, dateString);

        const openingTimeStr = selectedService.openingTime || "00:00";
        const closingTimeStr = selectedService.closingTime || "23:59";
        const slotDuration = selectedService.slotDurationMinutes || 60;

        const generatedSlots: TimeSlot[] = [];
        let currentTime = parse(openingTimeStr, 'HH:mm', selectedDate);
        const closingTime = parse(closingTimeStr, 'HH:mm', selectedDate);


        while (isBefore(currentTime, closingTime)) {
          const slotStart = new Date(currentTime);
          const slotEnd = addMinutes(slotStart, slotDuration);

          if (isBefore(slotEnd, closingTime) || isEqual(slotEnd, closingTime)) {
            const startTimeFormatted = formatDateFns(slotStart, 'HH:mm');
            const endTimeFormatted = formatDateFns(slotEnd, 'HH:mm');

            let status: TimeSlotStatus = 'available';
            const conflictingBooking = existingBookings.find(booking => {
              return booking.startTime === startTimeFormatted && (booking.status === 'confirmed' || booking.status === 'pending');
            });

            if (conflictingBooking) {
              status = conflictingBooking.status;
            }
            generatedSlots.push({ startTime: startTimeFormatted, endTime: endTimeFormatted, status });
          }
          currentTime = addMinutes(currentTime, slotDuration);
        }
        setTimeSlots(generatedSlots);
        if(generatedSlots.length === 0 && isBefore(parse(openingTimeStr, 'HH:mm', selectedDate), parse(closingTimeStr, 'HH:mm', selectedDate))) {
            setSlotError(`No time slots could be generated for ${selectedService.name} between ${openingTimeStr} and ${closingTimeStr} on this day.`);
        } else if (generatedSlots.length === 0) {
             setSlotError(`${selectedService.name} may not have operating hours defined that allow for slot generation on this day.`);
        }

      } catch (error) {
        console.error("Error fetching or generating time slots:", error);
        setSlotError(error instanceof Error ? error.message : "Failed to load time slots.");
        setTimeSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    generateAndSetTimeSlots();
    if (internalSelectedTimeSlot) {
        setInternalSelectedTimeSlot(null);
        if (onSlotSelect) {
            onSlotSelect(selectedDate, null);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService, clientLoaded]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setInternalSelectedTimeSlot(null);
    if (onSlotSelect) {
      onSlotSelect(date, null);
    }
  };

  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (slot.status === 'available') {
      setInternalSelectedTimeSlot(slot);
      if (onSlotSelect) {
        onSlotSelect(selectedDate, slot);
      }
    }
  };

  const getSlotButtonProps = (slot: TimeSlot) => {
    let variant: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive" = "outline";
    let isDisabled = false;
    let buttonClassName = "w-full";
    const buttonText = slot.startTime; // Always just the time

    if (internalSelectedTimeSlot?.startTime === slot.startTime && slot.status === 'available') {
      variant = 'default'; // This is the primary color for selected available slot
    } else {
      switch (slot.status) {
        case 'available':
          variant = 'outline'; // Standard outline for available, unselected
          isDisabled = false;
          break;
        case 'pending':
          variant = 'secondary'; // Use secondary for pending
          isDisabled = true;
          buttonClassName += " opacity-80";
          break;
        case 'confirmed':
          variant = 'default'; // Base variant, but use specific classes for styling
          isDisabled = true;
          // More specific styling for "booked" to make it look clearly unavailable but not error-like
          buttonClassName += " bg-muted text-muted-foreground hover:bg-muted/90 focus:bg-muted/90 opacity-70 cursor-not-allowed !ring-0 !ring-offset-0";
          break;
        case 'in-progress': // Should not typically occur with current logic
          variant = 'secondary';
          isDisabled = true;
          buttonClassName += " opacity-70 animate-pulse";
          break;
        case 'unavailable': // For slots explicitly marked, or outside hours by logic
          variant = 'outline';
          isDisabled = true;
          buttonClassName += " text-muted-foreground line-through";
          break;
      }
    }
    return { variant, isDisabled, buttonClassName, buttonText };
  };


  if (!clientLoaded) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary" /> Select Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary" /> Select Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedService ? (
            <p className="text-muted-foreground text-center py-4">Please select a service first to see availability.</p>
          ) : (
            <>
              <div className="overflow-x-auto flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  className="rounded-md border"
                  disabled={disabledDaysConfig}
                  captionLayout="buttons"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1 text-foreground">
                  {selectedDate ? `Slots for ${formatDateFns(selectedDate, 'MMM d, yyyy')}` : 'Select a date'}
                </h3>

                {selectedDate && (timeSlots.length > 0 || isLoadingSlots || slotError) && (
                    <div className="mb-3 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground mr-1">Legend:</span>
                      {legendItems.map(item => (
                        <div key={item.label} className="flex items-center">
                          <div className={item.className} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                )}

                {isLoadingSlots ? (
                  <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Loading slots...</span></div>
                ) : slotError ? (
                  <div className="text-destructive text-center p-4 flex flex-col items-center gap-2">
                    <AlertTriangle size={24} />
                    <span>{slotError}</span>
                  </div>
                ) : selectedDate && timeSlots.length > 0 ? (
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
                    {timeSlots.map((slot, index) => {
                      const { variant, isDisabled, buttonClassName, buttonText } = getSlotButtonProps(slot);
                      const actualButton = (
                        <Button
                          variant={variant}
                          disabled={isDisabled}
                          onClick={() => handleTimeSlotClick(slot)}
                          className={buttonClassName}
                        >
                          {buttonText}
                        </Button>
                      );
                      return (
                        <Tooltip key={`${slot.startTime}-${index}`}>
                          <TooltipTrigger asChild>
                            {isDisabled && slot.status !== 'available' ? ( // Ensure only non-available disabled slots use span wrapper for tooltip
                              <span className="inline-block w-full" tabIndex={0}>
                                {actualButton}
                              </span>
                            ) : (
                              actualButton
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="capitalize">{slot.status}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : selectedDate ? (
                   <p className="text-muted-foreground text-center p-4">No slots available for this service on the selected date.</p>
                ) : (
                  <p className="text-muted-foreground text-center p-4">Please select a date to view available time slots for {selectedService.name}.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}


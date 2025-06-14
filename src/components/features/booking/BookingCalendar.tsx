
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

export function BookingCalendar({ selectedService, onSlotSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()); // Default to today
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

  // Effect to reset date to today when selectedService changes
  useEffect(() => {
    if (clientLoaded && selectedService) {
      const today = new Date();
      setSelectedDate(today);
      setInternalSelectedTimeSlot(null);
      if (onSlotSelect) {
        onSlotSelect(today, null);
      }
    } else if (!selectedService) {
      // If service is deselected, clear date and slots
      setSelectedDate(undefined);
      setTimeSlots([]);
      setInternalSelectedTimeSlot(null);
      setSlotError(null);
      if (onSlotSelect) {
        onSlotSelect(undefined, null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService, clientLoaded]); // onSlotSelect is a callback, should be stable or wrapped in useCallback if passed from parent

  // Effect to fetch/generate time slots when date or service changes
  useEffect(() => {
    if (!clientLoaded || !selectedDate || !selectedService) {
      if (clientLoaded && selectedService && !selectedDate) { // Service selected, but date cleared (e.g. by service change)
         setTimeSlots([]); // Clear previous slots
         setSlotError(null); // Clear previous errors specific to a date
      } else if (clientLoaded && !selectedService) { // No service selected
        setTimeSlots([]);
        setSlotError(null);
      }
      setIsLoadingSlots(false);
      return;
    }

    const generateAndSetTimeSlots = async () => {
      setIsLoadingSlots(true);
      setSlotError(null);
      setTimeSlots([]); // Clear previous slots before fetching new ones

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
    // Reset selected slot when date or service changes, but before new slots are loaded
    // The parent is already informed when the service changes (in the other useEffect)
    // and when the date changes (in handleDateChange)
    if (internalSelectedTimeSlot) {
        setInternalSelectedTimeSlot(null);
        if (onSlotSelect) {
            onSlotSelect(selectedDate, null);
        }
    }


  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService, clientLoaded]); // onSlotSelect should be stable

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
    let buttonText = slot.startTime;

    switch (slot.status) {
      case 'available':
        variant = internalSelectedTimeSlot?.startTime === slot.startTime ? 'default' : 'outline';
        isDisabled = false;
        break;
      case 'pending':
        variant = 'secondary';
        isDisabled = true;
        buttonClassName += " opacity-80";
        buttonText = `${slot.startTime} (Pending)`;
        break;
      case 'confirmed':
        variant = 'default';
        isDisabled = true;
        buttonClassName += " opacity-60 bg-muted-foreground/30 text-muted-foreground hover:bg-muted-foreground/30";
        buttonText = `${slot.startTime} (Booked)`;
        break;
      case 'in-progress':
        variant = 'secondary';
        isDisabled = true;
        buttonClassName += " opacity-70 animate-pulse";
        break;
      case 'unavailable':
        variant = 'outline';
        isDisabled = true;
        buttonClassName += " text-muted-foreground line-through";
        break;
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
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  {selectedDate ? `Slots for ${formatDateFns(selectedDate, 'MMM d, yyyy')}` : 'Select a date'}
                </h3>
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
                            {isDisabled ? (
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

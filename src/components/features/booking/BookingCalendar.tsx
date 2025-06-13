
"use client";

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Loader2 } from 'lucide-react';
import type { TimeSlot, TimeSlotStatus } from '@/lib/types';
import { format } from 'date-fns';
import type { Matcher } from 'react-day-picker';

const allStatuses: TimeSlotStatus[] = ['available', 'pending', 'confirmed', 'in-progress', 'unavailable'];

// Mock time slots generation
const generateMockTimeSlots = (date?: Date): TimeSlot[] => {
  if (!date) return [];
  const day = date.getDay();
  const baseSlotsCount = (day === 0 || day === 6) ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 8) + 5;
  const slots: TimeSlot[] = [];
  const generatedStartTimes = new Set<string>();
  let currentHour = 9;

  for (let i = 0; i < baseSlotsCount; i++) {
    if (currentHour >= 21) break;
    const startTime = `${currentHour.toString().padStart(2, '0')}:00`;
    if (generatedStartTimes.has(startTime)) {
      currentHour += (Math.random() > 0.3 ? 1 : 2);
      continue;
    }
    generatedStartTimes.add(startTime);
    const endTime = `${(currentHour + 1).toString().padStart(2, '0')}:00`;
    const randomIndex = Math.floor(Math.random() * allStatuses.length);
    const status = allStatuses[randomIndex];
    slots.push({ startTime, endTime, status });
    currentHour += (Math.random() > 0.3 ? 1 : 2);
  }
  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
};

interface BookingCalendarProps {
  onSlotSelect?: (date: Date | undefined, slot: TimeSlot | null) => void;
}

export function BookingCalendar({ onSlotSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [internalSelectedTimeSlot, setInternalSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [disabledDaysConfig, setDisabledDaysConfig] = useState<Matcher | undefined>();

  useEffect(() => {
    setClientLoaded(true);
    const today = new Date();
    setSelectedDate(today); // Set internal default date
    if (onSlotSelect) {
      // Inform parent of initial default date, no slot selected yet
      onSlotSelect(today, null);
    }
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setDisabledDaysConfig({ before: startOfToday });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientLoaded, onSlotSelect]); // onSlotSelect is stable from parent

  // Effect to update time slots when internal selectedDate changes
  useEffect(() => {
    if (clientLoaded && selectedDate) {
      setTimeSlots(generateMockTimeSlots(selectedDate));
      setInternalSelectedTimeSlot(null); // Reset internal visual selection of slot
      // Note: We do NOT call onSlotSelect(selectedDate, null) here anymore.
      // That call is now tied to explicit date changes (handleDateChange or initial load).
    } else if (clientLoaded && !selectedDate) {
      setTimeSlots([]);
      setInternalSelectedTimeSlot(null);
    }
  }, [selectedDate, clientLoaded]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date); // Update internal date
    setInternalSelectedTimeSlot(null); // Reset internal slot styling for the new date
    if (onSlotSelect) {
      // Inform parent: date changed, so no slot is selected for this new date.
      onSlotSelect(date, null);
    }
  };

  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (slot.status === 'available') {
      setInternalSelectedTimeSlot(slot); // Update internal slot for styling
      if (onSlotSelect) {
        // Inform parent: this slot is now selected for the current selectedDate.
        onSlotSelect(selectedDate, slot);
      }
    }
  };

  if (!clientLoaded || selectedDate === undefined) {
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

  const getSlotButtonProps = (slot: TimeSlot) => {
    let variant: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive" = "outline";
    let isDisabled = false;
    let buttonClassName = "w-full";
    let buttonText = slot.startTime;

    switch (slot.status) {
      case 'available':
        // Use internalSelectedTimeSlot for styling the button's selected state
        variant = internalSelectedTimeSlot?.startTime === slot.startTime ? 'default' : 'outline';
        isDisabled = false;
        break;
      case 'pending':
        variant = 'secondary';
        isDisabled = true;
        buttonClassName += " opacity-80";
        break;
      case 'confirmed':
        variant = 'default';
        isDisabled = true;
        buttonClassName += " opacity-80";
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

  return (
    <TooltipProvider>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary" /> Select Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange} // This now correctly calls onSlotSelect(newDate, null)
              className="rounded-md border"
              disabled={disabledDaysConfig}
              captionLayout="buttons"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              Available Slots for {selectedDate ? format(selectedDate, 'MMM d, yyyy') : '...'}
            </h3>
            {timeSlots.length > 0 ? (
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
            ) : (
              <p className="text-muted-foreground">
                {selectedDate ? "No slots available for this date." : "Please select a date to see available slots."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

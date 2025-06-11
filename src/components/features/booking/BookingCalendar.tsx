
"use client";

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button'; // Removed buttonVariants
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Loader2 } from 'lucide-react';
import type { TimeSlot, TimeSlotStatus } from '@/lib/types';
import { format } from 'date-fns';
import type { DateMatcher } from 'react-day-picker';
// import { cn } from '@/lib/utils'; // Not used directly here

const allStatuses: TimeSlotStatus[] = ['available', 'pending', 'confirmed', 'in-progress', 'unavailable'];

// Mock time slots generation
const generateMockTimeSlots = (date?: Date): TimeSlot[] => {
  if (!date) return [];
  const day = date.getDay();
  // Less slots on weekends for this mock data
  const baseSlotsCount = (day === 0 || day === 6) ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 8) + 5;
  const slots: TimeSlot[] = [];

  for (let i = 0; i < baseSlotsCount; i++) {
    const hour = 9 + i * (Math.random() > 0.5 ? 1 : 2); // Vary interval a bit
    if (hour >= 21) break;

    const randomIndex = Math.floor(Math.random() * allStatuses.length);
    const status = allStatuses[randomIndex];
    
    slots.push({
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      status: status,
    });
  }
  return slots.sort((a,b) => a.startTime.localeCompare(b.startTime));
};

interface BookingCalendarProps {
  // Callback to inform parent about selection changes
  onSlotSelect?: (date: Date | undefined, slot: TimeSlot | null) => void;
}

export function BookingCalendar({ onSlotSelect }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [disabledDaysConfig, setDisabledDaysConfig] = useState<DateMatcher | undefined>();

  useEffect(() => {
    setClientLoaded(true);
    const today = new Date();
    setSelectedDate(today); 
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setDisabledDaysConfig({ before: startOfToday });
  }, []); 

  useEffect(() => {
    if (clientLoaded && selectedDate) {
      setTimeSlots(generateMockTimeSlots(selectedDate));
      setSelectedTimeSlot(null); // Reset selected slot when date changes
      if (onSlotSelect) onSlotSelect(selectedDate, null);
    } else if (clientLoaded && !selectedDate) {
      setTimeSlots([]);
      setSelectedTimeSlot(null);
      if (onSlotSelect) onSlotSelect(undefined, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, clientLoaded]); // onSlotSelect is not included to prevent re-triggering on parent re-render

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    // onSlotSelect will be called by the useEffect above
  };

  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (slot.status === 'available') {
      setSelectedTimeSlot(slot);
      if (onSlotSelect) onSlotSelect(selectedDate, slot);
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
        variant = selectedTimeSlot?.startTime === slot.startTime ? 'default' : 'outline';
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
              onSelect={handleDateChange}
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
                {timeSlots.map((slot) => {
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
                    <Tooltip key={slot.startTime}>
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

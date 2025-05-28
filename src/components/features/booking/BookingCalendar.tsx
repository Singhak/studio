
"use client";

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';
import type { TimeSlot } from '@/lib/types';
import { format } from 'date-fns';
import type { DateMatcher } from 'react-day-picker';

// Mock time slots generation
const generateMockTimeSlots = (date?: Date): TimeSlot[] => {
  // This function uses Math.random(), so it must be called client-side after hydration
  if (!date) return [];
  const day = date.getDay(); // Sunday - Saturday : 0 - 6
  // Fewer slots on weekends, more on weekdays for variety
  const baseSlots = day === 0 || day === 6 ? 4 : 8;
  const slots: TimeSlot[] = [];
  for (let i = 0; i < baseSlots; i++) {
    const hour = 9 + i * (day === 0 || day === 6 ? 2 : 1) ; // More spread out on weekends
    if (hour >= 21) break; // Don't go too late
    slots.push({
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      isAvailable: Math.random() > 0.3, // Random availability
    });
  }
  return slots;
};


export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [disabledDaysConfig, setDisabledDaysConfig] = useState<DateMatcher | undefined>();

  useEffect(() => {
    setClientLoaded(true);
    const today = new Date();
    setSelectedDate(today); 
    // Disable all dates before today
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setDisabledDaysConfig({ before: startOfToday });
  }, []); 

  useEffect(() => {
    if (clientLoaded && selectedDate) {
      setTimeSlots(generateMockTimeSlots(selectedDate));
      setSelectedTimeSlot(null); 
    } else if (clientLoaded && !selectedDate) {
      setTimeSlots([]);
      setSelectedTimeSlot(null);
    }
  }, [selectedDate, clientLoaded]);

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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Clock className="w-5 h-5 mr-2 text-primary" /> Select Date & Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto flex justify-center"> {/* Centering the calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
            }}
            className="rounded-md border" 
            disabled={disabledDaysConfig}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            Available Slots for {selectedDate ? format(selectedDate, 'MMM d, yyyy') : '...'}
          </h3>
          {timeSlots.length > 0 ? (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
              {timeSlots.map((slot) => (
                <Button
                  key={slot.startTime}
                  variant={selectedTimeSlot?.startTime === slot.startTime ? 'default' : 'outline'}
                  disabled={!slot.isAvailable}
                  onClick={() => setSelectedTimeSlot(slot)}
                  className={`w-full ${!slot.isAvailable ? 'text-muted-foreground line-through' : ''}`}
                >
                  {slot.startTime}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {selectedDate ? "No slots available for this date." : "Please select a date to see available slots."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { TimeSlot } from '@/lib/types';

// Mock time slots generation
const generateMockTimeSlots = (date?: Date): TimeSlot[] => {
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
    if (selectedDate) {
      setTimeSlots(generateMockTimeSlots(selectedDate));
    }
  }, [selectedDate]);

  if (!clientLoaded) {
    // Render a placeholder or null on the server to avoid hydration mismatch for new Date()
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Select Date & Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-muted-foreground">Loading calendar...</div>
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
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border p-0"
            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} // Disable past dates
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            Available Slots for {selectedDate ? selectedDate.toLocaleDateString() : '...'}
          </h3>
          {timeSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
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
            <p className="text-muted-foreground">No slots available for this date, or select a date.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

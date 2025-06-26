
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Booking, Club, Service } from '@/lib/types';
import { getLoggedInOwnerClubs } from '@/services/clubService';
import { getBookingsByClubId, blockTimeSlot, unblockTimeSlot } from '@/services/bookingService';
import { getServicesByClubId } from '@/services/clubService';

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { format, parse, addMinutes, isBefore, isEqual, getDay, startOfToday } from 'date-fns';
import type { Matcher } from 'react-day-picker';

import { ArrowLeft, CalendarClock, Loader2, AlertTriangle, RefreshCw, Club as ClubIcon, Package, Lock, Unlock, XCircle, CheckCircle, Clock } from "lucide-react";

interface TimeSlotForOwner extends Omit<Booking, 'id' | 'userId' | 'clubId' | 'serviceId' | 'date' | 'totalPrice' | 'createdAt'> {
  id?: string; // Optional id if it's an existing booking/block
  displayStatus: 'available' | 'booked' | 'pending' | 'blocked';
}

export default function ManageAvailabilityPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const [timeSlots, setTimeSlots] = useState<TimeSlotForOwner[]>([]);

  const [isLoading, setIsLoading] = useState({ clubs: true, services: false, slots: false });
  const [error, setError] = useState({ clubs: '', services: '', slots: '' });

  // Fetch owner's clubs on mount
  useEffect(() => {
    if (authLoading || !currentUser) return;
    const fetchClubs = async () => {
      setIsLoading(prev => ({ ...prev, clubs: true }));
      try {
        const ownerClubs = await getLoggedInOwnerClubs();
        setClubs(ownerClubs);
        if (ownerClubs.length > 0) {
          setSelectedClubId(ownerClubs[0]._id);
        }
      } catch (err) {
        setError(prev => ({ ...prev, clubs: "Failed to load your clubs." }));
      } finally {
        setIsLoading(prev => ({ ...prev, clubs: false }));
      }
    };
    fetchClubs();
  }, [currentUser, authLoading]);

  // Fetch services when club changes
  useEffect(() => {
    if (!selectedClubId) {
      setServices([]);
      setSelectedServiceId('');
      return;
    }
    const fetchServices = async () => {
      setIsLoading(prev => ({ ...prev, services: true }));
      setError(prev => ({ ...prev, services: '' }));
      try {
        const clubServices = await getServicesByClubId(selectedClubId);
        setServices(clubServices);
        if (clubServices.length > 0) {
          setSelectedServiceId(clubServices[0]._id);
        } else {
          setSelectedServiceId('');
        }
      } catch (err) {
        setError(prev => ({ ...prev, services: "Failed to load services for this club." }));
      } finally {
        setIsLoading(prev => ({ ...prev, services: false }));
      }
    };
    fetchServices();
  }, [selectedClubId]);

  const selectedService = useMemo(() => services.find(s => s._id === selectedServiceId), [services, selectedServiceId]);

  const generateAndSetTimeSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) {
      setTimeSlots([]);
      return;
    }

    setIsLoading(prev => ({ ...prev, slots: true }));
    setError(prev => ({ ...prev, slots: '' }));

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingBookings = await getBookingsByClubId(selectedClubId);
      const relevantBookings = existingBookings.filter(b => b.service._id === selectedService._id && b.bookingDate === dateString);

      const openingTimeStr = selectedService.openingTime || "00:00";
      const closingTimeStr = selectedService.closingTime || "23:59";
      const slotDuration = selectedService.slotDurationMinutes || 60;

      const generatedSlots: TimeSlotForOwner[] = [];
      let currentTime = parse(openingTimeStr, 'HH:mm', selectedDate);
      const closingTime = parse(closingTimeStr, 'HH:mm', selectedDate);

      while (isBefore(currentTime, closingTime)) {
        const slotStart = new Date(currentTime);
        const slotEnd = addMinutes(slotStart, slotDuration);

        if (isBefore(slotEnd, closingTime) || isEqual(slotEnd, closingTime)) {
          const startTimeFormatted = format(slotStart, 'HH:mm');
          const endTimeFormatted = format(slotEnd, 'HH:mm');

          const conflictingBooking = relevantBookings.find(b => b.startTime === startTimeFormatted);

          // if (conflictingBooking) {
          //   generatedSlots.push({
          //     id: conflictingBooking._id,
          //     startTime: startTimeFormatted,
          //     endTime: endTimeFormatted,
          //     status: conflictingBooking.status,
          //     displayStatus: conflictingBooking.status === 'blocked' ? 'blocked' : (conflictingBooking.status === 'pending' ? 'pending' : 'booked'),
          //   });
          // } else {
          //   generatedSlots.push({
          //     startTime: startTimeFormatted,
          //     endTime: endTimeFormatted,
          //     status: 'pending', // Placeholder
          //     displayStatus: 'available',
          //   });
          // }
        }
        currentTime = addMinutes(currentTime, slotDuration);
      }
      setTimeSlots(generatedSlots);
    } catch (err) {
      setError(prev => ({ ...prev, slots: "Failed to load schedule for this day." }));
    } finally {
      setIsLoading(prev => ({ ...prev, slots: false }));
    }
  }, [selectedDate, selectedService, selectedClubId]);

  useEffect(() => {
    generateAndSetTimeSlots();
  }, [selectedDate, selectedServiceId, generateAndSetTimeSlots]);

  const handleBlockSlot = async (slot: TimeSlotForOwner) => {
    if (!selectedService || !selectedDate) return;

    setTimeSlots(prev => prev.map(s => s.startTime === slot.startTime ? { ...s, displayStatus: 'blocked', status: 'blocked' } : s));
    try {
      await blockTimeSlot({
        clubId: selectedClubId,
        serviceId: selectedServiceId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      toast({ toastTitle: "Slot Blocked", toastDescription: `Slot ${slot.startTime} has been blocked.` });
      await generateAndSetTimeSlots(); // Re-fetch to get correct IDs
    } catch (err) {
      toast({ variant: "destructive", toastTitle: "Blocking Failed", toastDescription: "Could not block the slot." });
      setTimeSlots(prev => prev.map(s => s.startTime === slot.startTime ? { ...s, displayStatus: 'available', status: 'pending' } : s));
    }
  };

  const handleUnblockSlot = async (slot: TimeSlotForOwner) => {
    if (!slot.id) return;

    setTimeSlots(prev => prev.map(s => s.startTime === slot.startTime ? { ...s, displayStatus: 'available', status: 'pending' } : s));
    try {
      await unblockTimeSlot(slot.id);
      toast({ toastTitle: "Slot Unblocked", toastDescription: `Slot ${slot.startTime} is now available.` });
      await generateAndSetTimeSlots();
    } catch (err) {
      toast({ variant: "destructive", toastTitle: "Unblocking Failed", toastDescription: "Could not unblock the slot." });
      setTimeSlots(prev => prev.map(s => s.startTime === slot.startTime ? { ...s, displayStatus: 'blocked', status: 'blocked' } : s));
    }
  };


  const disabledDays: Matcher = { before: startOfToday() };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Availability</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Club & Service</CardTitle>
          <CardDescription>Choose the club and service for which you want to manage availability.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading.clubs ? <Loader2 className="animate-spin" /> : (
            <div className="space-y-1.5">
              <label htmlFor="club-select" className="text-sm font-medium text-muted-foreground flex items-center"><ClubIcon className="mr-2 h-4 w-4" />Club</label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger id="club-select"><SelectValue placeholder="Select a club..." /></SelectTrigger>
                <SelectContent>
                  {clubs.map(club => <SelectItem key={club._id} value={club._id}>{club.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {isLoading.services ? <Loader2 className="animate-spin" /> : (
            <div className="space-y-1.5">
              <label htmlFor="service-select" className="text-sm font-medium text-muted-foreground flex items-center"><Package className="mr-2 h-4 w-4" />Service</label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger id="service-select"><SelectValue placeholder="Select a service..." /></SelectTrigger>
                <SelectContent>
                  {services.map(service => <SelectItem key={service._id} value={service._id}>{service.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedServiceId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarClock className="mr-2 h-5 w-5 text-primary" />
              Daily Schedule for {selectedService?.name}
            </CardTitle>
            <CardDescription>
              Select a date to view its schedule. You can block time slots to make them unavailable for booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex justify-center lg:col-span-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                className="rounded-md border"
              />
            </div>
            <div className="lg:col-span-2">
              <h3 className="font-semibold mb-2">Slots for {selectedDate ? format(selectedDate, 'PPP') : '...'}</h3>
              {isLoading.slots ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
              ) : error.slots ? (
                <div className="text-destructive text-center p-4 flex flex-col items-center gap-3">
                  <AlertTriangle size={32} />
                  <span>{error.slots}</span>
                  <Button onClick={generateAndSetTimeSlots} variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                  </Button>
                </div>
              ) : timeSlots.length > 0 ? (
                <TooltipProvider>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-2">
                    {timeSlots.map(slot => (
                      <Tooltip key={slot.startTime}>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Button
                              variant={slot.displayStatus === 'available' ? 'outline' : 'secondary'}
                              className={`w-full ${slot.displayStatus === 'blocked' ? 'bg-muted-foreground/20' : ''} ${slot.displayStatus === 'booked' || slot.displayStatus === 'pending' ? 'cursor-not-allowed' : ''}`}
                              disabled={slot.displayStatus === 'booked' || slot.displayStatus === 'pending'}
                              onClick={() => {
                                if (slot.displayStatus === 'available') handleBlockSlot(slot);
                                if (slot.displayStatus === 'blocked') handleUnblockSlot(slot);
                              }}
                            >
                              {slot.startTime}
                            </Button>
                            {(slot.displayStatus === 'blocked' || slot.displayStatus === 'booked' || slot.displayStatus === 'pending') && (
                              <div className="absolute top-1 right-1">
                                {slot.displayStatus === 'blocked' && <Lock className="h-3 w-3 text-muted-foreground" />}
                                {slot.displayStatus === 'booked' && <CheckCircle className="h-3 w-3 text-green-600" />}
                                {slot.displayStatus === 'pending' && <Clock className="h-3 w-3 text-amber-600" />}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="capitalize">{slot.displayStatus}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              ) : (
                <p className="text-muted-foreground text-center py-8">No time slots generated for this day.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

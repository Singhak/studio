
"use client";

import type { Club, Service, TimeSlot, CreateBookingPayload, SportType } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { BookingCalendar } from '@/components/features/booking/BookingCalendar';
import { MapPin, Zap, Phone, Mail, Star, DollarSign, ShieldCheck, Users, CreditCard, CheckCircle, Clock, Palette, Loader2, LogIn, ListChecks, AlertTriangle, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { createBooking } from '@/services/bookingService';
import { getServicesByClubId } from '@/services/clubService';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ClubDetailsContent({ club }: { club: Club }) {
  const { toast } = useToast();
  const { addNotification, currentUser } = useAuth();
  const router = useRouter();
  const [isBooking, setIsBooking] = useState(false);

  const [fetchedServices, setFetchedServices] = useState<Service[] | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [selectedBookingDate, setSelectedBookingDate] = useState<Date | undefined>(undefined);
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<TimeSlot | null>(null);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Service | null>(null);
  const [selectedSportFilter, setSelectedSportFilter] = useState<SportType | "all">("all");

  const clubId = club._id;

  useEffect(() => {
    const loadServicesForCurrentClub = async () => {
      // Reset all service-related states when clubId changes or re-fetching
      setFetchedServices(null);
      setSelectedServiceForBooking(null);
      setSelectedBookingDate(undefined);
      setSelectedBookingSlot(null);
      setServicesError(null);
      setSelectedSportFilter("all");
      setIsLoadingServices(true);

      if (!clubId) {
        setServicesError("Club information is incomplete.");
        setIsLoadingServices(false);
        return;
      }

      try {
        const services = await getServicesByClubId(clubId);
        setFetchedServices(services || []);
        if (services && services.length > 0) {
          setSelectedServiceForBooking(services[0]); // Auto-select first service
          setSelectedBookingDate(new Date()); // Default to today
        } else {
          // No services found, ensure selected service is null
          setSelectedServiceForBooking(null);
        }
      } catch (error) {
        console.error(`[ClubDetailsContent] Failed to fetch services for club ${clubId}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Could not load services for this club.";
        setServicesError(errorMessage);
        setFetchedServices([]); // Set to empty array on error to avoid null issues
        setSelectedServiceForBooking(null); // Ensure no service is selected on error
      } finally {
        setIsLoadingServices(false);
      }
    };

    loadServicesForCurrentClub();
  }, [clubId]);

  const handleCalendarSlotSelect = useCallback((date: Date | undefined, slot: TimeSlot | null) => {
    setSelectedBookingDate(date);
    setSelectedBookingSlot(slot);
  }, []);

  const handleServiceSelectionForBooking = (service: Service) => {
    setSelectedServiceForBooking(service);
    setSelectedBookingSlot(null); // Clear slot when service changes
    toast({
        toastTitle: `Service Selected: ${service.name}`,
        toastDescription: "Please pick a date and time slot for this service.",
    });
  };

  const handleBookSlot = async () => {
    if (!currentUser) {
      toast({
        variant: "default",
        toastTitle: "Login Required",
        toastDescription: "Please log in or register to continue with your booking.",
        toastAction: (
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => router.push('/login')}>Login</Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/register')}>Register</Button>
          </div>
        ),
        duration: 7000,
      });
      router.push('/login');
      return;
    }

    if (!selectedServiceForBooking || !selectedBookingDate || !selectedBookingSlot) {
      toast({
        variant: "destructive",
        toastTitle: "Incomplete Selection",
        toastDescription: "Please ensure a service, date, and time slot are selected."
      });
      return;
    }

    setIsBooking(true);
    toast({
        toastTitle: "Submitting Booking Request...",
        toastDescription: `For ${selectedServiceForBooking.name} on ${format(selectedBookingDate, 'MMM d, yyyy')} at ${selectedBookingSlot.startTime}.`,
    });

    const bookingPayload: CreateBookingPayload = {
      serviceId: selectedServiceForBooking._id,
      bookingDate: format(selectedBookingDate, 'yyyy-MM-dd'),
      startTime: selectedBookingSlot.startTime,
      endTime: selectedBookingSlot.endTime,
    };

    try {
      const bookingResponse = await createBooking(bookingPayload);

      let durationHours = 0;
      try {
        const startDate = new Date(`1970-01-01T${selectedBookingSlot.startTime}:00`);
        const endDate = new Date(`1970-01-01T${selectedBookingSlot.endTime}:00`);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const durationMillis = endDate.getTime() - startDate.getTime();
          durationHours = durationMillis / (1000 * 60 * 60);
        }
      } catch (e) {
        console.error("Error calculating duration for toast:", e);
      }

      const toastDescriptionParts = [
        `For: ${selectedServiceForBooking.name}`,
        `Date: ${format(selectedBookingDate, 'MMM d, yyyy')}`,
        `Time: ${selectedBookingSlot.startTime} - ${selectedBookingSlot.endTime}`,
        durationHours > 0 ? `Duration: ${durationHours.toFixed(1)} hr(s)` : '',
        `Status: ${bookingResponse.message}`,
      ];
      const finalToastDescription = toastDescriptionParts.filter(part => part).join('\n');


      toast({
        toastTitle: "Booking Submitted!",
        toastDescription: (
          <div className="whitespace-pre-line">{finalToastDescription}</div>
        ),
        variant: bookingResponse.status === 'pending' ? 'default' : 'default',
      });

      addNotification(
        `New Booking Request: ${club.name}`,
        `A new booking for "${selectedServiceForBooking.name}" has been requested by ${currentUser?.displayName || currentUser?.email || 'a user'}. Please review.`,
        '/dashboard/owner'
      );

      addNotification(
        `Booking for ${selectedServiceForBooking.name} Pending`,
        `Your booking request for ${club.name} is ${bookingResponse.status}.`,
        '/dashboard/user'
      );
      setSelectedBookingSlot(null);

    } catch (error) {
      console.error("Booking failed:", error);
      toast({
        variant: "destructive",
        toastTitle: "Booking Failed",
        toastDescription: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const availableSportTypes = useMemo(() => {
    if (!fetchedServices) return [];
    const types = new Set<SportType>();
    fetchedServices.forEach(service => types.add(service.sportType));
    return Array.from(types);
  }, [fetchedServices]);

  const filteredServices = useMemo(() => {
    if (!fetchedServices) return [];
    if (selectedSportFilter === "all") return fetchedServices;
    return fetchedServices.filter(service => service.sportType === selectedSportFilter);
  }, [fetchedServices, selectedSportFilter]);


  return (
    <>
      <section className="mb-8">
        <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-xl">
          <Image
            src={club.images?.[0] || 'https://placehold.co/1200x400.png'}
            alt={`${club.name} main image`}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-500 hover:scale-105"
            data-ai-hint={`${(club.sport || 'sports').toLowerCase()} facility`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{club.name}</h1>
            <div className="flex items-center mt-2 space-x-4 text-white/90">
              {club.sport && <span className="flex items-center"><Zap size={18} className="mr-1.5" /> {club.sport}</span>}
              {club.address?.city && <span className="flex items-center"><MapPin size={18} className="mr-1.5" /> {club.address.city}</span>}
              {club.averageRating !== undefined && club.averageRating !== null && <span className="flex items-center"><Star size={18} className="mr-1.5 text-yellow-400 fill-yellow-400" /> {club.averageRating.toFixed(1)}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader><CardTitle className="text-2xl">About {club.name}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{club.description}</p>
              {club.amenities && club.amenities.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-semibold mb-2 text-foreground">Amenities:</h3>
                  <div className="flex flex-wrap gap-2">
                    {club.amenities.map(amenity => (
                      <Badge key={amenity} variant="outline" className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary"/> {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle className="text-2xl">Services & Pricing</CardTitle>
              {availableSportTypes.length > 1 && (
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <Select
                    value={selectedSportFilter}
                    onValueChange={(value) => setSelectedSportFilter(value as SportType | "all")}
                  >
                    <SelectTrigger className="w-full" aria-label="Filter services by sport type">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Filter by sport..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      {availableSportTypes.map(sport => (
                        <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingServices && fetchedServices === null ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <span>Loading services...</span>
                </div>
              ) : servicesError ? (
                <div className="text-center py-8 text-destructive">
                   <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                  <p className="font-semibold">Could not load services</p>
                  <p className="text-sm">{servicesError}</p>
                </div>
              ) : filteredServices && filteredServices.length > 0 ? (
                <ul className="space-y-4">
                  {filteredServices.map((service) => (
                    <li
                        key={service._id}
                        className={`p-4 border rounded-md hover:shadow-sm transition-all cursor-pointer
                                    ${selectedServiceForBooking?._id === service._id ? 'ring-2 ring-primary shadow-lg' : 'border-border'}`}
                        onClick={() => handleServiceSelectionForBooking(service)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                          <p className="text-sm text-muted-foreground mb-1">{service.description || `${service.slotDurationMinutes || 'N/A'} minutes session for ${service.sportType}`}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {service.capacity && <span className="flex items-center"><Users className="w-3 h-3 mr-1"/>Max {service.capacity}</span>}
                            {service.slotDurationMinutes && <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/>{service.slotDurationMinutes} min</span>}
                            {service.sportType && <span className="flex items-center"><Palette className="w-3 h-3 mr-1"/>{service.sportType}</span>}
                          </div>
                        </div>
                        <Badge variant="default" className="text-md whitespace-nowrap">
                          <DollarSign className="w-4 h-4 mr-1" /> {service.hourlyPrice.toFixed(2)}/hr
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                 <p className="text-sm text-muted-foreground mt-4 text-center py-8 flex flex-col items-center">
                    <ListChecks className="w-12 h-12 mb-3 text-muted-foreground/50" />
                    No services found {selectedSportFilter !== "all" ? `for ${selectedSportFilter}` : "for this club"}.
                 </p>
              )}
            </CardContent>
          </Card>

          {club.images && club.images.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-2xl">Gallery</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {club.images.slice(0,6).map((img, index) => (
                  <div key={index} className="aspect-square rounded-md overflow-hidden shadow-md">
                    <Image src={img} alt={`${club.name} gallery image ${index + 1}`} width={300} height={300} className="object-cover w-full h-full" data-ai-hint="sports facility" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          <BookingCalendar
            selectedService={selectedServiceForBooking}
            onSlotSelect={handleCalendarSlotSelect}
          />
          <Button
            size="lg"
            className="w-full text-lg py-6"
            onClick={handleBookSlot}
            disabled={!selectedServiceForBooking || !selectedBookingDate || !selectedBookingSlot || isBooking || isLoadingServices || !!servicesError}
          >
            {isBooking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
            Book Selected Slot
          </Button>

          <Card>
            <CardHeader><CardTitle className="text-xl">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {club.contactPhone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-primary" />
                  <a href={`tel:${club.contactPhone}`} className="text-muted-foreground hover:text-primary">{club.contactPhone}</a>
                </div>
              )}
              {club.contactEmail && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-primary" />
                   <a href={`mailto:${club.contactEmail}`} className="text-muted-foreground hover:text-primary">{club.contactEmail}</a>
                </div>
              )}
              {club.address?.street && club.address?.city && (
                <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-muted-foreground">{`${club.address.street}, ${club.address.city}`}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary" /> Location Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(club.location && club.location.coordinates && club.location.coordinates.length === 2) ? (
                <>
                  <div className="aspect-video w-full bg-muted rounded-md overflow-hidden border">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/view?key=YOUR_GOOGLE_MAPS_API_KEY_HERE&center=${club.location.coordinates[1]},${club.location.coordinates[0]}&zoom=15&maptype=roadmap`}
                    ></iframe>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Note: This map is a placeholder. To enable live Google Maps, obtain a Google Maps Embed API key and replace "YOUR_GOOGLE_MAPS_API_KEY_HERE" in the file <code className="p-0.5 bg-muted rounded text-xs">src/components/features/clubs/ClubDetailsContent.tsx</code> with your actual key.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Location coordinates not available for this club.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}

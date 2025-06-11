
"use client";

import type { Club, Service } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { BookingCalendar } from '@/components/features/booking/BookingCalendar';
import { MapPin, Zap, Phone, Mail, Star, DollarSign, ShieldCheck, Users, CreditCard, CheckCircle, Clock, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
// import { mockServices as defaultMockServices } from '@/lib/mockData'; // Use club.services instead
import { useAuth } from '@/contexts/AuthContext';

export function ClubDetailsContent({ club }: { club: Club }) {
  const { toast } = useToast();
  const { addNotification, currentUser } = useAuth();

  const handleBookSlot = () => {
    console.log("Booking slot for club:", club._id);

    toast({
        title: "Booking Request Received",
        description: "Preparing for payment...",
    });

    addNotification(
      `New Booking Request: ${club.name}`,
      `A new booking has been requested for ${club.name} by user ${currentUser?.displayName || currentUser?.email || 'a user'}. Please review.`,
      '/dashboard/owner'
    );

    setTimeout(() => {
      toast({
        title: (
          <div className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
            Redirecting to PhonePe...
          </div>
        ),
        description: "Please complete your payment (Simulated).",
      });
    }, 2000);

    setTimeout(() => {
      toast({
        title: (
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            Payment Successful!
          </div>
        ),
        description: `Your booking at ${club.name} is confirmed (Simulated).`,
      });

      addNotification(
        `Booking Confirmed: ${club.name}`,
        `Your booking at ${club.name} has been successfully confirmed.`,
        '/dashboard/user'
      );
    }, 5000);
  };

  const clubServicesToDisplay = club.services && club.services.length > 0 ? club.services : [];

  return (
    <>
      <section className="mb-8">
        <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-xl">
          <Image
            src={club.images[0] || 'https://placehold.co/1200x400.png'}
            alt={`${club.name} main image`}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-500 hover:scale-105"
            data-ai-hint={`${club.sport?.toLowerCase()} facility`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{club.name}</h1>
            <div className="flex items-center mt-2 space-x-4 text-white/90">
              {club.sport && <span className="flex items-center"><Zap size={18} className="mr-1.5" /> {club.sport}</span>}
              {club.address.city && <span className="flex items-center"><MapPin size={18} className="mr-1.5" /> {club.address.city}</span>}
              {club.averageRating && <span className="flex items-center"><Star size={18} className="mr-1.5 text-yellow-400 fill-yellow-400" /> {club.averageRating.toFixed(1)}</span>}
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
            <CardHeader><CardTitle className="text-2xl">Services & Pricing</CardTitle></CardHeader>
            <CardContent>
              {clubServicesToDisplay.length > 0 ? (
                <ul className="space-y-4">
                  {clubServicesToDisplay.map((service) => (
                    <li key={service._id} className="p-4 border rounded-md hover:shadow-sm transition-shadow">
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
                 <p className="text-sm text-muted-foreground mt-4">No specific services listed for this club. Please check with the club directly for offerings.</p>
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
          <BookingCalendar />
          <Button size="lg" className="w-full text-lg py-6" onClick={handleBookSlot}>
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
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                <span className="text-muted-foreground">{`${club.address.street}, ${club.address.city}`}</span>
              </div>
               <Button variant="outline" className="w-full mt-2">
                <Users className="w-4 h-4 mr-2"/> View on Map (Placeholder)
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

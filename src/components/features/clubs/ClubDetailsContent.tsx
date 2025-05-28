
"use client";

import type { Club } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { BookingCalendar } from '@/components/features/booking/BookingCalendar';
import { MapPin, Zap, Phone, Mail, Star, DollarSign, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { mockServices } from '@/lib/mockData'; // Keep for fallback logic if club.services is empty

export function ClubDetailsContent({ club }: { club: Club }) {
  const { toast } = useToast();

  return (
    <>
      {/* Header Section */}
      <section className="mb-8">
        <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-xl">
          <Image
            src={club.images[0] || 'https://placehold.co/1200x400.png'}
            alt={`${club.name} main image`}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-500 hover:scale-105"
            data-ai-hint={`${club.sport.toLowerCase()} facility`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{club.name}</h1>
            <div className="flex items-center mt-2 space-x-4 text-white/90">
              <span className="flex items-center"><Zap size={18} className="mr-1.5" /> {club.sport}</span>
              <span className="flex items-center"><MapPin size={18} className="mr-1.5" /> {club.location}</span>
              {club.rating && <span className="flex items-center"><Star size={18} className="mr-1.5 text-yellow-400 fill-yellow-400" /> {club.rating.toFixed(1)}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8"> {/* Changed md:grid-cols-3 to lg:grid-cols-3 */}
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-8"> {/* Changed md:col-span-2 to lg:col-span-2 */}
          {/* Description Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">About {club.name}</CardTitle>
            </CardHeader>
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
          
          {/* Services Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Services & Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {club.services && club.services.length > 0 ? club.services.map((service) => (
                  <li key={service.id} className="p-4 border rounded-md hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">{service.description || `${service.durationMinutes} minutes session`}</p>
                      </div>
                      <Badge variant="default" className="text-md whitespace-nowrap">
                        <DollarSign className="w-4 h-4 mr-1" /> {service.price.toFixed(2)}
                      </Badge>
                    </div>
                  </li>
                )) : 
                /* Fallback if no specific services - using mockServices for demo */
                mockServices.slice(0,2).map((service) => (
                   <li key={service.id} className="p-4 border rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{service.name} (Standard)</h3>
                         <p className="text-sm text-muted-foreground">{service.description || `${service.durationMinutes} minutes session`}</p>
                      </div>
                      <Badge variant="default" className="text-md">
                        <DollarSign className="w-4 h-4 mr-1" /> {service.price.toFixed(2)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
               {(!club.services || club.services.length === 0) && (
                  <p className="text-sm text-muted-foreground mt-4">No specific services listed for this club. Standard services may apply.</p>
              )}
            </CardContent>
          </Card>

          {/* Image Gallery (Optional) */}
          {club.images && club.images.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Gallery</CardTitle>
              </CardHeader>
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

        {/* Sidebar - Right Column (will stack below main content on screens smaller than lg) */}
        <div className="space-y-8">
          <BookingCalendar /> {/* This component uses its own mock data for time slots */}
          <Button 
            size="lg" 
            className="w-full text-lg py-6"
            onClick={() => {
                // Placeholder for actual booking logic
                console.log("Booking slot for club:", club.id);
                toast({
                    title: "Booking Initiated (Simulation)",
                    description: "If this were a real app, a push notification would be sent to you upon confirmation.",
                });
            }}
          >
            Book Selected Slot
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Contact Information</CardTitle>
            </CardHeader>
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
                <span className="text-muted-foreground">{club.location}</span>
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


"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlusCircle, Edit, Trash2, ListChecks, Loader2, AlertTriangle, ShoppingBag, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Club, Service } from '@/lib/types';
import { getClubById } from '@/services/clubService';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AddServiceForm } from '@/components/features/services/AddServiceForm';
import { Badge } from '@/components/ui/badge';

function ManageServicesContent() {
  const searchParams = useSearchParams();
  const clubId = searchParams.get('clubId');

  const [club, setClub] = useState<Club | null | undefined>(undefined);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);

  const fetchClubData = useCallback(async () => {
    if (!clubId) {
      setError('No club selected. Please select a club from the owner dashboard to manage its services.');
      setIsLoading(false);
      setClub(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const foundClub = await getClubById(clubId);
      if (foundClub) {
        setClub(foundClub);
        // Ensure services from the club match the new detailed Service structure
        const fetchedServices = (foundClub.services || []).map(s => ({
            ...s, // Spread existing service data
            _id: s._id || (s as any).id, // Ensure _id consistency
            club: s.club || clubId, // Ensure club ID reference
            hourlyPrice: s.hourlyPrice || (s as any).price || 0,
            slotDurationMinutes: s.slotDurationMinutes || (s as any).durationMinutes || 60,
            sportType: s.sportType || foundClub.sport || "Tennis", // Default if not specified
            capacity: s.capacity || 2,
            isActive: s.isActive !== undefined ? s.isActive : true,
            availableDays: s.availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            openingTime: s.openingTime || "09:00",
            closingTime: s.closingTime || "21:00",
        }));
        setServices(fetchedServices);
      } else {
        setClub(null);
        setError(`Could not find details for a club with ID: ${clubId}.`);
      }
    } catch (err) {
      console.error("Failed to fetch club:", err);
      setClub(null);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  const handleServiceAdded = (newService: Service) => {
    // Optimistically update UI or re-fetch
    setServices(prevServices => [...prevServices, newService]);
    setIsAddServiceDialogOpen(false); // Close dialog
    // Or better: fetchClubData(); to get the latest list from server
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading club services...</p>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {clubId && !club && !error ? 'Club Not Found' : 'Error Loading Services'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {error || 'The requested club could not be loaded or does not exist.'}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Owner Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Services for {club.name}</h1>
          <p className="text-muted-foreground">Add, edit, or remove services offered at your club.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary" />
              {club.name}'s Services
            </CardTitle>
            <CardDescription>
              Define the services your club offers, such as court rentals, coaching, etc.
            </CardDescription>
          </div>
          <Dialog open={isAddServiceDialogOpen} onOpenChange={setIsAddServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddServiceDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <AddServiceForm
                clubId={club._id}
                onServiceAdded={handleServiceAdded}
                onClose={() => setIsAddServiceDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead className="text-right">Price/Hour</TableHead>
                  <TableHead className="text-right">Duration (min)</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service._id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell><Badge variant="secondary">{service.sportType}</Badge></TableCell>
                    <TableCell className="text-right">${service.hourlyPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{service.slotDurationMinutes || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      {service.isActive ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="Edit Service" onClick={() => alert(`Placeholder: Edit service ${service.name}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete Service" className="text-destructive hover:text-destructive/90" onClick={() => alert(`Placeholder: Delete service ${service.name}`)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center border-2 border-dashed rounded-lg">
              <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">
                No Services Configured Yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add the first service for {club.name} to get started!
              </p>
            </div>
          )}
        </CardContent>
        {services.length > 0 && (
            <CardFooter className="justify-end">
                 <p className="text-xs text-muted-foreground">Total services: {services.length}</p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}


export default function ManageServicesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    }>
      <ManageServicesContent />
    </Suspense>
  );
}

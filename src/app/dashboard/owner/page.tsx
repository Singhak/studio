
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Booking, Club, Service } from "@/lib/types";
import { mockServices as allMockServices } from '@/lib/mockData'; // Keep for getServiceName, baseMockOwnerBookings removed
import Link from 'next/link';
import { PlusCircle, Edit, Settings, Users, Eye, CheckCircle, XCircle, Trash2, Building, ClubIcon as ClubIconLucide, DollarSign, BellRing, ListChecks, Star, Package, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { getLoggedInOwnerClubs } from '@/services/clubService';
import { getBookingsByClubId } from '@/services/bookingService'; // Import new service

const statusBadgeVariant = (status: Booking['status']) => {
  switch (status) {
    case 'confirmed': return 'default';
    case 'pending': return 'secondary';
    case 'completed': return 'outline';
    case 'cancelled': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

export default function OwnerDashboardPage() {
  const { toast } = useToast();
  const { addNotification } = useAuth();
  const [ownerClubs, setOwnerClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [clubsError, setClubsError] = useState<string | null>(null);

  const [clubBookings, setClubBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubsForOwner = async () => {
      setIsLoadingClubs(true);
      setClubsError(null);
      try {
        const clubsForOwner = await getLoggedInOwnerClubs();
        setOwnerClubs(clubsForOwner);
        if (clubsForOwner.length > 0) {
          setSelectedClub(clubsForOwner[0]); // Auto-select first club
        } else {
          setSelectedClub(null);
        }
      } catch (err) {
        console.error("Failed to fetch owner's clubs:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching clubs.";
        setClubsError(errorMessage);
        toast({ variant: "destructive", toastTitle: "Error Loading Clubs", toastDescription: errorMessage });
      } finally {
        setIsLoadingClubs(false);
      }
    };
    fetchClubsForOwner();
  }, [toast]);

  const fetchBookingsForClub = useCallback(async (clubId: string) => {
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const bookings = await getBookingsByClubId(clubId);
      // Sort bookings by date, most recent first
      bookings.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setClubBookings(bookings);
    } catch (err) {
      console.error(`Failed to fetch bookings for club ${clubId}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Could not load bookings for ${selectedClub?.name || 'this club'}.`;
      setBookingsError(errorMessage);
      toast({ variant: "destructive", toastTitle: "Error Loading Bookings", toastDescription: errorMessage });
    } finally {
      setIsLoadingBookings(false);
    }
  }, [toast, selectedClub?.name]);

  useEffect(() => {
    if (selectedClub?._id) {
      fetchBookingsForClub(selectedClub._id);
    } else {
      setClubBookings([]); // Clear bookings if no club is selected
    }
  }, [selectedClub, fetchBookingsForClub]);


  const handleClubChange = (clubId: string) => {
    const club = ownerClubs.find(c => c._id === clubId);
    setSelectedClub(club || null);
    // Bookings will be refetched by the useEffect watching selectedClub
  };
  
  // This function uses clubBookings (API sourced) now instead of baseMockOwnerBookings
  const currentClubBookings = useMemo(() => {
    return clubBookings;
  }, [clubBookings]);


  const getServiceName = (serviceId: string): string => {
    const service = allMockServices.find(s => s._id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const totalRevenue = useMemo(() => {
    if (!selectedClub) return 0;
    return currentClubBookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, booking) => sum + booking.totalPrice, 0);
  }, [currentClubBookings, selectedClub]);

  const activeBookingsCount = useMemo(() => {
     if (!selectedClub) return 0;
     return currentClubBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
  }, [currentClubBookings, selectedClub]);

  const pendingRequestsCount = useMemo(() => {
     if (!selectedClub) return 0;
     return currentClubBookings.filter(b => b.status === 'pending').length;
  }, [currentClubBookings, selectedClub]);

  const servicesOfferedCount = useMemo(() => {
      if (!selectedClub || !selectedClub.services) return 0; // services are part of Club type, fetched with getClubById
      return selectedClub.services.length;
  }, [selectedClub]);

  const totalFulfilledBookingsCount = useMemo(() => {
    if (!selectedClub) return 0;
    return currentClubBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
  }, [currentClubBookings, selectedClub]);


  if (isLoadingClubs) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-2">Loading Dashboard...</h1>
        <p className="text-muted-foreground">Fetching your club data.</p>
      </div>
    );
  }

  if (clubsError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertTriangle className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold mb-2 text-destructive">Error Loading Clubs</h1>
        <p className="text-muted-foreground mb-6 max-w-md">{clubsError}</p>
        <Button onClick={() => window.location.reload()} className="mt-6">
          Try Again
        </Button>
      </div>
    );
  }

  if (ownerClubs.length === 0 && !isLoadingClubs) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ClubIconLucide className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-2">No Clubs Registered Yet</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          It looks like you haven&apos;t registered any clubs with Courtly yet.
          Register your club to start managing bookings and reaching new players!
        </p>
        <Button size="lg" asChild>
          <Link href="/dashboard/owner/register-club">
            <PlusCircle className="mr-2 h-5 w-5" /> Register Your First Club
          </Link>
        </Button>
      </div>
    );
  }
  
  if (!selectedClub && ownerClubs.length > 0 && !isLoadingClubs) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ClubIconLucide className="w-24 h-24 text-muted-foreground mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold mb-2">Select a club to manage</h1>
         {ownerClubs.length > 1 && (
            <div className="w-full max-w-xs mt-4">
                <Select onValueChange={handleClubChange}>
                <SelectTrigger id="club-selector-fallback" aria-label="Select club to manage">
                    <SelectValue placeholder="Select your club..." />
                </SelectTrigger>
                <SelectContent>
                    {ownerClubs.map((club) => (
                    <SelectItem key={club._id} value={club._id}>
                        {club.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
        )}
      </div>
    );
  }

  if (!selectedClub && !isLoadingClubs) { // Should not happen if ownerClubs.length > 0 due to auto-selection
      return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Preparing club data...</p></div>;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{selectedClub!.name} - Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your club settings, bookings, and services.</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {ownerClubs.length > 1 && (
            <div className="min-w-[200px] sm:min-w-0 md:min-w-[200px]">
                <Select value={selectedClub!._id} onValueChange={handleClubChange}>
                <SelectTrigger id="club-selector" aria-label="Switch managed club">
                    <SelectValue placeholder="Switch Club..." />
                </SelectTrigger>
                <SelectContent>
                    {ownerClubs.map((club) => (
                    <SelectItem key={club._id} value={club._id}>
                        {club.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            )}
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/clubs/${selectedClub!._id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Club Page
                </Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
            <p className="text-xs text-muted-foreground">From confirmed & completed bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : activeBookingsCount}</div>
            <p className="text-xs text-muted-foreground">Confirmed or pending</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingRequestsCount}</div>
            <p className="text-xs text-muted-foreground">Needs your attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Offered</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servicesOfferedCount}</div>
            <p className="text-xs text-muted-foreground">Distinct services listed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Club Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedClub!.averageRating || "N/A"} / 5.0</div>
            <p className="text-xs text-muted-foreground">Based on user reviews ({selectedClub!.reviewCount} reviews)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfilled Bookings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : totalFulfilledBookingsCount}</div>
            <p className="text-xs text-muted-foreground">Total confirmed or completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 mb-4">
          <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
          <TabsTrigger value="manage">Manage Club</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Recent Booking Requests for {selectedClub!.name}</CardTitle>
              <CardDescription>Approve or reject new booking requests for this club.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBookings ? (
                 <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : bookingsError ? (
                <div className="text-center py-8 text-destructive">
                   <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                  <p className="font-semibold">Could not load bookings</p>
                  <p className="text-sm">{bookingsError}</p>
                  <Button variant="outline" className="mt-3" onClick={() => fetchBookingsForClub(selectedClub!._id)}>Try Again</Button>
                </div>
              ) : currentClubBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentClubBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">User {booking.userId.slice(-4)}</TableCell>
                        <TableCell>{new Date(booking.date).toLocaleDateString()} at {booking.startTime}</TableCell>
                        <TableCell>{getServiceName(booking.serviceId)}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                           {booking.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Accept Booking"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => {
                                    toast({
                                        toastTitle: "Booking Accepted (Sim)",
                                        toastDescription: `Booking for User ${booking.userId.slice(-4)} at ${selectedClub!.name} accepted.`,
                                    });
                                    addNotification(
                                        `Booking Confirmed: ${selectedClub!.name}`,
                                        `Your booking for ${getServiceName(booking.serviceId)} on ${new Date(booking.date).toLocaleDateString()} has been confirmed.`,
                                        '/dashboard/user'
                                    );
                                    // In a real app, you'd call an API to update status and then refetch bookings
                                    setClubBookings(prev => prev.map(b => b.id === booking.id ? {...b, status: 'confirmed'} : b));
                                }}
                              >
                                <CheckCircle className="h-5 w-5" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Reject Booking" className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                     toast({
                                        variant: "destructive",
                                        toastTitle: "Booking Rejected (Sim)",
                                        toastDescription: `Booking for User ${booking.userId.slice(-4)} at ${selectedClub!.name} rejected.`,
                                    });
                                    addNotification(
                                        `Booking Update: ${selectedClub!.name}`,
                                        `Your booking for ${getServiceName(booking.serviceId)} on ${new Date(booking.date).toLocaleDateString()} could not be confirmed.`,
                                        '/dashboard/user'
                                    );
                                    setClubBookings(prev => prev.map(b => b.id === booking.id ? {...b, status: 'rejected'} : b));
                                }}
                              >
                                <XCircle className="h-5 w-5" />
                              </Button>
                            </>
                           )}
                           <Button variant="ghost" size="icon" title="View Details"><Eye className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                 <p className="text-muted-foreground text-center py-8">No booking requests for {selectedClub!.name} at this time.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Manage {selectedClub!.name}</CardTitle>
              <CardDescription>Update club details, services, and availability. These actions apply to the currently selected club.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Club Information</h3>
                  <p className="text-sm text-muted-foreground">Edit name, description, location, images for {selectedClub!.name}.</p>
                </div>
                <Button variant="outline" asChild><Link href={`/dashboard/owner/settings?clubId=${selectedClub!._id}`}><Edit className="mr-2 h-4 w-4"/>Edit</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Services & Pricing</h3>
                  <p className="text-sm text-muted-foreground">Manage services for {selectedClub!.name}.</p>
                </div>
                <Button variant="outline" asChild><Link href={`/dashboard/owner/services?clubId=${selectedClub!._id}`}><Edit className="mr-2 h-4 w-4"/>Manage</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Availability Calendar</h3>
                  <p className="text-sm text-muted-foreground">Set hours and block dates for {selectedClub!.name}.</p>
                </div>
                 <Button variant="outline" asChild><Link href={`/dashboard/owner/availability?clubId=${selectedClub!._id}`}><Edit className="mr-2 h-4 w-4"/>Update</Link></Button>
              </div>
            </CardContent>
             <CardFooter>
                <Button asChild variant="destructive" className="ml-auto"
                 onClick={() => {
                     alert(`Placeholder: Would attempt to delete club: ${selectedClub!.name} (ID: ${selectedClub!._id})`);
                 }}>
                    <Link href="#"><Trash2 className="mr-2 h-4 w-4"/> Delete {selectedClub!.name.substring(0,15)}...</Link>
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

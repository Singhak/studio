
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Booking, Club, Service, ClubAddress } from "@/lib/types";
import { mockServices as allMockServices } from '@/lib/mockData';
import Link from 'next/link';
import { PlusCircle, Edit, Settings, Users, Eye, CheckCircle, XCircle, Trash2, Building, ClubIcon as ClubIconLucide, DollarSign, BellRing, ListChecks, Star, Package, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { getLoggedInOwnerClubs, getClubById, getServiceById, getServicesByClubId } from '@/services/clubService';
import { getBookingsByClubId, updateBookingStatus } from '@/services/bookingService';
import { BookingDetailsDialog } from '@/components/features/booking/BookingDetailsDialog';
import { BookingTable } from '@/components/features/booking/BookingTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';

export default function OwnerDashboardPage() {
  const { toast } = useToast();
  const { currentUser, loading: authLoading, addNotification } = useAuth();
  const [ownerClubs, setOwnerClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [clubsError, setClubsError] = useState<string | null>(null);

  const [clubBookings, setClubBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const [bookingForDialog, setBookingForDialog] = useState<Booking | null>(null);
  const [clubForDialog, setClubForDialog] = useState<Club | null>(null);
  const [serviceForDialog, setServiceForDialog] = useState<Service | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoadingDialogData, setIsLoadingDialogData] = useState(false);

  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [bookingToAcceptForDialog, setBookingToAcceptForDialog] = useState<Booking | null>(null);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [bookingToRejectForDialog, setBookingToRejectForDialog] = useState<Booking | null>(null);

  const getServiceName = useCallback((serviceId: string): string => {
    if (selectedClub && selectedClub.services) {
      const serviceInClub = selectedClub.services.find(s => s._id === serviceId);
      if (serviceInClub) return serviceInClub.name;
    }
    const service = allMockServices.find(s => s._id === serviceId);
    return service ? service.name : 'Unknown Service';
  }, [selectedClub]);

  useEffect(() => {
    console.log("OwnerDashboard: useEffect[fetchClubs] - Triggered. AuthLoading:", authLoading, "CurrentUser:", !!currentUser);
    const fetchClubs = async () => {
      if (!currentUser) {
        console.log("OwnerDashboard: useEffect[fetchClubs] - No current user, skipping club fetch.");
        setIsLoadingClubs(false);
        setOwnerClubs([]);
        setSelectedClub(null);
        setClubsError(null);
        return;
      }
      console.log("OwnerDashboard: useEffect[fetchClubs] - Fetching clubs for owner:", currentUser.uid);
      setIsLoadingClubs(true);
      setClubsError(null);
      try {
        const clubsForOwner = await getLoggedInOwnerClubs();
        console.log("OwnerDashboard: useEffect[fetchClubs] - Clubs fetched:", clubsForOwner.length);
        setOwnerClubs(clubsForOwner);
        if (clubsForOwner.length > 0) {
          setSelectedClub(prevSelectedClub => {
            const newFirstClub = clubsForOwner[0];
            if (prevSelectedClub?._id === newFirstClub._id) {
              return prevSelectedClub;
            }
            console.log("OwnerDashboard: useEffect[fetchClubs] - Setting selected club to first in list:", newFirstClub.name);
            return newFirstClub;
          });
        } else {
          console.log("OwnerDashboard: useEffect[fetchClubs] - No clubs found, setting selectedClub to null.");
          setSelectedClub(null);
        }
      } catch (err) {
        console.error("OwnerDashboard: useEffect[fetchClubs] - Failed to fetch owner's clubs:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching clubs.";
        setClubsError(errorMessage);
        toast({ variant: "destructive", toastTitle: "Error Loading Clubs", toastDescription: errorMessage });
        setOwnerClubs([]);
        setSelectedClub(null);
      } finally {
        console.log("OwnerDashboard: useEffect[fetchClubs] - Finished fetching clubs, setIsLoadingClubs(false)");
        setIsLoadingClubs(false);
      }
    };

    if (!authLoading && currentUser) {
      fetchClubs();
    } else if (!authLoading && !currentUser) {
      console.log("OwnerDashboard: useEffect[fetchClubs] - Auth loaded, no user. Clearing club state.");
      setIsLoadingClubs(false);
      setOwnerClubs([]);
      setSelectedClub(null);
      setClubsError(null);
    }
  }, [currentUser, authLoading, toast]);


  const fetchBookingsForClub = useCallback(async (clubId: string) => {
    if (!clubId) {
      console.log("OwnerDashboard: fetchBookingsForClub - No clubId, clearing bookings state.");
      setClubBookings([]);
      setBookingsError(null);
      setIsLoadingBookings(false);
      return;
    }
    console.log("OwnerDashboard: fetchBookingsForClub - Called for clubId:", clubId);
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const bookings = await getBookingsByClubId(clubId);

      const now = new Date();
      const clubName = ownerClubs.find(c => c._id === clubId)?.name || "your club";
      const processedBookings = await Promise.all(bookings.map(async (booking) => {
        if (booking.status === 'pending') {
          const bookingDateTime = parseISO(`${booking.bookingDate}T${booking.startTime}:00`);
          if (bookingDateTime < now) {
            // This booking has expired. Notify the user.
            try {
              await updateBookingStatus(booking._id, 'expired',  `Your pending booking for "${getServiceName(booking.service._id)}" at ${clubName} on ${format(parseISO(booking.bookingDate), 'MMM d, yyyy')} has expired as it was not confirmed in time.`);
              // Return a new object with the updated status.
              return { ...booking, status: 'expired' as Booking['status'] };
            } catch (error) {
              console.error(`OwnerDashboard: fetchBookingsForClub - Failed to update booking status for ${booking._id}:`, error);
            }
          }
        }
        return booking;
      }));

      processedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log("OwnerDashboard: fetchBookingsForClub - Bookings fetched for club", clubId, ":", processedBookings.length);
      setClubBookings(processedBookings.filter(b => b.status !== 'blocked')); // Filter out blocked slots
    } catch (err) {
      console.error(`OwnerDashboard: fetchBookingsForClub - Failed to fetch bookings for club ${clubId}:`, err);
      const clubNameForError = ownerClubs.find(c => c._id === clubId)?.name || 'this club';
      const errorMessage = err instanceof Error ? err.message : `Could not load bookings for ${clubNameForError}.`;
      setBookingsError(errorMessage);
      toast({ variant: "destructive", toastTitle: "Error Loading Bookings", toastDescription: errorMessage });
      setClubBookings([]);
    } finally {
      console.log("OwnerDashboard: fetchBookingsForClub - Finished fetching bookings for club", clubId, ", setIsLoadingBookings(false)");
      setIsLoadingBookings(false);
    }
  }, [toast, ownerClubs, addNotification, getServiceName]);

  useEffect(() => {
    const currentSelectedClubId = selectedClub?._id;
    console.log("OwnerDashboard: useEffect[fetchBookings] - Triggered. selectedClubId:", currentSelectedClubId);
    if (currentSelectedClubId) {
      fetchBookingsForClub(currentSelectedClubId);
    } else {
      console.log("OwnerDashboard: useEffect[fetchBookings] - No selected club ID, clearing bookings.");
      setClubBookings([]);
      setBookingsError(null);
      setIsLoadingBookings(false);
    }
  }, [selectedClub?._id, fetchBookingsForClub]);


  const handleClubChange = (clubId: string) => {
    console.log("OwnerDashboard: handleClubChange - Called with clubId:", clubId);
    const clubToSelect = ownerClubs.find(c => c._id === clubId);
    if (clubToSelect && clubToSelect._id !== selectedClub?._id) {
      console.log("OwnerDashboard: handleClubChange - Setting new selected club:", clubToSelect.name);
      setSelectedClub(clubToSelect);
    } else if (!clubToSelect) {
      console.log("OwnerDashboard: handleClubChange - Club ID not found in ownerClubs, setting selectedClub to null.");
      setSelectedClub(null);
    } else {
      console.log("OwnerDashboard: handleClubChange - Selected club ID is the same as current, no change.");
    }
  };

  const currentClubBookings = useMemo(() => {
    return clubBookings;
  }, [clubBookings]);

  const initiateAcceptBooking = (booking: Booking) => {
    setBookingToAcceptForDialog(booking);
    setIsAcceptConfirmOpen(true);
  };

  const executeAcceptBooking = async () => {
    if (!bookingToAcceptForDialog || !selectedClub) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "No booking selected for acceptance." });
      return;
    }
    const bookingId = bookingToAcceptForDialog._id;

    setClubBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'confirmed' } : b));
    toast({
      toastTitle: "Booking Accepted",
      toastDescription: `Booking for User ${bookingToAcceptForDialog.customer.name} at ${selectedClub.name} has been confirmed.`,
    });
    try {
      await updateBookingStatus(bookingId, 'confirmed', `Your booking for ${getServiceName(bookingToAcceptForDialog.service._id)} on ${format(parseISO(bookingToAcceptForDialog.bookingDate), 'MMM d, yyyy')} has been confirmed by the club.`);
    } catch (error) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Failed to update booking status." });
    }
    setIsAcceptConfirmOpen(false);
    setBookingToAcceptForDialog(null);
  };

  const initiateRejectBooking = (booking: Booking) => {
    setBookingToRejectForDialog(booking);
    setIsRejectConfirmOpen(true);
  };

  const executeRejectBooking = async () => {
    if (!bookingToRejectForDialog || !selectedClub) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "No booking selected for rejection or club context missing." });
      return;
    }
    const bookingId = bookingToRejectForDialog._id;

    setClubBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'rejected' } : b));
    toast({
      variant: "destructive",
      toastTitle: "Booking Rejected",
      toastDescription: `Booking for User ${bookingToRejectForDialog.customer.name} at ${selectedClub.name} has been rejected.`,
    });

    let serviceName = 'a service';
    if (selectedClub.services) {
      const service = selectedClub.services.find(s => s._id === bookingToRejectForDialog.service._id);
      if (service) serviceName = service.name;
      else serviceName = getServiceName(bookingToRejectForDialog.service._id); // Fallback if not in current club.services
    } else {
      serviceName = getServiceName(bookingToRejectForDialog.service._id);
    }

    try {
      await updateBookingStatus(bookingId, 'rejected', `Your booking for ${serviceName} on ${format(parseISO(bookingToRejectForDialog.bookingDate), 'MMM d, yyyy')} has been rejected by the club.`);
    } catch (error) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Failed to update booking status." });
    }
    setIsRejectConfirmOpen(false);
    setBookingToRejectForDialog(null);
  };

  const handleOpenDetailsDialog = async (booking: Booking) => {
    setBookingForDialog(booking);
    setIsLoadingDialogData(true);
    try {
      let fetchedClub = null;
      if (selectedClub && selectedClub._id === booking.club._id) {
        fetchedClub = selectedClub;
      } else {
        fetchedClub = await getClubById(booking.club._id);
      }

      let fetchedService = null;
      if (fetchedClub && fetchedClub.services) {
        fetchedService = fetchedClub.services.find(s => s._id === booking.service._id) || null;
      }
      if (!fetchedService) {
        fetchedService = await getServiceById(booking.service._id);
      }

      setClubForDialog(fetchedClub);
      setServiceForDialog(fetchedService);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load booking details." });
      setBookingForDialog(null);
    } finally {
      setIsLoadingDialogData(false);
    }
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
    if (selectedClub && selectedClub.services && selectedClub.services.length > 0) {
      return selectedClub.services.length;
    }
    const serviceIds = new Set(currentClubBookings.map(b => b.service));
    return serviceIds.size;
  }, [selectedClub, currentClubBookings]);

  const totalFulfilledBookingsCount = useMemo(() => {
    if (!selectedClub) return 0;
    return currentClubBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
  }, [currentClubBookings, selectedClub]);


  if (authLoading || (isLoadingClubs && !clubsError && !currentUser)) {
    console.log("OwnerDashboard: Render - Initial Loading (Auth or Pre-User Club Load).");
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-2">Loading Dashboard...</h1>
        <p className="text-muted-foreground">Checking authentication and fetching your club data.</p>
      </div>
    );
  }

  if (currentUser && isLoadingClubs) {
    console.log("OwnerDashboard: Render - Loading Clubs (User Authenticated).");
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-2">Loading Your Clubs...</h1>
        <p className="text-muted-foreground">Fetching your club details.</p>
      </div>
    );
  }

  if (clubsError && !isLoadingClubs) {
    console.log("OwnerDashboard: Render - Clubs Error Display.");
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertTriangle className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold mb-2 text-destructive">Error Loading Clubs</h1>
        <p className="text-muted-foreground mb-6 max-w-md">{clubsError}</p>
        <Button onClick={() => {
          if (currentUser) {
            const reFetchClubs = async () => {
              if (!currentUser) return;
              setIsLoadingClubs(true); setClubsError(null);
              try {
                const clubsForOwner = await getLoggedInOwnerClubs();
                setOwnerClubs(clubsForOwner);
                if (clubsForOwner.length > 0) setSelectedClub(clubsForOwner[0]); else setSelectedClub(null);
              } catch (err: any) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while fetching clubs.";
                setClubsError(errorMessage);
                toast({ variant: "destructive", toastTitle: "Error Loading Clubs", toastDescription: errorMessage });
              } finally { setIsLoadingClubs(false); }
            };
            reFetchClubs();
          } else {
            toast({ variant: "destructive", toastTitle: "Cannot Retry", toastDescription: "User not authenticated." })
          }
        }} className="mt-6">
          Try Again
        </Button>
      </div>
    );
  }

  if (!isLoadingClubs && ownerClubs.length === 0 && !clubsError && currentUser) {
    console.log("OwnerDashboard: Render - No Clubs Registered Display.");
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ClubIconLucide className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-2">No Clubs Registered Yet</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          It looks like you haven't registered any clubs with Courtly yet.
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

  if (!selectedClub && !isLoadingClubs && ownerClubs.length > 0 && !clubsError) {
    console.log("OwnerDashboard: Render - Clubs Loaded, No Club Selected (e.g., initial state or multi-club choice).");
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
        {ownerClubs.length === 1 && <p className="text-muted-foreground mt-2">Displaying dashboard for: {ownerClubs[0].name}</p>}
      </div>
    );
  }

  if (!selectedClub) {
    console.log("OwnerDashboard: Render - Fallback: No selected club and not caught by other conditions.");
    return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Preparing club data...</p></div>;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{selectedClub.name} - Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your club settings, bookings, and services.</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          {ownerClubs.length > 1 && (
            <div className="min-w-[200px] sm:min-w-0 md:min-w-[200px]">
              <Select value={selectedClub._id} onValueChange={handleClubChange}>
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
            <Link href={`/clubs/${selectedClub._id}`}>
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
            <div className="text-2xl font-bold">{isLoadingClubs ? <Loader2 className="h-6 w-6 animate-spin" /> : servicesOfferedCount}</div>
            <p className="text-xs text-muted-foreground">Distinct services listed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Club Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedClub.averageRating || "N/A"} / 5.0</div>
            <p className="text-xs text-muted-foreground">Based on user reviews ({selectedClub.reviewCount} reviews)</p>
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
          <BookingTable
            title={`Recent Booking Requests for ${selectedClub.name}`}
            description="Approve or reject new booking requests for this club."
            bookings={currentClubBookings}
            isLoading={isLoadingBookings}
            error={bookingsError}
            emptyStateMessage={`No booking requests for ${selectedClub.name} at this time.`}
            onRetry={() => { selectedClub?._id && fetchBookingsForClub(selectedClub._id) }}
            getServiceName={getServiceName}
            renderActions={(booking) => (
              <>
                {booking.status === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Accept Booking"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => initiateAcceptBooking(booking)}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reject Booking"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => initiateRejectBooking(booking)}
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title="View Details"
                  onClick={() => handleOpenDetailsDialog(booking)}
                  disabled={isLoadingDialogData && bookingForDialog?._id === booking._id}
                >
                  {isLoadingDialogData && bookingForDialog?._id === booking._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          />
        </TabsContent>
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Manage {selectedClub.name}</CardTitle>
              <CardDescription>Update club details, services, and availability. These actions apply to the currently selected club.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Club Information</h3>
                  <p className="text-sm text-muted-foreground">Edit name, description, location, images for {selectedClub.name}.</p>
                </div>
                <Button variant="outline" asChild><Link href={`/dashboard/owner/settings?clubId=${selectedClub._id}`}><Edit className="mr-2 h-4 w-4" />Edit</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Services & Pricing</h3>
                  <p className="text-sm text-muted-foreground">Manage services for {selectedClub.name}.</p>
                </div>
                <Button variant="outline" asChild><Link href={`/dashboard/owner/services?clubId=${selectedClub._id}`}><Edit className="mr-2 h-4 w-4" />Manage</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Availability Calendar</h3>
                  <p className="text-sm text-muted-foreground">Set hours and block dates for {selectedClub.name}.</p>
                </div>
                <Button variant="outline" asChild><Link href={`/dashboard/owner/availability?clubId=${selectedClub._id}`}><Edit className="mr-2 h-4 w-4" />Update</Link></Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="destructive" className="ml-auto"
                onClick={() => {
                  alert(`Placeholder: Would attempt to delete club: ${selectedClub.name} (ID: ${selectedClub._id})`);
                }}>
                <Link href="#"><Trash2 className="mr-2 h-4 w-4" /> Delete {selectedClub.name.substring(0, 15)}...</Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      {bookingForDialog && (
        <BookingDetailsDialog
          isOpen={isDetailsDialogOpen}
          onOpenChange={(open) => {
            setIsDetailsDialogOpen(open);
            if (!open) {
              setBookingForDialog(null);
              setClubForDialog(null);
              setServiceForDialog(null);
            }
          }}
          booking={bookingForDialog}
          club={clubForDialog}
          service={serviceForDialog}
          isLoading={isLoadingDialogData && !clubForDialog && !serviceForDialog}
        />
      )}
      {bookingToAcceptForDialog && (
        <AlertDialog open={isAcceptConfirmOpen} onOpenChange={setIsAcceptConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <CheckCircle className="mr-2 h-6 w-6 text-green-600" />
                Confirm Acceptance
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to accept the booking for User{' '}
                <strong>{bookingToAcceptForDialog.customer.name}</strong> for service{' '}
                <strong>{getServiceName(bookingToAcceptForDialog.service._id)}</strong> on{' '}
                <strong>{format(parseISO(bookingToAcceptForDialog.bookingDate), 'MMM d, yyyy')}</strong> at{' '}
                <strong>{bookingToAcceptForDialog.startTime}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBookingToAcceptForDialog(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeAcceptBooking}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm Accept
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {bookingToRejectForDialog && (
        <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertCircle className="mr-2 h-6 w-6 text-destructive" />
                Confirm Rejection
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject the booking for User{' '}
                <strong>{bookingToRejectForDialog.customer.name}</strong> for service{' '}
                <strong>{getServiceName(bookingToRejectForDialog.service._id)}</strong> on{' '}
                <strong>{format(parseISO(bookingToRejectForDialog.bookingDate), 'MMM d, yyyy')}</strong> at{' '}
                <strong>{bookingToRejectForDialog.startTime}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBookingToRejectForDialog(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeRejectBooking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}




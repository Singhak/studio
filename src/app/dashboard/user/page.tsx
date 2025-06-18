
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking, Club, Service, ClubAddress } from "@/lib/types";
import { Eye, Edit, Trash2, CalendarPlus, Heart, BookCopy, CalendarClock, History as HistoryIcon, MessageSquarePlus, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ClubCard } from '@/components/features/clubs/ClubCard';
import { ReviewForm } from '@/components/features/reviews/ReviewForm';
import { BookingDetailsDialog } from '@/components/features/booking/BookingDetailsDialog';
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
import { getAllClubs, getClubById, getServiceById } from '@/services/clubService';
import { getBookingsByUserId } from '@/services/bookingService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isAfter, addHours, subHours } from 'date-fns';

const statusBadgeVariant = (status: Booking['status']) => {
  switch (status) {
    case 'confirmed': return 'default';
    case 'pending': return 'secondary';
    case 'completed': return 'outline';
    case 'cancelled_by_customer': return 'destructive';
    case 'cancelled_by_club': return 'destructive';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
};

export default function UserDashboardPage() {
  const { currentUser, loading: authLoading, addNotification } = useAuth();
  const { toast } = useToast();

  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const [favoriteClubs, setFavoriteClubs] = useState<Club[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);

  const [bookingForDialog, setBookingForDialog] = useState<Booking | null>(null);
  const [clubForDialog, setClubForDialog] = useState<Club | null>(null);
  const [serviceForDialog, setServiceForDialog] = useState<Service | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoadingDialogData, setIsLoadingDialogData] = useState(false);

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [bookingToCancelForDialog, setBookingToCancelForDialog] = useState<Booking | null>(null);

  const [isRescheduleConfirmOpen, setIsRescheduleConfirmOpen] = useState(false);
  const [bookingToRescheduleForDialog, setBookingToRescheduleForDialog] = useState<Booking | null>(null);


  useEffect(() => {
    console.log("UserDashboard: useEffect[fetchBookings] - Triggered. AuthLoading:", authLoading, "CurrentUser:", !!currentUser);
    const fetchBookings = async () => {
      if (!currentUser) {
        console.log("UserDashboard: useEffect[fetchBookings] - No current user, skipping booking fetch.");
        setIsLoadingBookings(false);
        setUserBookings([]);
        setBookingsError(null);
        return;
      }
      console.log("UserDashboard: useEffect[fetchBookings] - Fetching bookings for user:", currentUser.uid);
      setIsLoadingBookings(true);
      setBookingsError(null);
      try {
        const bookings = await getBookingsByUserId(currentUser.uid);
        bookings.sort((a, b) => {
          const aIsUpcoming = ['confirmed', 'pending'].includes(a.status) && new Date(a.bookingDate) >= new Date();
          const bIsUpcoming = ['confirmed', 'pending'].includes(b.status) && new Date(b.bookingDate) >= new Date();
          if (aIsUpcoming && !bIsUpcoming) return -1;
          if (!aIsUpcoming && bIsUpcoming) return 1;
          return new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime();
        });
        console.log("UserDashboard: useEffect[fetchBookings] - Bookings fetched:", bookings.length);
        setUserBookings(bookings);
      } catch (error) {
        console.error("UserDashboard: useEffect[fetchBookings] - Failed to fetch user bookings:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not load your bookings.";
        setBookingsError(errorMessage);
        toast({ variant: "destructive", toastTitle: "Error Loading Bookings", toastDescription: errorMessage });
        setUserBookings([]);
      } finally {
        console.log("UserDashboard: useEffect[fetchBookings] - Finished fetching bookings, setIsLoadingBookings(false)");
        setIsLoadingBookings(false);
      }
    };

    if (!authLoading && currentUser) {
      fetchBookings();
    } else if (!authLoading && !currentUser) {
      console.log("UserDashboard: useEffect[fetchBookings] - Auth loaded, no user. Clearing booking state.");
      setIsLoadingBookings(false);
      setUserBookings([]);
      setBookingsError(null);
    }
  }, [currentUser, authLoading, toast]);


  useEffect(() => {
    const fetchFavoriteClubs = async () => {
      setIsLoadingFavorites(true);
      try {
        const allClubs = await getAllClubs();
        setFavoriteClubs(allClubs.filter(club => club.isFavorite));
      } catch (error) {
        console.error("Failed to fetch favorite clubs:", error);
      } finally {
        setIsLoadingFavorites(false);
      }
    };
    fetchFavoriteClubs();
  }, []);

  const upcomingBookings = useMemo(() => userBookings.filter(b => ['confirmed', 'pending'].includes(b.status) && new Date(b.bookingDate) >= new Date()), [userBookings]);
  const pastBookings = useMemo(() => userBookings.filter(b => !upcomingBookings.map(ub => ub._id).includes(b._id)), [userBookings, upcomingBookings]);
  const completedBookingsCount = useMemo(() => userBookings.filter(b => b.status === 'completed').length, [userBookings]);


  const handleOpenReviewDialog = (booking: Booking) => {
    setSelectedBookingForReview(booking);
    setIsReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    setIsReviewDialogOpen(false);
    setSelectedBookingForReview(null);
  };

  const hasBeenReviewed = (bookingId: string) => {
    // This is a mock check. In a real app, you'd check against actual review data.
    // For example, if the booking object itself had a `hasReview: true` property.
    return bookingId === 'ub3_mock_reviewed'; // Assuming 'ub3_mock_reviewed' is an ID of a booking that's been reviewed
  };

  const handleOpenDetailsDialog = async (booking: Booking) => {
    setBookingForDialog(booking);
    setIsLoadingDialogData(true);
    try {
      const club = await getClubById(booking.club);
      const service = await getServiceById(booking.service);
      setClubForDialog(club);
      setServiceForDialog(service);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load booking details." });
      setBookingForDialog(null);
    } finally {
      setIsLoadingDialogData(false);
    }
  };

  const initiateCancelBooking = async (booking: Booking) => {
    setBookingForDialog(booking); // Re-using for dialog data
    setIsLoadingDialogData(true);
    try {
      // Fetch club and service details for the dialog message
      let tempClub = clubForDialog && clubForDialog._id === booking.club ? clubForDialog : null;
      let tempService = serviceForDialog && serviceForDialog._id === booking.service ? serviceForDialog : null;

      if (!tempClub) tempClub = await getClubById(booking.club);
      if (!tempService) tempService = await getServiceById(booking.service);

      setClubForDialog(tempClub);
      setServiceForDialog(tempService);
      setBookingToCancelForDialog(booking);
      setIsCancelConfirmOpen(true);
    } catch (error) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load details for cancellation confirmation." });
    } finally {
      setIsLoadingDialogData(false);
    }
  };

  const executeCancelBooking = async () => {
    if (!bookingToCancelForDialog) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "No booking selected for cancellation." });
      return;
    }

    const bookingId = bookingToCancelForDialog._id;
    setUserBookings(prevBookings =>
      prevBookings.map(b =>
        b._id === bookingId ? { ...b, status: 'cancelled_by_customer', notes: 'Booking Cancelled by User' } : b
      )
    );

    const clubNameForToast = clubForDialog?.name || 'the club';
    const serviceNameForToast = serviceForDialog?.name || 'the service';

    toast({
      toastTitle: "Booking Cancelled",
      toastDescription: `Your booking at ${clubNameForToast} for ${serviceNameForToast} on ${format(new Date(bookingToCancelForDialog.bookingDate), 'MMM d, yyyy')} has been cancelled.`,
    });

    if (clubForDialog) {
      addNotification(
        `Booking Cancelled: ${clubForDialog.name}`,
        `User ${currentUser?.displayName || currentUser?.email || bookingToCancelForDialog.customer.slice(-4)} cancelled their booking for ${serviceNameForToast} on ${format(new Date(bookingToCancelForDialog.bookingDate), 'MMM d, yyyy')}.`,
        '/dashboard/owner', // Link to owner dashboard
        `booking_cancelled_${bookingId}`
      );
    }

    setIsCancelConfirmOpen(false);
    setBookingToCancelForDialog(null);
    setClubForDialog(null);
    setServiceForDialog(null);
    // In a real app, you'd also make an API call here to update the backend.
    // e.g., await cancelBookingApi(bookingId);
  };

  const canReschedule = (booking: Booking): boolean => {
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      return false;
    }
    try {
      const bookingDateTimeString = `${booking.bookingDate}T${booking.startTime}`;
      // Assuming booking.bookingDate is YYYY-MM-DD and booking.startTime is HH:MM
      // We need to parse this carefully. The base bookingDate for parse is arbitrary as we only care about the time part relative to the bookingDate.
      const bookingStartDateTime = parse(bookingDateTimeString, "yyyy-MM-dd'T'HH:mm", new Date());

      if (isNaN(bookingStartDateTime.getTime())) {
        console.error("Invalid date/time for rescheduling check:", bookingDateTimeString);
        return false; // Invalid date format
      }
      const oneHourBeforeBooking = subHours(bookingStartDateTime, 1);
      return isAfter(oneHourBeforeBooking, new Date());
    } catch (e) {
      console.error("Error parsing booking date/time for reschedule check:", e);
      return false;
    }
  };

  const initiateRescheduleBooking = async (booking: Booking) => {
    setBookingForDialog(booking); // Re-use for dialog loading state
    setIsLoadingDialogData(true);
    try {
      const club = await getClubById(booking.club);
      const service = await getServiceById(booking.service);
      setClubForDialog(club);
      setServiceForDialog(service);
      setBookingToRescheduleForDialog(booking);
      setIsRescheduleConfirmOpen(true);
    } catch (error) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load booking details for reschedule request." });
    } finally {
      setIsLoadingDialogData(false);
    }
  };

  const executeRescheduleBooking = async () => {
    if (!bookingToRescheduleForDialog) {
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: "No booking selected for reschedule." });
      return;
    }
    const bookingId = bookingToRescheduleForDialog._id;
    const originalDate = format(new Date(bookingToRescheduleForDialog.bookingDate), 'MMM d, yyyy');
    const originalTime = `${bookingToRescheduleForDialog.startTime}-${bookingToRescheduleForDialog.endTime}`;

    setUserBookings(prevBookings =>
      prevBookings.map(b =>
        b._id === bookingId ? {
          ...b,
          status: 'pending', // Always set to pending for owner approval
          notes: (b.notes ? b.notes + "\n" : "") + `Reschedule requested by user on ${format(new Date(), 'MMM d, yyyy HH:mm')}. Original: ${originalDate} ${originalTime}. New time pending owner confirmation.`
        } : b
      )
    );

    const clubNameForToast = clubForDialog?.name || 'the club';
    const serviceNameForToast = serviceForDialog?.name || 'the service';

    toast({
      toastTitle: "Reschedule Request Submitted",
      toastDescription: `Your request to reschedule booking for ${serviceNameForToast} at ${clubNameForToast} is pending owner confirmation.`,
    });

    if (clubForDialog && currentUser) {
      addNotification(
        `Reschedule Request: ${clubForDialog.name}`,
        `User ${currentUser?.displayName || currentUser?.email || 'ID: ' + currentUser.uid.slice(-4)} requested to reschedule their booking for ${serviceNameForToast} (originally ${originalDate} ${originalTime}). Please review.`,
        '/dashboard/owner', // Link to owner dashboard
        `booking_reschedule_request_${bookingId}`
      );
      addNotification(
        `Reschedule for ${serviceNameForToast} Pending`,
        `Your reschedule request for ${clubNameForToast} is pending owner confirmation.`,
        '/dashboard/user',
        `booking_reschedule_user_pending_${bookingId}`
      );
    }

    setIsRescheduleConfirmOpen(false);
    setBookingToRescheduleForDialog(null);
    setClubForDialog(null);
    setServiceForDialog(null);
  };


  if (authLoading || (isLoadingBookings && !bookingsError && !currentUser)) {
    console.log("UserDashboard: Render - Initial Loading (Auth or Pre-User Booking Load).");
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUser && isLoadingBookings) {
    console.log("UserDashboard: Render - Loading Bookings (User Authenticated).");
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your bookings...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <Button asChild>
          <Link href="/clubs"><CalendarPlus className="mr-2 h-4 w-4" /> New Booking</Link>
        </Button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookCopy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : userBookings.length}</div>
            <p className="text-xs text-muted-foreground">All your bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : upcomingBookings.length}</div>
            <p className="text-xs text-muted-foreground">Active and future reservations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
            <HistoryIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : completedBookingsCount}</div>
            <p className="text-xs text-muted-foreground">Successfully attended</p>
          </CardContent>
        </Card>
      </section>

      {bookingsError && !isLoadingBookings && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2" />Error Loading Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{bookingsError}</p>
            <Button variant="outline" className="mt-3" onClick={() => {
              if (currentUser) {
                const reFetchBookings = async () => {
                  if (!currentUser) return;
                  setIsLoadingBookings(true); setBookingsError(null);
                  try {
                    const bookings = await getBookingsByUserId(currentUser.uid);
                    bookings.sort((a, b) => {
                      const aIsUpcoming = ['confirmed', 'pending'].includes(a.status) && new Date(a.bookingDate) >= new Date();
                      const bIsUpcoming = ['confirmed', 'pending'].includes(b.status) && new Date(b.bookingDate) >= new Date();
                      if (aIsUpcoming && !bIsUpcoming) return -1;
                      if (!aIsUpcoming && bIsUpcoming) return 1;
                      return new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime();
                    });
                    setUserBookings(bookings);
                  } catch (err: any) {
                    const errorMessage = err instanceof Error ? err.message : "Could not re-load your bookings.";
                    setBookingsError(errorMessage);
                    toast({ variant: "destructive", toastTitle: "Error Loading Bookings", toastDescription: errorMessage });
                  } finally { setIsLoadingBookings(false); }
                };
                reFetchBookings();
              } else {
                toast({ toastDescription: "Please log in to retry." });
              }
            }}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-1 h-auto md:h-10">
          <TabsTrigger value="upcoming">Upcoming Bookings</TabsTrigger>
          <TabsTrigger value="past">Past Bookings</TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart className="mr-2 h-4 w-4" /> Favorite Clubs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
              <CardDescription>Manage your upcoming court reservations.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBookings ? (
                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : upcomingBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 sm:px-4">Club</TableHead>
                      <TableHead className="px-2 sm:px-4">Date</TableHead>
                      <TableHead className="px-2 sm:px-4">Time</TableHead>
                      <TableHead className="px-2 sm:px-4">Status</TableHead>
                      <TableHead className="text-right px-2 sm:px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingBookings.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell className="font-medium p-2 sm:p-4">Club {booking.club.slice(-4)}</TableCell>
                        <TableCell className="p-2 sm:p-4">{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                        <TableCell className="p-2 sm:p-4">{booking.startTime} - {booking.endTime}</TableCell>
                        <TableCell className="p-2 sm:p-4"><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1 p-2 sm:p-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Details"
                            onClick={() => handleOpenDetailsDialog(booking)}
                            disabled={isLoadingDialogData && bookingForDialog?._id === booking._id}
                          >
                            {isLoadingDialogData && bookingForDialog?._id === booking._id && (!isCancelConfirmOpen && !isRescheduleConfirmOpen) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Reschedule Booking"
                                onClick={() => initiateRescheduleBooking(booking)}
                                disabled={!canReschedule(booking) || (isLoadingDialogData && bookingForDialog?._id === booking._id)}
                              >
                                {isLoadingDialogData && bookingForDialog?._id === booking._id && isRescheduleConfirmOpen ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Edit className={`h-4 w-4 ${!canReschedule(booking) ? 'text-muted-foreground/50' : ''}`} />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancel Booking"
                                onClick={() => initiateCancelBooking(booking)}
                                disabled={isLoadingDialogData && bookingForDialog?._id === booking._id}
                              >
                                {isLoadingDialogData && bookingForDialog?._id === booking._id && isCancelConfirmOpen ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">You have no upcoming bookings.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Bookings</CardTitle>
              <CardDescription>Review your booking history and leave feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBookings ? (
                <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : pastBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 sm:px-4">Club</TableHead>
                      <TableHead className="px-2 sm:px-4">Date</TableHead>
                      <TableHead className="px-2 sm:px-4">Status</TableHead>
                      <TableHead className="text-right px-2 sm:px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastBookings.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell className="font-medium p-2 sm:p-4">Club {booking.club.slice(-4)}</TableCell>
                        <TableCell className="p-2 sm:p-4">{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                        <TableCell className="p-2 sm:p-4"><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1 p-2 sm:p-4">
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
                          {booking.status === 'completed' && (
                            !hasBeenReviewed(booking._id) ? (
                              <Button variant="outline" size="sm" onClick={() => handleOpenReviewDialog(booking)}>
                                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Leave Review
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" disabled>Reviewed</Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">No past bookings found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="favorites" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>My Favorite Clubs</CardTitle>
              <CardDescription>Your handpicked list of top sports clubs.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFavorites ? (
                <div className="text-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-muted-foreground">Loading favorite clubs...</p>
                </div>
              ) : favoriteClubs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteClubs.map((club) => (
                    <ClubCard key={club._id || club.id} club={club} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">No Favorite Clubs Yet</h2>
                  <p className="text-muted-foreground mb-6">
                    Start exploring and tap the heart icon on any club to add it to your favorites!
                  </p>
                  <Button asChild>
                    <Link href="/clubs">Find Clubs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedBookingForReview && (
        <AlertDialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <AlertDialogContent className="sm:max-w-lg">
            <ReviewForm
              booking={selectedBookingForReview}
              onReviewSubmit={handleReviewSubmitted}
            />
          </AlertDialogContent>
        </AlertDialog>
      )}

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

      {bookingToCancelForDialog && (
        <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertCircle className="mr-2 h-6 w-6 text-destructive" />
                Confirm Cancellation
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel your booking for{' '}
                <strong>{serviceForDialog?.name || bookingToCancelForDialog.service.slice(-6)}</strong> at{' '}
                <strong>{clubForDialog?.name || bookingToCancelForDialog.club.slice(-6)}</strong> on{' '}
                <strong>{format(new Date(bookingToCancelForDialog.bookingDate), 'MMM d, yyyy')}</strong> at{' '}
                <strong>{bookingToCancelForDialog.startTime}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setBookingToCancelForDialog(null); setClubForDialog(null); setServiceForDialog(null); }}>Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeCancelBooking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {bookingToRescheduleForDialog && clubForDialog && serviceForDialog && (
        <AlertDialog open={isRescheduleConfirmOpen} onOpenChange={setIsRescheduleConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <Edit className="mr-2 h-6 w-6 text-primary" />
                Request to Reschedule Booking
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are requesting to reschedule your booking for{' '}
                <strong>{serviceForDialog.name}</strong> at <strong>{clubForDialog.name}</strong>,
                originally on{' '}
                <strong>{format(new Date(bookingToRescheduleForDialog.bookingDate), 'MMM d, yyyy')}</strong> from{' '}
                <strong>{bookingToRescheduleForDialog.startTime} to {bookingToRescheduleForDialog.endTime}</strong>.
                <br /><br />
                This will send a request to the club owner. Your booking status will be 'pending' until the owner confirms a new time.
                (Note: Actual new time selection UI will be added in a future update.)
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setBookingToRescheduleForDialog(null); setClubForDialog(null); setServiceForDialog(null); }}>Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeRescheduleBooking}
              >
                Request Reschedule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

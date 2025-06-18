
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking, Club } from "@/lib/types"; 
import { Eye, Edit, Trash2, CalendarPlus, Heart, BookCopy, CalendarClock, History as HistoryIcon, MessageSquarePlus, Loader2, AlertTriangle } from "lucide-react"; 
import Link from "next/link";
import { ClubCard } from '@/components/features/clubs/ClubCard'; 
import { ReviewForm } from '@/components/features/reviews/ReviewForm';
import {
  AlertDialog,
  AlertDialogContent,
  // AlertDialogTrigger, // Not used if dialog opened programmatically
} from "@/components/ui/alert-dialog";
import { getAllClubs } from '@/services/clubService';
import { getBookingsByUserId } from '@/services/bookingService'; 
import { useAuth } from '@/contexts/AuthContext'; 
import { useToast } from '@/hooks/use-toast';

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

export default function UserDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast(); // Assuming useToast returns a stable toast function

  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const [favoriteClubs, setFavoriteClubs] = useState<Club[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);

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
  // Dependencies: authLoading and currentUser.
  }, [currentUser, authLoading, toast]); // Kept toast as original


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
    // TODO: Potentially refresh bookings or mark booking as reviewed in a real app
  };
  
  const hasBeenReviewed = (bookingId: string) => {
    // This is a mock check. In a real app, you'd check against actual review data.
    // For example, if 'ub3' from mockUserBookings was reviewed.
    return bookingId === 'ub3_mock_reviewed'; // Assuming 'ub3' is the ID of a reviewed booking for testing
  };

  const handleViewBookingDetails = (bookingId: string) => {
    const booking = userBookings.find(b => b.id === bookingId);
    if (!booking) {
      toast({
        variant: "destructive",
        toastTitle: "Error",
        toastDescription: "Booking details not found.",
      });
      return;
    }
    // In a real app, this would be a modal or a new page.
    // For now, using alert for simplicity and consistency with OwnerDashboard placeholder.
    alert(
      `Booking Details (User View):\n\n` +
      `ID: ${booking.id}\n` +
      `Club ID: ${booking.clubId}\n` + 
      `Service ID: ${booking.serviceId}\n` + 
      `Date: ${new Date(booking.date).toLocaleDateString()}\n` +
      `Time: ${booking.startTime} - ${booking.endTime}\n` +
      `Status: ${booking.status}\n` +
      `Price: $${booking.totalPrice.toFixed(2)}\n` +
      `Created: ${new Date(booking.createdAt).toLocaleString()}\n` +
      `${booking.notes ? `Notes: ${booking.notes}\n` : ''}` +
      `\n(Placeholder: Full booking detail view not yet implemented)`
    );
  };


  // Combined initial loading state
  if (authLoading || (isLoadingBookings && !bookingsError && !currentUser)) {
    console.log("UserDashboard: Render - Initial Loading (Auth or Pre-User Booking Load).");
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If auth is done, currentUser exists, but bookings are still loading
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
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Error Loading Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{bookingsError}</p>
            <Button variant="outline" className="mt-3" onClick={() => {
                if(currentUser) {
                    // Manually trigger refetch
                    const reFetchBookings = async () => {
                      if (!currentUser) return;
                      setIsLoadingBookings(true); setBookingsError(null);
                      try {
                        const bookings = await getBookingsByUserId(currentUser.uid);
                        bookings.sort();
                        setUserBookings(bookings);
                      } catch (err) { /* handle error */ } finally { setIsLoadingBookings(false); }
                    };
                    reFetchBookings();
                } else {
                     toast({toastDescription: "Please log in to retry."});
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
                          <Button variant="ghost" size="icon" title="View Details" onClick={() => handleViewBookingDetails(booking.id)}><Eye className="h-4 w-4" /></Button>
                          {booking.status === 'pending' && <Button variant="ghost" size="icon" title="Cancel"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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
                          <Button variant="ghost" size="icon" title="View Details" onClick={() => handleViewBookingDetails(booking.id)}><Eye className="h-4 w-4" /></Button>
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
    </div>
  );
}


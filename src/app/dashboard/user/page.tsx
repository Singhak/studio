
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking, Club, Service, TimeSlot } from "@/lib/types";
import { Edit, Eye, Trash2, CalendarPlus, Heart, BookCopy, CalendarClock, History as HistoryIcon, MessageSquarePlus, Loader2, AlertTriangle, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { ClubCard } from '@/components/features/clubs/ClubCard';
import { ReviewForm } from '@/components/features/reviews/ReviewForm';
import { BookingDetailsDialog } from '@/components/features/booking/BookingDetailsDialog';
import { RescheduleBookingDialog } from '@/components/features/booking/RescheduleBookingDialog';
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
import { format, subHours, isAfter, parseISO } from 'date-fns';

type SortableBookingKeys = keyof Pick<Booking, 'clubId' | 'date' | 'startTime' | 'status'>;

const statusBadgeVariant = (status: Booking['status']) => {
  switch (status) { case 'confirmed': return 'default'; case 'pending': return 'secondary'; case 'completed': return 'outline'; case 'cancelled': return 'destructive'; case 'rejected': return 'destructive'; case 'expired': return 'destructive'; default: return 'secondary'; }
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

  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [bookingForRescheduleDialog, setBookingForRescheduleDialog] = useState<Booking | null>(null);
  const [clubForRescheduleDialog, setClubForRescheduleDialog] = useState<Club | null>(null);
  const [serviceForRescheduleDialog, setServiceForRescheduleDialog] = useState<Service | null>(null);
  
  const [upcomingSortConfig, setUpcomingSortConfig] = useState<{ key: SortableBookingKeys; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'ascending' });
  const [pastSortConfig, setPastSortConfig] = useState<{ key: SortableBookingKeys; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'descending' });


  useEffect(() => {
    const fetchBookings = async () => {
      if (!currentUser) { setIsLoadingBookings(false); setUserBookings([]); setBookingsError(null); return; }
      setIsLoadingBookings(true);
      setBookingsError(null);
      try {
        const bookings = await getBookingsByUserId(currentUser.uid);
        setUserBookings(bookings);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not load your bookings.";
        setBookingsError(errorMessage);
        toast({ variant: "destructive", toastTitle: "Error Loading Bookings", toastDescription: errorMessage });
        setUserBookings([]);
      } finally {
        setIsLoadingBookings(false);
      }
    };
    if (!authLoading && currentUser) { fetchBookings(); } 
    else if (!authLoading && !currentUser) { setIsLoadingBookings(false); setUserBookings([]); setBookingsError(null); }
  }, [currentUser, authLoading, toast]);


  useEffect(() => {
    const fetchFavoriteClubs = async () => {
      setIsLoadingFavorites(true);
      try {
        const allClubs = await getAllClubs();
        setFavoriteClubs(allClubs.filter(club => club.isFavorite));
      } catch (error) { console.error("Failed to fetch favorite clubs:", error); } 
      finally { setIsLoadingFavorites(false); }
    };
    fetchFavoriteClubs();
  }, []);

  const upcomingBookings = useMemo(() => userBookings.filter(b => ['confirmed', 'pending'].includes(b.status) && parseISO(b.date) >= new Date(new Date().setHours(0,0,0,0))), [userBookings]);
  const pastBookings = useMemo(() => userBookings.filter(b => !upcomingBookings.map(ub => ub.id).includes(b.id)), [userBookings, upcomingBookings]);
  const completedBookingsCount = useMemo(() => userBookings.filter(b => b.status === 'completed').length, [userBookings]);

  const createSortHandler = (isUpcoming: boolean) => (key: SortableBookingKeys) => {
    const currentConfig = isUpcoming ? upcomingSortConfig : pastSortConfig;
    const setConfig = isUpcoming ? setUpcomingSortConfig : setPastSortConfig;
    let direction: 'ascending' | 'descending' = 'ascending';
    if (currentConfig && currentConfig.key === key && currentConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setConfig({ key, direction });
  };
  
  const getSortIcon = (isUpcoming: boolean, key: SortableBookingKeys) => {
    const currentConfig = isUpcoming ? upcomingSortConfig : pastSortConfig;
    if (!currentConfig || currentConfig.key !== key) return null;
    return currentConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const sortBookings = (bookings: Booking[], config: typeof upcomingSortConfig): Booking[] => {
    if (!config) return bookings;
    return [...bookings].sort((a, b) => {
        const aVal = a[config.key];
        const bVal = b[config.key];
        if (aVal < bVal) return config.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'ascending' ? 1 : -1;
        return 0;
    });
  };

  const sortedUpcomingBookings = useMemo(() => sortBookings(upcomingBookings, upcomingSortConfig), [upcomingBookings, upcomingSortConfig]);
  const sortedPastBookings = useMemo(() => sortBookings(pastBookings, pastSortConfig), [pastBookings, pastSortConfig]);

  const handleOpenReviewDialog = (booking: Booking) => { setSelectedBookingForReview(booking); setIsReviewDialogOpen(true); };
  const handleReviewSubmitted = () => { setIsReviewDialogOpen(false); setSelectedBookingForReview(null); };
  const hasBeenReviewed = (bookingId: string) => bookingId === 'ub3_mock_reviewed';

  const handleOpenDetailsDialog = async (booking: Booking) => {
    setBookingForDialog(booking); setIsLoadingDialogData(true);
    try {
      const club = await getClubById(booking.clubId); const service = await getServiceById(booking.serviceId);
      setClubForDialog(club); setServiceForDialog(service); setIsDetailsDialogOpen(true);
    } catch (error) { toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load booking details." }); setBookingForDialog(null); } 
    finally { setIsLoadingDialogData(false); }
  };

  const initiateCancelBooking = async (booking: Booking) => {
    setBookingForDialog(booking); setIsLoadingDialogData(true);
    try {
      let tempClub = clubForDialog && clubForDialog._id === booking.clubId ? clubForDialog : await getClubById(booking.clubId);
      let tempService = serviceForDialog && serviceForDialog._id === booking.serviceId ? serviceForDialog : await getServiceById(booking.serviceId);
      setClubForDialog(tempClub); setServiceForDialog(tempService); setBookingToCancelForDialog(booking); setIsCancelConfirmOpen(true);
    } catch (error) { toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load details for cancellation confirmation." }); } 
    finally { setIsLoadingDialogData(false); }
  };

  const executeCancelBooking = async () => {
    if (!bookingToCancelForDialog) { toast({ variant: "destructive", toastTitle: "Error", toastDescription: "No booking selected for cancellation." }); return; }
    const bookingId = bookingToCancelForDialog.id;
    setUserBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    toast({ toastTitle: "Booking Cancelled", toastDescription: `Your booking at ${clubForDialog?.name || 'the club'} for ${serviceForDialog?.name || 'the service'} on ${format(parseISO(bookingToCancelForDialog.date), 'MMM d, yyyy')} has been cancelled.` });
    if (clubForDialog && currentUser) { addNotification(`Booking Cancelled: ${clubForDialog.name}`, `User ${currentUser?.displayName || currentUser?.email || bookingToCancelForDialog.userId.slice(-4)} cancelled their booking for ${serviceForDialog?.name || ''} on ${format(parseISO(bookingToCancelForDialog.date), 'MMM d, yyyy')}.`, '/dashboard/owner', `booking_cancelled_${bookingId}`); }
    setIsCancelConfirmOpen(false); setBookingToCancelForDialog(null); setClubForDialog(null); setServiceForDialog(null);
  };

 const canReschedule = (booking: Booking): boolean => {
    if (booking.status !== 'confirmed' && booking.status !== 'pending') return false;
    try {
      const bookingStartDateTime = new Date(`${booking.date.split('T')[0]}T${booking.startTime}`);
      if (isNaN(bookingStartDateTime.getTime())) { console.error("Invalid date for reschedule check.", booking.date, booking.startTime); return false; }
      return isAfter(subHours(bookingStartDateTime, 1), new Date());
    } catch (e) { console.error("Error in canReschedule:", e); return false; }
  };

  const initiateRescheduleBooking = async (booking: Booking) => {
    setBookingForDialog(booking); setIsLoadingDialogData(true);
    try {
        const club = await getClubById(booking.clubId); const service = await getServiceById(booking.serviceId);
        if (!club || !service) { toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load essential details for rescheduling." }); setIsLoadingDialogData(false); return; }
        setClubForRescheduleDialog(club); setServiceForRescheduleDialog(service); setBookingForRescheduleDialog(booking); setIsRescheduleDialogOpen(true);
    } catch (error) { toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Could not load details for reschedule." }); } 
    finally { setIsLoadingDialogData(false); }
  };

  const handleConfirmReschedule = async (newDate: Date, newSlot: TimeSlot) => {
    if (!bookingForRescheduleDialog || !clubForRescheduleDialog || !serviceForRescheduleDialog) { toast({ variant: "destructive", toastTitle: "Error", toastDescription: "Reschedule context missing." }); return; }
    const bookingId = bookingForRescheduleDialog.id;
    const originalDate = format(parseISO(bookingForRescheduleDialog.date), 'MMM d, yyyy');
    const originalTime = `${bookingForRescheduleDialog.startTime}-${bookingForRescheduleDialog.endTime}`;
    const newDateFormatted = format(newDate, 'yyyy-MM-dd');
    setUserBookings(prev => prev.map(b => b.id === bookingId ? { ...b, date: newDateFormatted, startTime: newSlot.startTime, endTime: newSlot.endTime, status: 'pending', notes: (b.notes ? b.notes + "\n" : "") + `User requested reschedule on ${format(new Date(), 'MMM d, yyyy HH:mm')}. Original: ${originalDate} ${originalTime}. New: ${format(newDate, 'MMM d, yyyy')} ${newSlot.startTime}-${newSlot.endTime}.` } : b));
    toast({ toastTitle: "Reschedule Request Submitted", toastDescription: `Your request for ${serviceForRescheduleDialog.name} at ${clubForRescheduleDialog.name} to ${format(newDate, 'MMM d, yyyy')} ${newSlot.startTime} is pending owner confirmation.` });
    if (currentUser) {
      addNotification(`Reschedule Request: ${clubForRescheduleDialog.name}`, `User ${currentUser?.displayName || currentUser?.email || 'ID: '+currentUser.uid.slice(-4)} requested reschedule for ${serviceForRescheduleDialog.name} to ${format(newDate, 'MMM d, yyyy')} ${newSlot.startTime}.`, '/dashboard/owner', `reschedule_req_${bookingId}`);
      addNotification(`Reschedule Pending`, `Your reschedule for ${clubForRescheduleDialog.name} to ${format(newDate, 'MMM d, yyyy')} ${newSlot.startTime} is pending.`, '/dashboard/user', `reschedule_user_pending_${bookingId}`);
    }
    setIsRescheduleDialogOpen(false); setBookingForRescheduleDialog(null); setClubForRescheduleDialog(null); setServiceForRescheduleDialog(null);
  };

  if (authLoading || (isLoadingBookings && !bookingsError && !currentUser)) return (<div className="flex items-center justify-center min-h-[calc(100vh-12rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>);
  if (currentUser && isLoadingBookings) return (<div className="flex items-center justify-center min-h-[calc(100vh-12rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Loading your bookings...</p></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1><Button asChild><Link href="/clubs"><CalendarPlus className="mr-2 h-4 w-4" /> New Booking</Link></Button></div>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Bookings</CardTitle><BookCopy className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : userBookings.length}</div><p className="text-xs text-muted-foreground">All your bookings</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle><CalendarClock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : upcomingBookings.length}</div><p className="text-xs text-muted-foreground">Active and future reservations</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed Bookings</CardTitle><HistoryIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{isLoadingBookings ? <Loader2 className="h-6 w-6 animate-spin" /> : completedBookingsCount}</div><p className="text-xs text-muted-foreground">Successfully attended</p></CardContent></Card>
      </section>

      {bookingsError && !isLoadingBookings && (<Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Error</CardTitle></CardHeader><CardContent><p className="text-destructive-foreground">{bookingsError}</p></CardContent></Card>)}

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-1 h-auto md:h-10"><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="past">Past</TabsTrigger><TabsTrigger value="favorites"><Heart className="mr-2 h-4 w-4" />Favorites</TabsTrigger></TabsList>
        
        <TabsContent value="upcoming" className="mt-4">
          <Card><CardHeader><CardTitle>Upcoming Bookings</CardTitle><CardDescription>Manage your upcoming court reservations. Click headers to sort.</CardDescription></CardHeader><CardContent>{isLoadingBookings ? (<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>) : sortedUpcomingBookings.length > 0 ? (<Table><TableHeader><TableRow><TableHead><Button variant="ghost" onClick={() => createSortHandler(true)('clubId')}>Club {getSortIcon(true, 'clubId')}</Button></TableHead><TableHead><Button variant="ghost" onClick={() => createSortHandler(true)('date')}>Date {getSortIcon(true, 'date')}</Button></TableHead><TableHead><Button variant="ghost" onClick={() => createSortHandler(true)('status')}>Status {getSortIcon(true, 'status')}</Button></TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{sortedUpcomingBookings.map((booking) => (<TableRow key={booking.id}><TableCell className="font-medium p-2 sm:p-4">Club {booking.clubId.slice(-4)}</TableCell><TableCell className="p-2 sm:p-4">{format(parseISO(booking.date), 'MMM d, yyyy')} at {booking.startTime}</TableCell><TableCell className="p-2 sm:p-4"><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell><TableCell className="text-right space-x-1 p-2 sm:p-4"><Button variant="ghost" size="icon" title="View Details" onClick={() => handleOpenDetailsDialog(booking)} disabled={isLoadingDialogData && bookingForDialog?.id === booking.id}>{isLoadingDialogData && bookingForDialog?.id === booking.id && (!isCancelConfirmOpen && !isRescheduleDialogOpen) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}</Button>{(booking.status === 'pending' || booking.status === 'confirmed') && (<><Button variant="ghost" size="icon" title="Reschedule" onClick={() => initiateRescheduleBooking(booking)} disabled={!canReschedule(booking) || (isLoadingDialogData && bookingForDialog?.id === booking.id)}>{isLoadingDialogData && bookingForDialog?.id === booking.id && isRescheduleDialogOpen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className={`h-4 w-4 ${!canReschedule(booking) ? 'text-muted-foreground/50' : ''}`} />}</Button><Button variant="ghost" size="icon" title="Cancel" onClick={() => initiateCancelBooking(booking)} disabled={isLoadingDialogData && bookingForDialog?.id === booking.id}>{isLoadingDialogData && bookingForDialog?.id === booking.id && isCancelConfirmOpen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}</Button></>)}</TableCell></TableRow>))}</TableBody></Table>) : (<p className="text-muted-foreground text-center py-8">You have no upcoming bookings.</p>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <Card><CardHeader><CardTitle>Past Bookings</CardTitle><CardDescription>Review your booking history. Click headers to sort.</CardDescription></CardHeader><CardContent>{isLoadingBookings ? (<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>) : sortedPastBookings.length > 0 ? (<Table><TableHeader><TableRow><TableHead><Button variant="ghost" onClick={() => createSortHandler(false)('clubId')}>Club {getSortIcon(false, 'clubId')}</Button></TableHead><TableHead><Button variant="ghost" onClick={() => createSortHandler(false)('date')}>Date {getSortIcon(false, 'date')}</Button></TableHead><TableHead><Button variant="ghost" onClick={() => createSortHandler(false)('status')}>Status {getSortIcon(false, 'status')}</Button></TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{sortedPastBookings.map((booking) => (<TableRow key={booking.id}><TableCell className="font-medium p-2 sm:p-4">Club {booking.clubId.slice(-4)}</TableCell><TableCell className="p-2 sm:p-4">{format(parseISO(booking.date), 'MMM d, yyyy')}</TableCell><TableCell className="p-2 sm:p-4"><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell><TableCell className="text-right space-x-1 p-2 sm:p-4"><Button variant="ghost" size="icon" title="View Details" onClick={() => handleOpenDetailsDialog(booking)} disabled={isLoadingDialogData && bookingForDialog?.id === booking.id}>{isLoadingDialogData && bookingForDialog?.id === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}</Button>{booking.status === 'completed' && (!hasBeenReviewed(booking.id) ? <Button variant="outline" size="sm" onClick={() => handleOpenReviewDialog(booking)}><MessageSquarePlus className="mr-1.5 h-4 w-4" />Leave Review</Button> : <Button variant="ghost" size="sm" disabled>Reviewed</Button>)}</TableCell></TableRow>))}</TableBody></Table>) : (<p className="text-muted-foreground text-center py-8">No past bookings found.</p>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="favorites" className="mt-4"><Card><CardHeader><CardTitle>My Favorite Clubs</CardTitle><CardDescription>Your handpicked list of top sports clubs.</CardDescription></CardHeader><CardContent>{isLoadingFavorites ? (<div className="text-center py-12"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-3" /><p className="text-muted-foreground">Loading favorites...</p></div>) : favoriteClubs.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{favoriteClubs.map((club) => (<ClubCard key={club._id || club.id} club={club} />))}</div>) : (<div className="text-center py-12"><Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold text-foreground mb-2">No Favorites Yet</h2><p className="text-muted-foreground mb-6">Explore and tap the heart icon on any club to add it here!</p><Button asChild><Link href="/clubs">Find Clubs</Link></Button></div>)}</CardContent></Card></TabsContent>
      </Tabs>

      {selectedBookingForReview && (<AlertDialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}><AlertDialogContent className="sm:max-w-lg"><ReviewForm booking={selectedBookingForReview} onReviewSubmit={handleReviewSubmitted}/></AlertDialogContent></AlertDialog>)}
      {bookingForDialog && (<BookingDetailsDialog isOpen={isDetailsDialogOpen} onOpenChange={(open) => {setIsDetailsDialogOpen(open); if (!open) {setBookingForDialog(null); setClubForDialog(null); setServiceForDialog(null);}}} booking={bookingForDialog} club={clubForDialog} service={serviceForDialog} isLoading={isLoadingDialogData && !clubForDialog && !serviceForDialog}/>)}
      {bookingToCancelForDialog && (<AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center"><AlertCircle className="mr-2 h-6 w-6 text-destructive" />Confirm Cancellation</AlertDialogTitle><AlertDialogDescription>Are you sure you want to cancel your booking for <strong>{serviceForDialog?.name || bookingToCancelForDialog.serviceId.slice(-6)}</strong> at <strong>{clubForDialog?.name || bookingToCancelForDialog.clubId.slice(-6)}</strong> on <strong>{format(parseISO(bookingToCancelForDialog.date), 'MMM d, yyyy')}</strong> at <strong>{bookingToCancelForDialog.startTime}</strong>? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => { setBookingToCancelForDialog(null); setClubForDialog(null); setServiceForDialog(null); }}>Back</AlertDialogCancel><AlertDialogAction onClick={executeCancelBooking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Cancel</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
      {bookingForRescheduleDialog && clubForRescheduleDialog && serviceForRescheduleDialog && (<RescheduleBookingDialog isOpen={isRescheduleDialogOpen} onOpenChange={(open) => {setIsRescheduleDialogOpen(open); if (!open) {setBookingForRescheduleDialog(null); setClubForRescheduleDialog(null); setServiceForRescheduleDialog(null);}}} booking={bookingForRescheduleDialog} club={clubForRescheduleDialog} service={serviceForRescheduleDialog} onRescheduleConfirm={handleConfirmReschedule}/>)}
    </div>
  );
}


"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Booking, BookingStatus, Club, Service } from '@/lib/types';
import { getLoggedInOwnerClubs, getServicesByClubId } from '@/services/clubService';
import { getBookingsByClubId } from '@/services/bookingService';
import { mockServices as allMockServices } from '@/lib/mockData';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  Search,
  DollarSign,
  User,
  Settings,
  Package,
  PlusCircle,
  RefreshCw
} from "lucide-react";
import { getCachedClubEntry } from '@/lib/cacheUtils';

const ITEMS_PER_PAGE = 10;
const BOOKING_STATUSES: BookingStatus[] = ['confirmed', 'pending', 'completed', 'cancelled_by_customer', 'cancelled_by_club', 'rejected','blocked', 'expired'];

export default function OwnerBookingHistoryPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [ownerClubs, setOwnerClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [clubsError, setClubsError] = useState<string | null>(null);

  const [allBookingsForClub, setAllBookingsForClub] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // States for the filter input components
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // State for the filters that have been applied
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange,
    statusFilter,
    searchTerm,
  });

  const [currentPage, setCurrentPage] = useState(1);

  const selectedClub = useMemo(() => ownerClubs.find(club => club._id === selectedClubId), [ownerClubs, selectedClubId]);

  useEffect(() => {
    const fetchClubs = async () => {
      if (!currentUser) {
        setIsLoadingClubs(false);
        setClubsError("User not authenticated.");
        return;
      }
      setIsLoadingClubs(true);
      setClubsError(null);
      try {
        const clubs = await getLoggedInOwnerClubs();
        setOwnerClubs(clubs);
        if (clubs.length > 0) {
          setSelectedClubId(clubs[0]._id);
        } else {
          setSelectedClubId(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load clubs.";
        setClubsError(msg);
        toast({ variant: "destructive", toastTitle: "Error", toastDescription: msg });
      } finally {
        setIsLoadingClubs(false);
      }
    };
    if (!authLoading && currentUser) {
      fetchClubs();
    } else if (!authLoading && !currentUser) {
      setIsLoadingClubs(false);
      setClubsError("Please log in to view booking history.");
    }
  }, [currentUser, authLoading, toast]);

  const fetchBookingsForClub = useCallback(async (clubId: string) => {
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const bookings = await getBookingsByClubId(clubId);
      bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      await getServicesByClubId(clubId);
      setAllBookingsForClub(bookings);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load bookings for the club.";
      setBookingsError(msg);
      toast({ variant: "destructive", toastTitle: "Error", toastDescription: msg });
    } finally {
      setIsLoadingBookings(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedClubId) {
      fetchBookingsForClub(selectedClubId);
    } else {
      setAllBookingsForClub([]);
    }
    setCurrentPage(1); // Reset page on club change
  }, [selectedClubId, fetchBookingsForClub]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      dateRange,
      statusFilter,
      searchTerm,
    });
    setCurrentPage(1);
    toast({ toastTitle: "Filters Applied", toastDescription: "Booking history has been updated." });
  };

  const handleResetFilters = () => {
    const defaultDateRange = { from: subDays(new Date(), 30), to: new Date() };
    setDateRange(defaultDateRange);
    setStatusFilter("all");
    setSearchTerm("");
    setAppliedFilters({
      dateRange: defaultDateRange,
      statusFilter: "all",
      searchTerm: "",
    });
    setCurrentPage(1);
  };

  const getServiceName = useCallback((serviceId: string): string => {
    let serviceInClub = null
    if (selectedClub) {
      if (selectedClub.services) {
        serviceInClub = selectedClub.services.find(s => s._id === serviceId);
      } else {
        const service = getCachedClubEntry(selectedClub?._id)
        serviceInClub = service?.servicesData?.find(s => s._id === serviceId)
      }
    }
    return serviceInClub ? serviceInClub.name : 'Unknown Service';
  }, [selectedClub]);

  const filteredAndSearchedBookings = useMemo(() => {
    let bookings = allBookingsForClub;

    if (appliedFilters.dateRange?.from) {
      const fromDate = startOfDay(appliedFilters.dateRange.from);
      const toDate = appliedFilters.dateRange.to ? endOfDay(appliedFilters.dateRange.to) : endOfDay(appliedFilters.dateRange.from);
      bookings = bookings.filter(booking => {
        const bookingDate = parseISO(booking.bookingDate);
        return isWithinInterval(bookingDate, { start: fromDate, end: toDate });
      });
    }

    if (appliedFilters.statusFilter !== "all") {
      bookings = bookings.filter(booking => booking.status === appliedFilters.statusFilter);
    }

    if (appliedFilters.searchTerm.trim() !== "") {
      const lowerSearchTerm = appliedFilters.searchTerm.toLowerCase();
      bookings = bookings.filter(booking =>
        booking.customer.name.toLowerCase().includes(lowerSearchTerm) ||
        getServiceName(booking.service._id).toLowerCase().includes(lowerSearchTerm) ||
        booking._id.toLowerCase().includes(lowerSearchTerm)
      );
    }
    return bookings;
  }, [allBookingsForClub, appliedFilters, getServiceName]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSearchedBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSearchedBookings, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSearchedBookings.length / ITEMS_PER_PAGE);
  }, [filteredAndSearchedBookings]);

  const statusBadgeVariant = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled_by_customer': return 'destructive';
      case 'cancelled_by_club': return 'destructive';
      case 'rejected': return 'destructive';
      case 'blocked': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoadingClubs) {
    return <div className="flex justify-center items-center h-full p-8"><Loader2 className="w-16 h-16 text-primary animate-spin" /></div>;
  }
  if (clubsError) {
    return <div className="p-8 text-center text-destructive"><AlertTriangle className="mx-auto w-12 h-12 mb-2" />{clubsError}</div>;
  }
  if (ownerClubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <HistoryIcon className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-2">No Clubs Found</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          You don&apos;t seem to own any clubs yet. Register one to see booking history.
        </p>
        <Button size="lg" asChild>
          <Link href="/dashboard/owner/register-club">
            <PlusCircle className="mr-2 h-5 w-5" /> Register a Club
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center"><HistoryIcon className="mr-3 h-8 w-8" />Booking History</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Overview
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select a club and apply filters to view booking history.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="club-selector-history" className="text-sm font-medium text-muted-foreground">Select Club</label>
                <Select
                  value={selectedClubId || ""}
                  onValueChange={(value) => setSelectedClubId(value)}
                >
                  <SelectTrigger id="club-selector-history">
                    <SelectValue placeholder="Select a club..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerClubs.map(club => (
                      <SelectItem key={club._id} value={club._id}>{club.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                  <label htmlFor="date-range-picker" className="text-sm font-medium text-muted-foreground">Date Range</label>
                  <Popover>
                      <PopoverTrigger asChild>
                      <Button
                          id="date-range-picker"
                          variant={"outline"}
                          className={`w-full justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                          dateRange.to ? (
                              <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                          ) : (
                              format(dateRange.from, "LLL dd, y")
                          )
                          ) : (
                          <span>Pick a date range</span>
                          )}
                      </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                      />
                      </PopoverContent>
                  </Popover>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-grow min-w-48 space-y-1.5">
                <label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Booking Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {BOOKING_STATUSES.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-grow min-w-48 space-y-1.5">
                <label htmlFor="search-term-history" className="text-sm font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-term-history"
                    type="search"
                    placeholder="Search bookings..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={handleResetFilters}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button onClick={handleApplyFilters}>
                  <Search className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClub && (
        <Card>
          <CardHeader>
            <CardTitle>Bookings for {selectedClub.name}</CardTitle>
            <CardDescription>
              Displaying {paginatedBookings.length} of {filteredAndSearchedBookings.length} bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBookings ? (
              <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
            ) : bookingsError ? (
              <div className="text-center py-8 text-destructive">
                <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                <p className="font-semibold">Could not load bookings</p>
                <p className="text-sm">{bookingsError}</p>
                <Button variant="outline" className="mt-3" onClick={() => selectedClubId && fetchBookingsForClub(selectedClubId)}>Try Again</Button>
              </div>
            ) : filteredAndSearchedBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No bookings found matching your criteria for {selectedClub.name}.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.map(booking => (
                        <TableRow key={booking._id}>
                          <TableCell className="font-medium flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {booking.customer.name}</TableCell>
                          <TableCell><CalendarIcon className="h-4 w-4 text-muted-foreground inline mr-1.5" />{format(parseISO(booking.bookingDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                          <TableCell><Package className="h-4 w-4 text-muted-foreground inline mr-1.5" />{getServiceName(booking.service._id)}</TableCell>
                          <TableCell><Badge variant={statusBadgeVariant(booking.status)} className="capitalize">{booking.status}</Badge></TableCell>
                          <TableCell className="text-right"><DollarSign className="h-4 w-4 text-muted-foreground inline mr-0.5" />{booking.totalPrice.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <CardFooter className="flex items-center justify-between border-t pt-4 mt-4">
                    <div className="text-xs text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
      {!selectedClubId && !isLoadingClubs && ownerClubs.length > 0 && (
        <p className="text-muted-foreground text-center py-8">Please select a club to view its booking history.</p>
      )}
    </div>
  );
}

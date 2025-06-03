
"use client"; 

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Booking, Club, Service } from "@/lib/types";
import { mockClubs, mockServices as allMockServices } from '@/lib/mockData';
import Link from 'next/link';
import { PlusCircle, Edit, Settings, BarChart3, Users, DollarSign, Eye, CheckCircle, XCircle, Trash2, Building, ListFilter, ClubIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock current owner ID
const CURRENT_OWNER_ID = 'owner123';

// Mock data for bookings - adjust clubId to match owner's clubs
const baseMockOwnerBookings: Booking[] = [
  { id: 'b4', userId: 'u2', clubId: 'club1', serviceId: 's1', date: '2024-08-16', startTime: '11:00', endTime: '12:00', status: 'pending', totalPrice: 20, createdAt: new Date().toISOString() },
  { id: 'b5', userId: 'u3', clubId: 'club4', serviceId: 's2', date: '2024-08-17', startTime: '15:00', endTime: '16:00', status: 'confirmed', totalPrice: 30, createdAt: new Date().toISOString() },
  { id: 'b6', userId: 'u4', clubId: 'club1', serviceId: 's3', date: '2024-08-18', startTime: '10:00', endTime: '11:00', status: 'confirmed', totalPrice: 50, createdAt: new Date().toISOString() },
  { id: 'b7', userId: 'u5', clubId: 'club4', serviceId: 's1', date: '2024-08-19', startTime: '13:00', endTime: '14:00', status: 'pending', totalPrice: 20, createdAt: new Date().toISOString() },
];

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
  const [ownerClubs, setOwnerClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const clubsForOwner = mockClubs.filter(club => club.ownerId === CURRENT_OWNER_ID);
    setOwnerClubs(clubsForOwner);
    if (clubsForOwner.length > 0) {
      // Pre-select the first club, or a stored preference if implemented
      setSelectedClub(clubsForOwner[0]);
    } else {
      setSelectedClub(null);
    }
    setIsLoading(false);
  }, []);

  const handleClubChange = (clubId: string) => {
    const club = ownerClubs.find(c => c.id === clubId);
    setSelectedClub(club || null);
  };

  const currentClubBookings = useMemo(() => {
    if (!selectedClub) return [];
    return baseMockOwnerBookings.filter(booking => booking.clubId === selectedClub.id);
  }, [selectedClub]);
  
  const getServiceName = (serviceId: string): string => {
    const service = allMockServices.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  }


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Building className="w-24 h-24 text-muted-foreground mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold mb-2">Loading Dashboard...</h1>
      </div>
    );
  }

  if (ownerClubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ClubIcon className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-2">No Clubs Registered Yet</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          It looks like you haven&apos;t registered any clubs with Courtly.
          List your club to start managing bookings and reaching new players!
        </p>
        <Button size="lg" asChild>
          <Link href="/dashboard/owner/register-club">
            <PlusCircle className="mr-2 h-5 w-5" /> Register Your First Club
          </Link>
        </Button>
      </div>
    );
  }
  
  if (!selectedClub && ownerClubs.length > 0) {
     // This case should ideally not be hit if useEffect correctly sets the first club
     // But as a fallback:
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ClubIcon className="w-24 h-24 text-muted-foreground mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold mb-2">Select a club to manage</h1>
         {ownerClubs.length > 1 && (
            <div className="w-full max-w-xs mt-4">
                <Select onValueChange={handleClubChange}>
                <SelectTrigger id="club-selector-fallback" aria-label="Select club to manage">
                    <SelectValue placeholder="Select your club..." />
                </SelectTrigger>
                <SelectContent>
                    {ownerClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
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
  
  // Ensure selectedClub is not null before proceeding
  if (!selectedClub) {
      // This handles the brief moment before selectedClub is set, or if something went wrong
      return <p>Loading club data...</p>;
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
            <div className="min-w-[200px] sm:min-w-0 md:min-w-[200px]"> {/* Adjust min-width for select if needed */}
                <Select value={selectedClub.id} onValueChange={handleClubChange}>
                <SelectTrigger id="club-selector" aria-label="Switch managed club">
                    <SelectValue placeholder="Switch Club..." />
                </SelectTrigger>
                <SelectContent>
                    {ownerClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                        {club.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            )}
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/clubs/${selectedClub.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Club Page
                </Link>
            </Button>
        </div>
      </div>

      {/* Stats Cards - These should ideally be specific to the selectedClub */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Club)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234.56</div> 
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings (Club)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentClubBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">For {selectedClub.name}</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests (Club)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentClubBookings.filter(b => b.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Needs your attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Club Rating</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedClub.rating || "N/A"} / 5.0</div>
            <p className="text-xs text-muted-foreground">Based on user reviews</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="bookings">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
          <TabsTrigger value="manage">Manage Club</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Recent Booking Requests for {selectedClub.name}</CardTitle>
              <CardDescription>Approve or reject new booking requests for this club.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentClubBookings.length > 0 ? (
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
                        <TableCell className="font-medium">User {booking.userId.slice(-2)}</TableCell>
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
                                    console.log("Accepting booking:", booking.id, "for club:", selectedClub.id);
                                    toast({
                                        title: "Booking Accepted (Sim)",
                                        description: `Booking for User ${booking.userId.slice(-2)} at ${selectedClub.name} accepted.`,
                                    });
                                    // TODO: Update booking status in backend
                                }}
                              >
                                <CheckCircle className="h-5 w-5" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Reject Booking" className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                     console.log("Rejecting booking:", booking.id, "for club:", selectedClub.id);
                                     toast({
                                        variant: "destructive",
                                        title: "Booking Rejected (Sim)",
                                        description: `Booking for User ${booking.userId.slice(-2)} at ${selectedClub.name} rejected.`,
                                    });
                                    // TODO: Update booking status in backend
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
                 <p className="text-muted-foreground text-center py-8">No booking requests for {selectedClub.name} at this time.</p>
              )}
            </CardContent>
          </Card>
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
                {/* TODO: Pass selectedClub.id to these pages or use context */}
                <Button variant="outline" asChild><Link href={`/dashboard/owner/settings?clubId=${selectedClub.id}`}><Edit className="mr-2 h-4 w-4"/>Edit</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Services & Pricing</h3>
                  <p className="text-sm text-muted-foreground">Manage services for {selectedClub.name}.</p>
                </div>
                <Button variant="outline" asChild><Link href={`/dashboard/owner/services?clubId=${selectedClub.id}`}><Edit className="mr-2 h-4 w-4"/>Manage</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Availability Calendar</h3>
                  <p className="text-sm text-muted-foreground">Set hours and block dates for {selectedClub.name}.</p>
                </div>
                 <Button variant="outline" asChild><Link href={`/dashboard/owner/availability?clubId=${selectedClub.id}`}><Edit className="mr-2 h-4 w-4"/>Update</Link></Button>
              </div>
            </CardContent>
             <CardFooter>
                <Button asChild variant="destructive" className="ml-auto"
                 onClick={() => {
                     alert(`Placeholder: Would attempt to delete club: ${selectedClub.name} (ID: ${selectedClub.id})`);
                     // In a real app, you'd have a confirmation dialog and API call.
                 }}>
                    <Link href="#"><Trash2 className="mr-2 h-4 w-4"/> Delete {selectedClub.name.substring(0,15)}...</Link>
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking, Club } from "@/lib/types";
import { mockClubs } from '@/lib/mockData';
import Link from 'next/link';
import { PlusCircle, Edit, Settings, BarChart3, Users, DollarSign, Eye, CheckCircle, XCircle } from "lucide-react";

// Mock data: assume owner has one club or none
const ownerClub: Club | null = mockClubs[0]; // Or null if no club

const mockOwnerBookings: Booking[] = [
  { id: 'b4', userId: 'u2', clubId: ownerClub?.id || 'club1', serviceId: 's1', date: '2024-08-16', startTime: '11:00', endTime: '12:00', status: 'pending', totalPrice: 20, createdAt: new Date().toISOString() },
  { id: 'b5', userId: 'u3', clubId: ownerClub?.id || 'club1', serviceId: 's2', date: '2024-08-17', startTime: '15:00', endTime: '16:00', status: 'confirmed', totalPrice: 30, createdAt: new Date().toISOString() },
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
  if (!ownerClub) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Building className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-2">No Club Registered Yet</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          It looks like you haven&apos;t registered a club with Courtly.
          List your club to start managing bookings and reaching new players!
        </p>
        <Button size="lg" asChild>
          <Link href="/dashboard/owner/register-club">
            <PlusCircle className="mr-2 h-5 w-5" /> Register Your Club
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{ownerClub.name} - Dashboard</h1>
            <p className="text-muted-foreground">Manage your club settings, bookings, and services.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/clubs/${ownerClub.id}`}>
            <Eye className="mr-2 h-4 w-4" /> View Club Page
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+230</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockOwnerBookings.filter(b => b.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Needs your attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ownerClub.rating || "N/A"} / 5.0</div>
            <p className="text-xs text-muted-foreground">Based on user reviews</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="bookings">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
          <TabsTrigger value="manage">Manage Club</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Recent Booking Requests</CardTitle>
              <CardDescription>Approve or reject new booking requests for your club.</CardDescription>
            </CardHeader>
            <CardContent>
              {mockOwnerBookings.length > 0 ? (
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
                    {mockOwnerBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">User {booking.userId.slice(-1)}</TableCell>
                        <TableCell>{new Date(booking.date).toLocaleDateString()} at {booking.startTime}</TableCell>
                        <TableCell>Service {booking.serviceId.slice(-1)}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                           {booking.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" title="Accept Booking" className="text-green-600 hover:text-green-700">
                                <CheckCircle className="h-5 w-5" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Reject Booking" className="text-red-600 hover:text-red-700">
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
                 <p className="text-muted-foreground text-center py-8">No booking requests at this time.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Manage Your Club</CardTitle>
              <CardDescription>Update club details, services, and availability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Club Information</h3>
                  <p className="text-sm text-muted-foreground">Edit name, description, location, images.</p>
                </div>
                <Button variant="outline" asChild><Link href="/dashboard/owner/settings"><Edit className="mr-2 h-4 w-4"/>Edit</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Services & Pricing</h3>
                  <p className="text-sm text-muted-foreground">Add or modify court types, coaching, etc.</p>
                </div>
                <Button variant="outline" asChild><Link href="/dashboard/owner/services"><Edit className="mr-2 h-4 w-4"/>Manage</Link></Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Availability Calendar</h3>
                  <p className="text-sm text-muted-foreground">Set opening hours and block out dates.</p>
                </div>
                 <Button variant="outline" asChild><Link href="/dashboard/owner/availability"><Edit className="mr-2 h-4 w-4"/>Update</Link></Button>
              </div>
            </CardContent>
             <CardFooter>
                <Button asChild variant="destructive" className="ml-auto">
                    <Link href="#"><Trash2 className="mr-2 h-4 w-4"/> Delete Club (Placeholder)</Link>
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking } from "@/lib/types";
import { Eye, Edit, Trash2, CalendarPlus } from "lucide-react";
import Link from "next/link";

// Mock user bookings
const mockUserBookings: Booking[] = [
  { id: 'b1', userId: 'u1', clubId: 'club1', serviceId: 's1', date: '2024-08-15', startTime: '10:00', endTime: '11:00', status: 'confirmed', totalPrice: 20, createdAt: new Date().toISOString() },
  { id: 'b2', userId: 'u1', clubId: 'club2', serviceId: 's1', date: '2024-08-20', startTime: '14:00', endTime: '15:00', status: 'pending', totalPrice: 20, createdAt: new Date().toISOString() },
  { id: 'b3', userId: 'u1', clubId: 'club1', serviceId: 's2', date: '2024-07-10', startTime: '09:00', endTime: '10:00', status: 'completed', totalPrice: 30, createdAt: new Date().toISOString() },
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

export default function UserDashboardPage() {
  const upcomingBookings = mockUserBookings.filter(b => ['confirmed', 'pending'].includes(b.status) && new Date(b.date) >= new Date());
  const pastBookings = mockUserBookings.filter(b => !upcomingBookings.map(ub => ub.id).includes(b.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <Button asChild>
          <Link href="/clubs"><CalendarPlus className="mr-2 h-4 w-4" /> New Booking</Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="upcoming">Upcoming Bookings</TabsTrigger>
          <TabsTrigger value="past">Past Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
              <CardDescription>Manage your upcoming court reservations.</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Club</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">Club {booking.clubId.slice(-1)}</TableCell> {/* Placeholder name */}
                        <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
                        <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" title="View Details"><Eye className="h-4 w-4" /></Button>
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
        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>Past Bookings</CardTitle>
              <CardDescription>Review your booking history.</CardDescription>
            </CardHeader>
            <CardContent>
              {pastBookings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">Club {booking.clubId.slice(-1)}</TableCell>
                      <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                       <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" title="View Details"><Eye className="h-4 w-4" /></Button>
                          {booking.status === 'completed' && <Button variant="ghost" size="icon" title="Rebook (placeholder)"><CalendarPlus className="h-4 w-4" /></Button>}
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
      </Tabs>
    </div>
  );
}

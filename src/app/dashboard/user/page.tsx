
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking, Club } from "@/lib/types"; 
import { Eye, Edit, Trash2, CalendarPlus, Heart, BookCopy, CalendarClock, History as HistoryIcon } from "lucide-react"; 
import Link from "next/link";
import { ClubCard } from '@/components/features/clubs/ClubCard'; 
import { mockClubs, mockUserBookings } from '@/lib/mockData'; 

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
  const completedBookingsCount = mockUserBookings.filter(b => b.status === 'completed').length;
  
  const favoriteClubs: Club[] = mockClubs.filter(club => club.isFavorite);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <Button asChild>
          <Link href="/clubs"><CalendarPlus className="mr-2 h-4 w-4" /> New Booking</Link>
        </Button>
      </div>

      {/* User Activity Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookCopy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUserBookings.length}</div>
            <p className="text-xs text-muted-foreground">All your bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings.length}</div>
            <p className="text-xs text-muted-foreground">Active and future reservations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
            <HistoryIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedBookingsCount}</div>
            <p className="text-xs text-muted-foreground">Successfully attended</p>
          </CardContent>
        </Card>
      </section>


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
              {upcomingBookings.length > 0 ? (
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
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium p-2 sm:p-4">Club {booking.clubId.slice(-1)}</TableCell> {/* Placeholder name */}
                        <TableCell className="p-2 sm:p-4">{new Date(booking.date).toLocaleDateString()}</TableCell>
                        <TableCell className="p-2 sm:p-4">{booking.startTime} - {booking.endTime}</TableCell>
                        <TableCell className="p-2 sm:p-4"><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1 p-2 sm:p-4">
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
        <TabsContent value="past" className="mt-4">
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
                    <TableHead className="px-2 sm:px-4">Club</TableHead>
                    <TableHead className="px-2 sm:px-4">Date</TableHead>
                    <TableHead className="px-2 sm:px-4">Status</TableHead>
                    <TableHead className="text-right px-2 sm:px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium p-2 sm:p-4">Club {booking.clubId.slice(-1)}</TableCell>
                      <TableCell className="p-2 sm:p-4">{new Date(booking.date).toLocaleDateString()}</TableCell>
                      <TableCell className="p-2 sm:p-4"><Badge variant={statusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                       <TableCell className="text-right space-x-1 p-2 sm:p-4">
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
        <TabsContent value="favorites" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>My Favorite Clubs</CardTitle>
              <CardDescription>Your handpicked list of top sports clubs.</CardDescription>
            </CardHeader>
            <CardContent>
              {favoriteClubs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favoriteClubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
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
    </div>
  );
}

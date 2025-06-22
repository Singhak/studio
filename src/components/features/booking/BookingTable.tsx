
"use client";

import type { Booking } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

type StatusBadgeVariant = "default" | "secondary" | "outline" | "destructive" | null | undefined;

const getStatusBadgeVariant = (status: Booking['status']): StatusBadgeVariant => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'pending': return 'secondary';
        case 'completed': return 'outline';
        case 'cancelled_by_customer':
        case 'cancelled_by_club':
            return 'destructive';
        case 'rejected': return 'destructive';
        default: return 'secondary';
    }
};

interface BookingTableProps {
    title: string;
    description: string;
    bookings: Booking[];
    isLoading: boolean;
    error: string | null;
    emptyStateMessage: string;
    onRetry?: () => void;
    getServiceName: (serviceId: string) => string;
    renderActions: (booking: Booking) => React.ReactNode;
}

export function BookingTable({
    title,
    description,
    bookings,
    isLoading,
    error,
    emptyStateMessage,
    onRetry,
    getServiceName,
    renderActions,
}: BookingTableProps) {

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
                ) : error ? (
                    <div className="text-center py-8 text-destructive">
                        <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                        <p className="font-semibold">Could not load bookings</p>
                        <p className="text-sm">{error}</p>
                        {onRetry && (
                            <Button variant="outline" className="mt-3" onClick={onRetry}>Try Again</Button>
                        )}
                    </div>
                ) : bookings.length > 0 ? (
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
                            {bookings.map((booking) => (
                                <TableRow key={booking._id}>
                                    <TableCell className="font-medium">User {booking.customer.slice(-4)}</TableCell>
                                    <TableCell>{format(new Date(booking.bookingDate), 'MMM d, yyyy')} at {booking.startTime}</TableCell>
                                    <TableCell>{getServiceName(booking.service)}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                                    <TableCell className="text-right space-x-1">
                                        {renderActions(booking)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-8">{emptyStateMessage}</p>
                )}
            </CardContent>
        </Card>
    );
}

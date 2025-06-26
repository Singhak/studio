
"use client";

import { useState, useMemo } from 'react';
import type { Booking } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type StatusBadgeVariant = "default" | "secondary" | "outline" | "destructive" | null | undefined;
type SortableKeys = keyof Pick<Booking, 'customer' | 'bookingDate' | 'status'> | 'serviceName';

const getStatusBadgeVariant = (status: Booking['status']): StatusBadgeVariant => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'pending': return 'secondary';
        case 'completed': return 'outline';
        case 'cancelled_by_customer':
        case 'cancelled_by_club':
            return 'destructive';
        case 'rejected': return 'destructive';
        case 'expired': return 'destructive';
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
    title, description, bookings, isLoading, error, emptyStateMessage, onRetry, getServiceName, renderActions,
}: BookingTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'bookingDate', direction: 'descending' });

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    };

    const sortedBookings = useMemo(() => {
        let sortableItems = [...bookings];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any;
                let bValue: any;
                if (sortConfig.key === 'serviceName') {
                    aValue = getServiceName(a.service._id);
                    bValue = getServiceName(b.service._id);
                } else {
                    aValue = a[sortConfig.key];
                    bValue = b[sortConfig.key];
                }
                if (sortConfig.key === 'bookingDate') {
                    aValue = parseISO(a.bookingDate).getTime();
                    bValue = parseISO(b.bookingDate).getTime();
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [bookings, sortConfig, getServiceName]);

    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
                ) : error ? (
                    <div className="text-center py-8 text-destructive">
                        <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                        <p className="font-semibold">Could not load bookings</p>
                        <p className="text-sm">{error}</p>
                        {onRetry && (<Button variant="outline" className="mt-3" onClick={onRetry}>Try Again</Button>)}
                    </div>
                ) : sortedBookings.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('customer')}>User {getSortIcon('customer')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('bookingDate')}>Date & Time {getSortIcon('bookingDate')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('serviceName')}>Service {getSortIcon('serviceName')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedBookings.map((booking) => (
                                <TableRow key={booking._id}>
                                    <TableCell className="font-medium">{booking.customer.name}</TableCell>
                                    <TableCell>{format(parseISO(booking.bookingDate), 'MMM d, yyyy')} at {booking.startTime}</TableCell>
                                    <TableCell>{getServiceName(booking.service._id)}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                                    <TableCell className="text-right space-x-1">{renderActions(booking)}</TableCell>
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

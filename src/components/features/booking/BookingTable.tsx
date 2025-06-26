
"use client";

import { useState, useMemo } from 'react';
import type { Booking } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';

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
    const [filter, setFilter] = useState('');

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

    const filteredAndSortedBookings = useMemo(() => {
        let filteredItems = bookings;
        if (filter) {
            const lowercasedFilter = filter.toLowerCase();
            filteredItems = bookings.filter(booking =>
                booking.customer?.name?.toLowerCase().includes(lowercasedFilter) ||
                booking.customer?._id?.toLowerCase().includes(lowercasedFilter) ||
                getServiceName(booking.service._id).toLowerCase().includes(lowercasedFilter) ||
                booking.status.toLowerCase().includes(lowercasedFilter)
            );
        }

        let sortableItems = [...filteredItems];
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
                if (sortConfig.key == 'customer') {
                    aValue = a['customer']['name'] || a['customer']['_id'];
                    bValue = b['customer']['name'] || a['customer']['_id'];
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [bookings, filter, sortConfig, getServiceName]);

    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
            <CardContent>
                <div className="flex items-center pb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by user, service, or status..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                {isLoading ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
                ) : error ? (
                    <div className="text-center py-8 text-destructive">
                        <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                        <p className="font-semibold">Could not load bookings</p>
                        <p className="text-sm">{error}</p>
                        {onRetry && (<Button variant="outline" className="mt-3" onClick={onRetry}>Try Again</Button>)}
                    </div>
                ) : filteredAndSortedBookings.length > 0 ? (
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
                            {filteredAndSortedBookings.map((booking) => (
                                <TableRow key={booking._id}>
                                    <TableCell className="font-medium">{booking.customer.name || booking.customer._id.slice(-4)}</TableCell>
                                    <TableCell>{format(parseISO(booking.bookingDate), 'MMM d, yyyy')} at {booking.startTime}</TableCell>
                                    <TableCell>{getServiceName(booking.service._id)}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge></TableCell>
                                    <TableCell className="text-right space-x-1">{renderActions(booking)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-8">{filter ? `No bookings match your filter "${filter}".` : emptyStateMessage}</p>
                )}
            </CardContent>
        </Card>
    );
}

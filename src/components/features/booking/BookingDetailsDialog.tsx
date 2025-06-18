
"use client";

import type { Booking, Club, Service, ClubAddress } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calendar, Clock, DollarSign, Hash, Home, Info, MapPin, Package, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';

interface BookingDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  club: Club | null;
  service: Service | null;
  isLoading?: boolean;
}

const DetailItem = ({ icon: Icon, label, value, valueClassName }: { icon?: React.ElementType, label: string, value?: React.ReactNode, valueClassName?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-start py-2">
    <dt className="w-full sm:w-1/3 text-sm font-medium text-muted-foreground flex items-center">
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {label}
    </dt>
    <dd className={`w-full sm:w-2/3 text-sm text-foreground mt-1 sm:mt-0 ${valueClassName || ''}`}>
      {value !== undefined && value !== null && String(value).trim() !== '' ? value : <span className="text-muted-foreground/70">N/A</span>}
    </dd>
  </div>
);

export function BookingDetailsDialog({
  isOpen,
  onOpenChange,
  booking,
  club,
  service,
  isLoading = false,
}: BookingDetailsDialogProps) {

  const getStatusBadgeVariant = (status: Booking['status'] | undefined) => {
    if (!status) return 'secondary';
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled_by_customer': return 'destructive';
      case 'cancelled_by_club': return 'destructive';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const clubAddressString = club?.address
    ? `${club.address.street}, ${club.address.city}, ${club.address.state} ${club.address.zipCode}`
    : null;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Booking Details</DialogTitle>
          {booking && <DialogDescription>Information for Booking ID: {booking._id}</DialogDescription>}
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-grow min-h-[200px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">Loading details...</p>
          </div>
        ) : !booking ? (
          <div className="flex flex-col items-center justify-center flex-grow min-h-[200px] text-destructive">
            <AlertTriangle className="h-10 w-10 mb-3" />
            <p>Booking information not available.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4 overflow-y-auto flex-grow pr-2">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Hash className="w-5 h-5 mr-2 text-primary"/>General</h3>
              <dl className="divide-y divide-border">
                <DetailItem label="Booking ID" value={booking._id} />
                <DetailItem label="Status" value={<Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>} />
                <DetailItem label="Booked On" value={format(new Date(booking.createdAt), "MMM d, yyyy 'at' h:mm a")} />
                 <DetailItem label="User ID" value={booking.customer} />
              </dl>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Package className="w-5 h-5 mr-2 text-primary"/>Service & Club</h3>
              <dl className="divide-y divide-border">
                <DetailItem label="Club" value={club?.name} icon={Home}/>
                <DetailItem label="Service" value={service?.name} icon={Package}/>
                {club && <DetailItem label="Club Address" value={clubAddressString} icon={MapPin}/>}
                {service && <DetailItem label="Service Type" value={service.sportType} />}
              </dl>
            </Card>
            
            <Card className="p-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Calendar className="w-5 h-5 mr-2 text-primary"/>Date & Time</h3>
                <dl className="divide-y divide-border">
                    <DetailItem label="Date" value={format(new Date(booking.bookingDate), "EEEE, MMMM d, yyyy")} icon={Calendar}/>
                    <DetailItem label="Time" value={`${booking.startTime} - ${booking.endTime}`} icon={Clock}/>
                </dl>
            </Card>

            <Card className="p-4">
                 <h3 className="text-lg font-semibold mb-2 flex items-center"><Info className="w-5 h-5 mr-2 text-primary"/>Additional Info</h3>
                <dl className="divide-y divide-border">
                    <DetailItem label="Total Price" value={`$${booking.totalPrice.toFixed(2)}`} icon={DollarSign}/>
                    <DetailItem label="Notes" value={booking.notes} valueClassName="whitespace-pre-wrap"/>
                </dl>
            </Card>
          </div>
        )}

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

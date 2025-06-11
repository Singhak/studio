
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { mockUserBookings, baseMockOwnerBookings } from '@/lib/mockData';
import type { Booking } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const bookingId = params.bookingId;

  if (!bookingId) {
    return NextResponse.json({ message: 'Booking ID is required' }, { status: 400 });
  }

  const allMockBookings = [...mockUserBookings, ...baseMockOwnerBookings];
  const booking = allMockBookings.find(b => b.id === bookingId);

  if (!booking) {
    // Also check the in-memory store from the main bookings route if needed,
    // but for this isolated GET, we'll rely on predefined mock data or assume not found.
    // A more robust mock would share the `bookingsStore` from `POST /api/bookings`.
    // For now, if it's not in `mockData.ts`, we'll consider it not found for this GET endpoint.
    return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
  }

  return NextResponse.json({ status: booking.status });
}

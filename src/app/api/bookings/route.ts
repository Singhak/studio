
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Booking, CreateBookingPayload } from '@/lib/types';
import { mockServices, mockUserBookings, baseMockOwnerBookings } from '@/lib/mockData';

// In-memory store for mock bookings (for demonstration purposes)
let bookingsStore: Booking[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateBookingPayload;

    // Basic validation
    if (!body.serviceId || !body.bookingDate || !body.startTime || !body.endTime) {
      return NextResponse.json({ message: 'Missing required fields (serviceId, bookingDate, startTime, endTime).' }, { status: 400 });
    }

    // Validate date format (simple check for YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.bookingDate)) {
        return NextResponse.json({ message: 'Invalid bookingDate format. Expected YYYY-MM-DD.' }, { status: 400 });
    }
    // Validate time format (simple check for HH:MM)
    if (!/^\d{2}:\d{2}$/.test(body.startTime) || !/^\d{2}:\d{2}$/.test(body.endTime)) {
        return NextResponse.json({ message: 'Invalid time format. Expected HH:MM.' }, { status: 400 });
    }
    if (body.startTime >= body.endTime) {
        return NextResponse.json({ message: 'startTime must be before endTime.' }, { status: 400 });
    }


    const service = mockServices.find(s => s._id === body.serviceId);
    if (!service) {
      return NextResponse.json({ message: 'Service not found.' }, { status: 404 });
    }

    const newBookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Calculate duration in hours for price calculation (simplified)
    const startHour = parseInt(body.startTime.split(':')[0]);
    const endHour = parseInt(body.endTime.split(':')[0]);
    const durationHours = Math.max(1, endHour - startHour); // Ensure at least 1 hour for pricing
    const totalPrice = service.hourlyPrice * durationHours;


    const newBookingEntry: Booking = {
      id: newBookingId,
      userId: `user_mock_${Math.random().toString(36).substring(2, 7)}`, // Mock user ID
      clubId: service.club, // Get clubId from the service
      serviceId: body.serviceId,
      date: body.bookingDate,
      startTime: body.startTime,
      endTime: body.endTime,
      status: 'pending',
      totalPrice: totalPrice,
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };

    bookingsStore.push(newBookingEntry);
    console.log("New booking created (mock):", newBookingEntry);
    console.log("Current bookingsStore count:", bookingsStore.length);


    return NextResponse.json(
      {
        message: 'Booking request submitted successfully. Awaiting club owner confirmation.',
        bookingId: newBookingId,
        status: 'pending',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in POST /api/bookings:', error);
    let message = 'Internal server error';
    let statusCode = 500;

    if (error instanceof SyntaxError) {
        message = "Invalid request body: " + error.message;
        statusCode = 400;
    } else if (error instanceof Error) {
        message = error.message;
    }
    
    return NextResponse.json({ message }, { status: statusCode });
  }
}

// GET endpoint to view bookings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date'); // Expected format YYYY-MM-DD

  let allBookings = [...bookingsStore, ...mockUserBookings, ...baseMockOwnerBookings];

  // Deduplicate bookings by ID, giving preference to bookingsStore (potentially more up-to-date from POSTs)
  const uniqueBookingsMap = new Map<string, Booking>();
  allBookings.forEach(booking => {
    // Prefer bookings from bookingsStore if IDs clash with mockData
    if (!uniqueBookingsMap.has(booking.id) || bookingsStore.some(b => b.id === booking.id)) {
      uniqueBookingsMap.set(booking.id, booking);
    }
  });
  allBookings = Array.from(uniqueBookingsMap.values());

  if (serviceId && date) {
    const filteredBookings = allBookings.filter(
      (booking) => booking.serviceId === serviceId && booking.date === date
    );
    return NextResponse.json(filteredBookings);
  }
  
  // If only serviceId is provided, return all bookings for that service
  if (serviceId) {
    const filteredBookings = allBookings.filter(
      (booking) => booking.serviceId === serviceId
    );
    return NextResponse.json(filteredBookings);
  }

  // If no specific filters (serviceId, date) are provided, return all combined and deduplicated bookings.
  // This could be a large payload in a real app, consider pagination or requiring filters.
  return NextResponse.json(allBookings);
}

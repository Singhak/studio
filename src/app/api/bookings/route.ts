
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Booking, CreateBookingPayload } from '@/lib/types';
import { mockServices, mockUserBookings, baseMockOwnerBookings } from '@/lib/mockData';

// In-memory store for mock bookings (for demonstration purposes)
// NOTE: This store resets on every server restart/code change in dev mode.
// It's a simple way to handle dynamic data without a database.
let bookingsStore: Booking[] = [...mockUserBookings, ...baseMockOwnerBookings];


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
    
    const startHour = parseInt(body.startTime.split(':')[0]);
    const endHour = parseInt(body.endTime.split(':')[0]);
    const durationHours = Math.max(1, endHour - startHour); 
    const totalPrice = service.hourlyPrice * durationHours;

    const finalUserId = body.userId ? body.userId : `user_mock_${Math.random().toString(36).substring(2, 7)}`;
    const finalStatus = body.status ? body.status : 'pending';


    const newBookingEntry: Booking = {
      id: newBookingId,
      userId: finalUserId,
      clubId: service.club, 
      serviceId: body.serviceId,
      date: body.bookingDate,
      startTime: body.startTime,
      endTime: body.endTime,
      status: finalStatus,
      totalPrice: finalStatus === 'blocked' ? 0 : totalPrice, // Price is 0 for blocked slots
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };

    bookingsStore.push(newBookingEntry);
    console.log("New booking/block created (mock):", newBookingEntry);
    console.log("Current bookingsStore count:", bookingsStore.length);


    return NextResponse.json(
      {
        message: 'Booking request submitted successfully. Awaiting club owner confirmation.',
        bookingId: newBookingId,
        status: finalStatus,
        booking: newBookingEntry, // Return the full object for blocking scenario
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
  const userId = searchParams.get('userId');
  const clubId = searchParams.get('clubId');
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date'); // Expected format YYYY-MM-DD

  // Use a copy of the store to avoid race conditions if needed, but for now direct access is fine for mock.
  let allBookings = [...bookingsStore];

  // Priority 1: Filter by userId if provided
  if (userId) {
    const userBookings = allBookings.filter(booking => booking.userId === userId && !booking.userId.startsWith('owner_block_'));
    return NextResponse.json(userBookings);
  }

  // Priority 2: Filter by clubId if provided (and userId was not)
  if (clubId) {
    const clubBookings = allBookings.filter(booking => booking.clubId === clubId);
    return NextResponse.json(clubBookings);
  }
  
  // Priority 3: Filter by serviceId and date if both provided
  if (serviceId && date) {
    const filteredBookings = allBookings.filter(
      (booking) => booking.serviceId === serviceId && booking.date === date
    );
    return NextResponse.json(filteredBookings);
  }
  
  // Priority 4: Filter by serviceId only
  if (serviceId) {
    const filteredBookings = allBookings.filter(
      (booking) => booking.serviceId === serviceId
    );
    return NextResponse.json(filteredBookings);
  }

  // Default: If no specific filters, return all (consider implications for large datasets)
  return NextResponse.json(allBookings);
}

// This function will handle the deletion of a booking (used for unblocking)
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
        return NextResponse.json({ message: 'Booking ID is required for deletion' }, { status: 400 });
    }

    const initialLength = bookingsStore.length;
    bookingsStore = bookingsStore.filter(b => b.id !== bookingId);

    if (bookingsStore.length < initialLength) {
        console.log(`Booking ${bookingId} deleted from mock store.`);
        return new NextResponse(null, { status: 204 }); // No Content
    } else {
        console.log(`Booking ${bookingId} not found in mock store for deletion.`);
        return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }
}

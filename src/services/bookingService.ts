
import type { CreateBookingPayload, CreateBookingResponse, Booking } from '@/lib/types';
import { mockUserBookings, baseMockOwnerBookings } from '@/lib/mockData';

// In-memory store for mock bookings to simulate a backend for a static site.
// This data will reset on every page refresh.
let bookingsStore: Booking[] = JSON.parse(JSON.stringify([...mockUserBookings, ...baseMockOwnerBookings]));

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
  const { serviceId, bookingDate, startTime, endTime, notes, status, userId } = payload;
  
  if (!serviceId || !bookingDate || !startTime || !endTime) {
    throw new Error('Missing required fields (serviceId, bookingDate, startTime, endTime).');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    throw new Error('Invalid bookingDate format. Expected YYYY-MM-DD.');
  }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    throw new Error('Invalid time format. Expected HH:MM.');
  }
  if (startTime >= endTime) {
    throw new Error('startTime must be before endTime.');
  }

  // Simulate finding the associated service to get clubId and price.
  // In a real app, this might come from a different service or be part of the payload.
  const { mockServices } = await import('@/lib/mockData');
  const service = mockServices.find(s => s._id === serviceId);
  if (!service) {
    throw new Error('Service not found.');
  }

  const newBookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const durationHours = Math.max(1, endHour - startHour);
  const totalPrice = service.hourlyPrice * durationHours;

  const finalUserId = userId || `user_mock_${Math.random().toString(36).substring(2, 7)}`;
  const finalStatus = status || 'pending';

  const newBookingEntry: Booking = {
    id: newBookingId,
    userId: finalUserId,
    clubId: service.club,
    serviceId: serviceId,
    date: bookingDate,
    startTime: startTime,
    endTime: endTime,
    status: finalStatus,
    totalPrice: finalStatus === 'blocked' ? 0 : totalPrice,
    notes: notes,
    createdAt: new Date().toISOString(),
  };

  bookingsStore.push(newBookingEntry);
  console.log("New booking/block created (client-side mock):", newBookingEntry);
  console.log("Current bookingsStore count:", bookingsStore.length);

  return {
    message: 'Booking request submitted successfully. Awaiting club owner confirmation.',
    bookingId: newBookingId,
    status: finalStatus,
    booking: newBookingEntry,
  } as unknown as CreateBookingResponse; // Adjusting type for compatibility
}

export async function getBookingStatus(bookingId: string): Promise<{ status: Booking['status'] } | null> {
  const booking = bookingsStore.find(b => b.id === bookingId);
  if (!booking) {
    return null;
  }
  return { status: booking.status };
}

export async function getBookingsForServiceOnDate(serviceId: string, date: string): Promise<Booking[]> {
  return bookingsStore.filter(b => b.serviceId === serviceId && b.date === date);
}

export async function getBookingsByUserId(userId: string): Promise<Booking[]> {
  // Exclude owner blocks from a user's booking history.
  return bookingsStore.filter(booking => booking.userId === userId && !booking.userId.startsWith('owner_block_'));
}

export async function getBookingsByClubId(clubId: string): Promise<Booking[]> {
  return bookingsStore.filter(booking => booking.clubId === clubId);
}

export async function blockTimeSlot(payload: { clubId: string; serviceId: string; date: string; startTime: string; endTime: string; }): Promise<Booking> {
  const bookingPayload: CreateBookingPayload = {
    serviceId: payload.serviceId,
    bookingDate: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: 'blocked',
    userId: `owner_block_${payload.clubId}`
  };
  const response = await createBooking(bookingPayload);
  return response.booking;
}

export async function unblockTimeSlot(bookingId: string): Promise<void> {
  const initialLength = bookingsStore.length;
  bookingsStore = bookingsStore.filter(b => b.id !== bookingId);

  if (bookingsStore.length >= initialLength) {
    throw new Error('Booking not found for unblocking.');
  }
  console.log(`Booking ${bookingId} deleted from client-side mock store.`);
}

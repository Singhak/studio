
import type { CreateBookingPayload, CreateBookingResponse, Booking } from '@/lib/types';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = { message: `Request failed with status ${response.status}` };
        }
        throw new Error(errorBody.message || 'An API error occurred');
    }
    if (response.status === 204) {
        return undefined as T;
    }
    return response.json();
}

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
  return await fetcher('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getBookingStatus(bookingId: string): Promise<{ status: Booking['status'] }> {
  return await fetcher(`/api/bookings/${bookingId}/status`);
}

export async function getBookingsForServiceOnDate(serviceId: string, date: string): Promise<Booking[]> {
    const url = new URL('/api/bookings', window.location.origin);
    url.searchParams.append('serviceId', serviceId);
    url.searchParams.append('date', date);
    return await fetcher(url.toString());
}

export async function getBookingsByUserId(userId: string): Promise<Booking[]> {
    const url = new URL('/api/bookings', window.location.origin);
    url.searchParams.append('userId', userId);
    return await fetcher(url.toString());
}

export async function getBookingsByClubId(clubId: string): Promise<Booking[]> {
    const url = new URL('/api/bookings', window.location.origin);
    url.searchParams.append('clubId', clubId);
    return await fetcher(url.toString());
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
  // The API returns the full booking object in the 'booking' field
  return (response as any).booking;
}

export async function unblockTimeSlot(bookingId: string): Promise<void> {
    await fetcher(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
    });
}

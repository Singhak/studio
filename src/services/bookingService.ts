
import type { CreateBookingPayload, CreateBookingResponse, Booking } from '@/lib/types';
import { getApiBaseUrl, getApiAuthHeaders } from '@/lib/apiUtils';

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
  const apiUrl = `${getApiBaseUrl()}/bookings`;
  try {
    const authHeaders = await getApiAuthHeaders(true); // true for POST
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();
    if (!response.ok) {
      const errorMessage = responseBody?.message || `Booking creation failed: ${response.statusText} (${response.status})`;
      throw new Error(errorMessage);
    }
    return responseBody as CreateBookingResponse;
  } catch (error) {
    console.error('Error creating booking in service:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during booking creation.');
    }
  }
}

export async function getBookingStatus(bookingId: string): Promise<{ status: Booking['status'] } | null> {
  const apiUrl = `${getApiBaseUrl()}/bookings/${bookingId}/status`;
  try {
    const authHeaders = await getApiAuthHeaders(false); // false for GET
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorBody = await response.json().catch(() => ({ message: `Failed to get booking status: ${response.statusText} (${response.status})` }));
      throw new Error(errorBody.message);
    }
    return await response.json() as { status: Booking['status'] };
  } catch (error) {
    console.error(`Error fetching status for booking ${bookingId}:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while fetching booking status.');
    }
  }
}

export async function getBookingsForServiceOnDate(serviceId: string, date: string): Promise<Booking[]> {
  const apiUrl = `${getApiBaseUrl()}/bookings?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`;
  try {
    const authHeaders = await getApiAuthHeaders(false); // false for GET
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to get bookings: ${response.statusText} (${response.status})` }));
      throw new Error(errorBody.message);
    }
    return await response.json() as Booking[];
  } catch (error) {
    console.error(`Error fetching bookings for service ${serviceId} on ${date}:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while fetching bookings.');
    }
  }
}

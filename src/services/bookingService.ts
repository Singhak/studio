
import type { CreateBookingPayload, CreateBookingResponse, Booking } from '@/lib/types';
import { getApiBaseUrl, authedFetch, getApiAuthHeaders } from '@/lib/apiUtils';

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
  const apiUrlPath = `/bookings`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'POST',
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
  const apiUrlPath = `/bookings/${bookingId}/status`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'GET',
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
  const apiUrlPath = `/bookings/service/${encodeURIComponent(serviceId)}/date/${encodeURIComponent(date)}`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'GET',
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

export async function getBookingsByUserId(userId: string): Promise<Booking[]> {
  const apiUrlPath = `/bookings/my-bookings`;
  const authheaders = await getApiAuthHeaders();
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'GET',
      headers: authheaders,
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to get user bookings: ${response.statusText}` }));
      throw new Error(errorBody.message);
    }
    return await response.json() as Booking[];
  } catch (error) {
    console.error(`Error fetching bookings for user ${userId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('An unexpected error occurred while fetching user bookings.');
  }
}

export async function getBookingsByClubId(clubId: string): Promise<Booking[]> {
  const apiUrlPath = `bookings/club/${encodeURIComponent(clubId)}`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'GET',
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to get club bookings: ${response.statusText}` }));
      throw new Error(errorBody.message);
    }
    return await response.json() as Booking[];
  } catch (error) {
    console.error(`Error fetching bookings for club ${clubId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('An unexpected error occurred while fetching club bookings.');
  }
}

export async function updateBookingStatus(bookingId: string, status: string, notes?: string): Promise<Booking> {
  const apiUrlPath = `/bookings/${bookingId}`;
  const authheaders = await getApiAuthHeaders();
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'POST',
      headers: authheaders,
      body: JSON.stringify({ status, notes }),
    })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to update club bookings: ${response.statusText}` }));
      throw new Error(errorBody.message);
    }
    return await response.json() as Booking;
  } catch (error) {
    console.error(`Error updating booking status for ${bookingId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('An unexpected error occurred while updating bookings status');
  }
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
  const response = await createBooking(bookingPayload as any); // Using 'any' to bypass strict CreateBookingResponse type for now
  return response as unknown as Booking;
}

export async function unblockTimeSlot(bookingId: string): Promise<void> {
  const apiUrlPath = `/bookings/${bookingId}`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'DELETE',
    });
    if (!response.ok) {
       const errorBody = await response.json().catch(() => ({ message: `Failed to unblock slot: ${response.statusText}` }));
       throw new Error(errorBody.message);
    }
    // No content is expected on successful deletion
  } catch (error) {
    console.error(`Error unblocking time slot ${bookingId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('An unexpected error occurred while unblocking the time slot.');
  }
}

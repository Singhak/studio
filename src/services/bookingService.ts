
import type { CreateBookingPayload, CreateBookingResponse, Booking } from '@/lib/types';

const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path, correctly targets internal Next.js API routes
    return '/api';
  }
  // Server-side: use absolute path.
  // NEXT_PUBLIC_APP_URL should be set to the application's root URL (e.g., http://localhost:3000 or https://yourdomain.com)
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Changed default port
  // Remove trailing slash from baseUrl if present to prevent double slashes
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  return `${baseUrl}/api`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function createBooking(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
  const apiUrl = `${getApiBaseUrl()}/bookings`;
  try {
    const authHeaders = await getAuthHeaders();
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
    const authHeaders = await getAuthHeaders(); // Content-Type not strictly needed for GET but fine
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


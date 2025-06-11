
import type { CreateBookingPayload, CreateBookingResponse } from '@/lib/types';

const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
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

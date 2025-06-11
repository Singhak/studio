
import type { Club, ClubAddress, ClubLocationGeo } from '@/lib/types';

// Key for storing custom access token, must match the one in AuthContext.tsx
const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

function getApiBaseUrl(): string {
  // For client-side calls, always use relative path to ensure cookies/auth headers are sent correctly.
  if (typeof window !== 'undefined') {
    return '/api';
  }
  // For server-side calls (e.g., from other API routes or Server Components if this service was used there),
  // use the full URL.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  return `${baseUrl}/api`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json', // Default content type for POST/PUT
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function getAllClubs(): Promise<Club[]> {
  const apiUrl = `${getApiBaseUrl()}/clubs`;
  try {
    const authHeaders = await getAuthHeaders();
    // For GET requests, Content-Type is not strictly necessary but Authorization might be
    const { 'Content-Type': _, ...getHeaders } = authHeaders; // Remove Content-Type for GET

    const response = await fetch(apiUrl, { headers: getHeaders });
    if (!response.ok) {
      throw new Error(`Failed to fetch clubs: ${response.statusText} (${response.status}) from ${apiUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching all clubs:', error);
    throw error;
  }
}

export async function getClubById(clubId: string): Promise<Club | null> {
  const apiUrl = `${getApiBaseUrl()}/clubs/${clubId}`;
  try {
    const authHeaders = await getAuthHeaders();
    const { 'Content-Type': _, ...getHeaders } = authHeaders;

    const response = await fetch(apiUrl, { headers: getHeaders });
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch club ${clubId}: ${response.statusText} (${response.status}) from ${apiUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching club by ID ${clubId}:`, error);
    throw error;
  }
}

export async function getClubsByOwnerId(ownerId: string): Promise<Club[]> {
  const apiUrl = `${getApiBaseUrl()}/clubs/owner/${ownerId}`;
  try {
    const authHeaders = await getAuthHeaders();
    const { 'Content-Type': _, ...getHeaders } = authHeaders;

    const response = await fetch(apiUrl, { headers: getHeaders });
    if (!response.ok) {
      throw new Error(`Failed to fetch clubs for owner ${ownerId}: ${response.statusText} (${response.status}) from ${apiUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching clubs by owner ID ${ownerId}:`, error);
    throw error;
  }
}

export async function getLoggedInOwnerClubs(): Promise<Club[]> {
  const apiUrl = `${getApiBaseUrl()}/clubs/my-owned`;
  try {
    const authHeaders = await getAuthHeaders();
    const { 'Content-Type': _, ...getHeaders } = authHeaders;

    const response = await fetch(apiUrl, {
       headers: getHeaders
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch logged-in owner's clubs: ${response.statusText} (${response.status}) from ${apiUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching logged-in owner's clubs:", error);
    throw error;
  }
}

interface RegisterClubPayload {
  name: string;
  address: ClubAddress;
  location: ClubLocationGeo;
  description: string;
  contactEmail?: string;
  contactPhone?: string;
  images: string[]; // Array of image URLs
  amenities: string[];
}

export async function registerClub(clubData: RegisterClubPayload): Promise<Club> {
  const apiUrl = `${getApiBaseUrl()}/clubs`;
  try {
    const authHeaders = await getAuthHeaders(); // This will include 'Content-Type': 'application/json'
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(clubData),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      const errorMessage = responseBody?.message || `Club registration failed: ${response.statusText} (${response.status})`;
      throw new Error(errorMessage);
    }
    return responseBody as Club;
  } catch (error) {
    console.error('Error registering club in service:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during club registration.');
    }
  }
}


import type { Club, ClubAddress, ClubLocationGeo, Service } from '@/lib/types';

const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path
    return '/api';
  }
  // Server-side: use absolute path from environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  return `${baseUrl}/api`;
}

async function getAuthHeaders(isPostOrPutOrDelete: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  if (isPostOrPutOrDelete) {
    headers['Content-Type'] = 'application/json';
  }
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
    const authHeaders = await getAuthHeaders(false);
    const response = await fetch(apiUrl, { headers: authHeaders });
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
    const authHeaders = await getAuthHeaders(false);
    const response = await fetch(apiUrl, { headers: authHeaders });
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
    const authHeaders = await getAuthHeaders(false);
    const response = await fetch(apiUrl, { headers: authHeaders });
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
    const authHeaders = await getAuthHeaders(false);
    const response = await fetch(apiUrl, { headers: authHeaders });
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
  images: string[];
  amenities: string[];
}

export async function registerClub(clubData: RegisterClubPayload): Promise<Club> {
  const apiUrl = `${getApiBaseUrl()}/clubs`;
  try {
    const authHeaders = await getAuthHeaders(true);
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

export type AddServicePayload = Omit<Service, '_id' | 'createdAt' | 'updatedAt' | '__v'>;

export async function addClubService(serviceData: AddServicePayload): Promise<Service> {
  const apiUrl = `${getApiBaseUrl()}/services`;
  try {
    const authHeaders = await getAuthHeaders(true);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(serviceData),
    });

    const responseBody = await response.json();
    if (!response.ok) {
      const errorMessage = responseBody?.message || `Failed to add service: ${response.statusText} (${response.status})`;
      throw new Error(errorMessage);
    }
    return responseBody as Service;
  } catch (error) {
    console.error('Error adding club service:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while adding the service.');
    }
  }
}

export async function getServicesByClubId(clubId: string): Promise<Service[]> {
  const apiUrl = `${getApiBaseUrl()}/services/club/${clubId}`;
  try {
    const authHeaders = await getAuthHeaders(false);
    const response = await fetch(apiUrl, { headers: authHeaders });
    if (!response.ok) {
      if (response.status === 404) { // Or handle based on API spec if 404 means no services vs club not found
        return []; // Club found, but no services
      }
      throw new Error(`Failed to fetch services for club ${clubId}: ${response.statusText} (${response.status}) from ${apiUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching services for club ID ${clubId}:`, error);
    throw error;
  }
}


import type { Club, ClubAddress, ClubLocationGeo } from '@/lib/types';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  return `${baseUrl}/api`;
}

export async function getAllClubs(): Promise<Club[]> {
  const apiUrl = `${getApiBaseUrl()}/clubs`;
  try {
    const response = await fetch(apiUrl);
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
    const response = await fetch(apiUrl);
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
    const response = await fetch(apiUrl);
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
    const response = await fetch(apiUrl, {
      // In a real app, you would include an Authorization header:
      // headers: {
      //   'Authorization': `Bearer ${your_access_token}`
      // }
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
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add Authorization header if needed, e.g., `Bearer ${accessToken}` from AuthContext
      },
      body: JSON.stringify(clubData),
    });

    const responseBody = await response.json(); // Try to parse JSON regardless of response.ok

    if (!response.ok) {
      // Use message from API response if available, otherwise default
      const errorMessage = responseBody?.message || `Club registration failed: ${response.statusText} (${response.status})`;
      throw new Error(errorMessage);
    }
    return responseBody as Club; // Assuming the response body is the created Club object
  } catch (error) {
    console.error('Error registering club in service:', error);
    // Re-throw the error so the calling component can handle it (e.g., show a toast)
    // If it's already an Error object with a message, rethrow it. Otherwise, wrap it.
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during club registration.');
    }
  }
}

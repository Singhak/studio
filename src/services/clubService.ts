
import type { Club, ClubAddress, ClubLocationGeo, Service } from '@/lib/types';
import { getApiBaseUrl, authedFetch } from '@/lib/apiUtils';

export async function getAllClubs(): Promise<Club[]> {
  const apiUrlPath = `/clubs`;
  try {
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch clubs: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching all clubs:', error);
    throw error;
  }
}

export async function getClubById(clubId: string): Promise<Club | null> {
  const apiUrlPath = `/clubs/${clubId}`;
  try {
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch club ${clubId}: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching club by ID ${clubId}:`, error);
    throw error;
  }
}

export async function getClubsByOwnerId(ownerId: string): Promise<Club[]> {
  const apiUrlPath = `/clubs/owner/${ownerId}`;
  try {
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch clubs for owner ${ownerId}: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching clubs by owner ID ${ownerId}:`, error);
    throw error;
  }
}

export async function getLoggedInOwnerClubs(): Promise<Club[]> {
  const apiUrlPath = `/clubs/my-owned`;
  try {
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch logged-in owner's clubs: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
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
  const apiUrlPath = `/clubs`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'POST',
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
  const apiUrlPath = `/services`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'POST',
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
  const apiUrlPath = `/services/club/${clubId}`;
  try {
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      if (response.status === 404) { 
        return []; 
      }
      throw new Error(`Failed to fetch services for club ${clubId}: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching services for club ID ${clubId}:`, error);
    throw error;
  }
}

export async function getServiceById(serviceId: string): Promise<Service | null> {
  const apiUrlPath = `/services/${serviceId}`;
  try {
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch service ${serviceId}: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching service by ID ${serviceId}:`, error);
    throw error;
  }
}

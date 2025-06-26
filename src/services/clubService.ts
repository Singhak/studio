
import type { Club, ClubAddress, ClubLocationGeo, Service } from '@/lib/types';
import { getApiBaseUrl, authedFetch } from '@/lib/apiUtils';
import { getCachedClubEntry, setCachedClubEntry, isCacheEntryValid, clearClubCache } from '@/lib/cacheUtils';

export async function getAllClubs(): Promise<Club[]> {
  const apiUrlPath = `/clubs`;
  // Note: Caching for list views like getAllClubs is more complex due to potential pagination, filtering, etc.
  // For this iteration, only detail views (getClubById, getServicesByClubId) are cached.
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
  const cachedEntry = getCachedClubEntry(clubId);

  if (cachedEntry && cachedEntry.clubData && isCacheEntryValid(cachedEntry)) {
    console.log(`[CACHE] Club ${clubId}: Using cached clubData.`);
    return cachedEntry.clubData;
  }

  const apiUrlPath = `/clubs/${clubId}`;
  try {
    console.log(`[API] Club ${clubId}: Fetching fresh clubData.`);
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch club ${clubId}: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
    }
    const fetchedClub = await response.json();
    if (fetchedClub) {
      setCachedClubEntry(clubId, { clubData: fetchedClub });
    }
    return fetchedClub;
  } catch (error) {
    console.error(`Error fetching club by ID ${clubId}:`, error);
    throw error;
  }
}

export async function getClubsByOwnerId(ownerId: string): Promise<Club[]> {
  const apiUrlPath = `/clubs/owner/${ownerId}`;
  // Caching not implemented for this list view in this iteration.
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
  // Caching not implemented for this list view in this iteration.
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
    // After registering, we might want to cache this new club's data.
    if (responseBody && responseBody._id) {
      setCachedClubEntry(responseBody._id, { clubData: responseBody as Club });
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

export type UpdateClubPayload = Pick<Club, 'name' | 'address' | 'location' | 'description' | 'images' | 'amenities' | 'contactEmail' | 'contactPhone'>;

export async function updateClub(clubId: string, payload: UpdateClubPayload): Promise<Club> {
  const apiUrlPath = `/clubs/${clubId}`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();
    if (!response.ok) {
      const errorMessage = responseBody?.message || `Club update failed: ${response.statusText} (${response.status})`;
      throw new Error(errorMessage);
    }

    // Invalidate cache after successful update
    clearClubCache(clubId);

    return responseBody as Club;
  } catch (error) {
    console.error(`Error updating club ${clubId} in service:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during club update.');
    }
  }
}

export async function updateClubAdminStatus(clubId: string, payload: { isActive?: boolean; isFeatured?: boolean }): Promise<Club> {
  const apiUrlPath = `/clubs/${clubId}`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();
    if (!response.ok) {
      const errorMessage = responseBody?.message || `Failed to update club status: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // Invalidate cache after successful update to ensure fresh data on next load
    clearClubCache(clubId);

    return responseBody as Club;
  } catch (error) {
    console.error(`Error updating club ${clubId} status in service:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during club status update.');
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
    // After adding a service, invalidate the services cache for the parent club.
    if (serviceData.club) {
      const existingEntry = getCachedClubEntry(serviceData.club);
      if (existingEntry) {
        setCachedClubEntry(serviceData.club, { servicesData: null }); // Mark services as needing refresh
        // Or fetch services again and update, for simplicity, just mark for refresh
        console.log(`[CACHE] Club ${serviceData.club}: Services cache marked for refresh after adding new service.`);
      }
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
  const cachedEntry = getCachedClubEntry(clubId);

  if (cachedEntry && cachedEntry.servicesData && isCacheEntryValid(cachedEntry)) {
    console.log(`[CACHE] Club ${clubId}: Using cached servicesData.`);
    return cachedEntry.servicesData;
  }

  const apiUrlPath = `/services/club/${clubId}`;
  try {
    console.log(`[API] Club ${clubId}: Fetching fresh servicesData.`);
    const response = await authedFetch(apiUrlPath);
    if (!response.ok) {
      if (response.status === 404) {
        setCachedClubEntry(clubId, { servicesData: [] }); // Cache empty services if 404
        return [];
      }
      throw new Error(`Failed to fetch services for club ${clubId}: ${response.statusText} (${response.status}) from ${getApiBaseUrl()}${apiUrlPath}`);
    }
    const fetchedServices = await response.json();
    if (fetchedServices) {
      setCachedClubEntry(clubId, { servicesData: fetchedServices });
    }
    return fetchedServices || [];
  } catch (error) {
    console.error(`Error fetching services for club ID ${clubId}:`, error);
    throw error;
  }
}

export async function getServiceById(serviceId: string): Promise<Service | null> {
  const apiUrlPath = `/services/${serviceId}`;
  // Caching for individual services by their own ID is not part of this iteration.
  // They are cached as part of their parent club's entry.
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

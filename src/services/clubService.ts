
import type { Club, Service, AddServicePayload, UpdateClubPayload } from '@/lib/types';

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

export async function getAllClubs(): Promise<Club[]> {
  return await fetcher('/api/clubs');
}

export async function getClubById(clubId: string): Promise<Club | null> {
  return await fetcher(`/api/clubs/${clubId}`);
}

export async function getClubsByOwnerId(ownerId: string): Promise<Club[]> {
    return await fetcher(`/api/clubs/owner/${ownerId}`);
}

export async function getLoggedInOwnerClubs(): Promise<Club[]> {
    return await fetcher('/api/clubs/my-owned');
}

export async function registerClub(clubData: Omit<UpdateClubPayload, 'images'> & { images?: FileList | string[] }): Promise<Club> {
    const payload = { ...clubData, images: Array.isArray(clubData.images) ? clubData.images : [] };
    return await fetcher('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function updateClub(clubId: string, payload: UpdateClubPayload): Promise<Club> {
    return await fetcher(`/api/clubs/${clubId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function updateClubAdminStatus(clubId: string, payload: { isActive?: boolean; isFeatured?: boolean }): Promise<Club> {
    return await fetcher(`/api/clubs/${clubId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function addClubService(serviceData: AddServicePayload): Promise<Service> {
    return await fetcher('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
    });
}

export async function getServicesByClubId(clubId: string): Promise<Service[]> {
    return await fetcher(`/api/services/club/${clubId}`);
}

export async function getServiceById(serviceId: string): Promise<Service | null> {
    return await fetcher(`/api/services/${serviceId}`);
}

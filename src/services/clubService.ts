
import type { Club, ClubAddress, ClubLocationGeo, Service, AddServicePayload, UpdateClubPayload } from '@/lib/types';
import { mockClubs, mockServices } from '@/lib/mockData';
import { getCachedClubEntry, setCachedClubEntry, isCacheEntryValid, clearClubCache } from '@/lib/cacheUtils';

// Client-side in-memory store to simulate a database for a static site.
// Deep copy to prevent modifying the original mockData array during operations.
let clubsStore: Club[] = JSON.parse(JSON.stringify(mockClubs));
let servicesStore: Service[] = JSON.parse(JSON.stringify(mockServices));

const MOCK_LOGGED_IN_OWNER_ID = 'owner123';

function transformClub(club: Club): Club {
  const clubServices = servicesStore.filter(service => service.club === club._id).map(service => ({
      ...service,
      _id: service._id || `service_${Date.now()}`,
      club: club._id,
  }));
  return {
    ...club,
    services: clubServices,
  };
}

export async function getAllClubs(): Promise<Club[]> {
  return clubsStore.map(transformClub);
}

export async function getClubById(clubId: string): Promise<Club | null> {
  const cachedEntry = getCachedClubEntry(clubId);

  if (cachedEntry && cachedEntry.clubData && isCacheEntryValid(cachedEntry)) {
    console.log(`[CACHE] Club ${clubId}: Using cached clubData.`);
    return cachedEntry.clubData;
  }

  console.log(`[LOCAL] Club ${clubId}: Fetching from local store.`);
  const club = clubsStore.find((c) => c.id === clubId || c._id === clubId);
  if (!club) {
    return null;
  }
  const transformed = transformClub(club);
  setCachedClubEntry(clubId, { clubData: transformed });
  return transformed;
}

export async function getClubsByOwnerId(ownerId: string): Promise<Club[]> {
  return clubsStore
    .filter((c) => c.ownerId === ownerId || c.owner === ownerId)
    .map(transformClub);
}

export async function getLoggedInOwnerClubs(): Promise<Club[]> {
  return clubsStore
    .filter((c) => c.ownerId === MOCK_LOGGED_IN_OWNER_ID || c.owner === MOCK_LOGGED_IN_OWNER_ID)
    .map(transformClub);
}

export async function registerClub(clubData: UpdateClubPayload): Promise<Club> {
  const newClub: Club = {
    _id: `club_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    owner: MOCK_LOGGED_IN_OWNER_ID,
    ownerId: MOCK_LOGGED_IN_OWNER_ID,
    name: clubData.name,
    address: clubData.address,
    location: clubData.location,
    description: clubData.description,
    contactEmail: clubData.contactEmail,
    contactPhone: clubData.contactPhone,
    images: clubData.images || [],
    amenities: clubData.amenities || [],
    services: [],
    averageRating: 0,
    reviewCount: 0,
    isActive: true,
    isDeleted: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0,
  };
  clubsStore.push(newClub);
  console.log("Club registered (client-side mock):", newClub);
  return newClub;
}

export async function updateClub(clubId: string, payload: UpdateClubPayload): Promise<Club> {
    const clubIndex = clubsStore.findIndex((c) => c._id === clubId);
    if (clubIndex === -1) {
        throw new Error('Club not found for update.');
    }
    const originalClub = clubsStore[clubIndex];
    const updatedClub: Club = {
        ...originalClub,
        ...payload,
        updatedAt: new Date().toISOString(),
    };
    clubsStore[clubIndex] = updatedClub;
    clearClubCache(clubId);
    console.log(`Club ${clubId} updated (client-side mock):`, updatedClub);
    return updatedClub;
}

export async function updateClubAdminStatus(clubId: string, payload: { isActive?: boolean; isFeatured?: boolean }): Promise<Club> {
  const clubIndex = clubsStore.findIndex((c) => c._id === clubId);
  if (clubIndex === -1) {
    throw new Error("Club not found for status update.");
  }
  const updatedClub = { ...clubsStore[clubIndex], ...payload, updatedAt: new Date().toISOString() };
  clubsStore[clubIndex] = updatedClub;
  clearClubCache(clubId);
  console.log(`Club ${clubId} status updated (client-side mock):`, updatedClub);
  return updatedClub;
}

export async function addClubService(serviceData: AddServicePayload): Promise<Service> {
  const newService: Service = {
    ...serviceData,
    _id: `service_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  servicesStore.push(newService);
  clearClubCache(serviceData.club);
  console.log("Service added (client-side mock):", newService);
  return newService;
}

export async function getServicesByClubId(clubId: string): Promise<Service[]> {
  const cachedEntry = getCachedClubEntry(clubId);

  if (cachedEntry && cachedEntry.servicesData && isCacheEntryValid(cachedEntry)) {
    console.log(`[CACHE] Club ${clubId}: Using cached servicesData.`);
    return cachedEntry.servicesData;
  }
  
  console.log(`[LOCAL] Club ${clubId}: Fetching services from local store.`);
  const services = servicesStore.filter(s => s.club === clubId);
  setCachedClubEntry(clubId, { servicesData: services });
  return services;
}

export async function getServiceById(serviceId: string): Promise<Service | null> {
  const service = servicesStore.find(s => s._id === serviceId);
  return service || null;
}


import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo, Service } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { clubId: string } }
) {
  const clubId = params.clubId;
  const mockClubData = mockClubs.find((c) => c.id === clubId || c._id === clubId);

  if (!mockClubData) {
    return NextResponse.json({ message: 'Club not found' }, { status: 404 });
  }

  // Ensure services within the club data also conform to the updated Service type
  const clubServices: Service[] = (mockClubData.services || []).map(service => ({
      ...service, // Spread existing fields from mockService
      _id: service._id || (service as any).id || `service_${Date.now()}`, // Ensure _id
      club: mockClubData._id || mockClubData.id || '', // Ensure club foreign key
      sportType: service.sportType || mockClubData.sport || "Tennis",
      hourlyPrice: service.hourlyPrice || (service as any).price || 0,
      capacity: service.capacity || 2,
      slotDurationMinutes: service.slotDurationMinutes || (service as any).durationMinutes || 60,
      isActive: service.isActive !== undefined ? service.isActive : true,
      availableDays: service.availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      openingTime: service.openingTime || "09:00",
      closingTime: service.closingTime || "21:00",
  }));

  const clubResponse: Club = {
    _id: mockClubData._id || mockClubData.id || `club_${Date.now()}`,
    owner: mockClubData.owner || mockClubData.ownerId || `owner_for_${mockClubData.id}`,
    name: mockClubData.name,
    address: mockClubData.address || {
      street: "123 Mock Street",
      city: "Sportsville",
      state: "CA",
      zipCode: "90000",
    } as ClubAddress,
    location: mockClubData.location || {
      type: "Point",
      coordinates: [-118.4004, 33.9850], // Default placeholder coordinates
    } as ClubLocationGeo,
    description: mockClubData.description,
    contactEmail: mockClubData.contactEmail,
    contactPhone: mockClubData.contactPhone,
    images: mockClubData.images || ['https://placehold.co/600x400.png?text=Default+Club+Image'],
    amenities: mockClubData.amenities || [],
    services: clubServices,
    averageRating: mockClubData.averageRating || mockClubData.rating || 0,
    reviewCount: mockClubData.reviewCount || 0,
    isActive: mockClubData.isActive !== undefined ? mockClubData.isActive : true,
    isDeleted: mockClubData.isDeleted !== undefined ? mockClubData.isDeleted : false,
    isFeatured: mockClubData.isFeatured || mockClubData.isFavorite || false,
    createdAt: mockClubData.createdAt || new Date().toISOString(),
    updatedAt: mockClubData.updatedAt || new Date().toISOString(),
    sport: mockClubData.sport,
    isFavorite: mockClubData.isFavorite,
    __v: (mockClubData as any).__v || 0,
  };

  return NextResponse.json(clubResponse);
}

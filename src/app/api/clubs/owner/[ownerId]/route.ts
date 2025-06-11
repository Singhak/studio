
import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo, Service } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { ownerId: string } }
) {
  const ownerId = params.ownerId;

  if (!ownerId) {
    return NextResponse.json({ message: 'Owner ID is required' }, { status: 400 });
  }

  const ownerClubsFromMock = mockClubs.filter((c) => c.ownerId === ownerId || c.owner === ownerId);

  if (ownerClubsFromMock.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const transformedClubs: Club[] = ownerClubsFromMock.map(mockClubData => {
    const clubServices: Service[] = (mockClubData.services || []).map(service => ({
        ...service,
        _id: service._id || (service as any).id || `service_${Date.now()}`,
        club: mockClubData._id || mockClubData.id || '',
        sportType: service.sportType || mockClubData.sport || "Tennis",
        hourlyPrice: service.hourlyPrice || (service as any).price || 0,
        capacity: service.capacity || 2,
        slotDurationMinutes: service.slotDurationMinutes || (service as any).durationMinutes || 60,
        isActive: service.isActive !== undefined ? service.isActive : true,
        availableDays: service.availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        openingTime: service.openingTime || "09:00",
        closingTime: service.closingTime || "21:00",
    }));

    return {
      _id: mockClubData._id || mockClubData.id || `club_${Date.now()}`,
      owner: mockClubData.owner || mockClubData.ownerId,
      name: mockClubData.name,
      address: mockClubData.address || {
        street: "123 Mock Street",
        city: "Sportsville",
        state: "CA",
        zipCode: "90000",
      } as ClubAddress,
      location: mockClubData.location || {
        type: "Point",
        coordinates: [-118.4004, 33.9850],
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
      createdAt: mockClubData.createdAt ||new Date().toISOString(),
      updatedAt: mockClubData.updatedAt || new Date().toISOString(),
      sport: mockClubData.sport,
      isFavorite: mockClubData.isFavorite,
      __v: (mockClubData as any).__v || 0,
    };
  });

  return NextResponse.json(transformedClubs);
}

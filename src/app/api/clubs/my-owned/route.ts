
import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo } from '@/lib/types';

const MOCK_LOGGED_IN_OWNER_ID = 'owner123'; // Simulate a logged-in owner

export async function GET(request: Request) {
  const ownerClubsFromMock = mockClubs.filter((c) => c.ownerId === MOCK_LOGGED_IN_OWNER_ID);

  if (ownerClubsFromMock.length === 0) {
    return NextResponse.json([], { status: 200 }); // Return empty array if no clubs for this owner
  }

  const transformedClubs: Club[] = ownerClubsFromMock.map(mockClubData => {
    return {
      _id: mockClubData.id,
      owner: mockClubData.ownerId,
      name: mockClubData.name,
      address: {
        street: mockClubData.address?.street || "123 Mock Street",
        city: mockClubData.address?.city || mockClubData.location?.split(',')[1]?.trim() || "Sportsville",
        state: mockClubData.address?.state || "CA",
        zipCode: mockClubData.address?.zipCode || "90000",
      } as ClubAddress,
      location: {
        type: "Point",
        coordinates: (mockClubData.location && typeof mockClubData.location === 'object' && 'coordinates' in mockClubData.location && Array.isArray(mockClubData.location.coordinates) && mockClubData.location.coordinates.length === 2)
          ? mockClubData.location.coordinates
          : [0, 0], // Default coordinates
      } as ClubLocationGeo,
      description: mockClubData.description,
      contactEmail: mockClubData.contactEmail,
      contactPhone: mockClubData.contactPhone,
      images: mockClubData.images || ['https://placehold.co/600x400.png?text=Default+Club+Image'],
      amenities: mockClubData.amenities || [],
      services: mockClubData.services || [],
      averageRating: mockClubData.rating || 0,
      reviewCount: 0, // Default value
      isActive: true, // Default value
      isDeleted: false, // Default value
      isFeatured: mockClubData.isFavorite || false,
      createdAt: new Date().toISOString(), // Default value
      updatedAt: new Date().toISOString(), // Default value
      sport: mockClubData.sport,
      isFavorite: mockClubData.isFavorite,
      // __v: 0 // This field is often added by MongoDB, not usually part of the model directly
    };
  });

  return NextResponse.json(transformedClubs);
}

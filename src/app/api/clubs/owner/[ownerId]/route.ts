
import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { ownerId: string } }
) {
  const ownerId = params.ownerId;

  if (!ownerId) {
    return NextResponse.json({ message: 'Owner ID is required' }, { status: 400 });
  }

  const ownerClubsFromMock = mockClubs.filter((c) => c.ownerId === ownerId);

  if (ownerClubsFromMock.length === 0) {
    return NextResponse.json([], { status: 200 }); // Return empty array if no clubs for owner
  }

  const transformedClubs: Club[] = ownerClubsFromMock.map(mockClubData => {
    // This transformation logic is similar to the one in /api/clubs/[clubId]/route.ts
    // It ensures the response structure matches the detailed Club type.
    return {
      _id: mockClubData.id, // Use mockClubData.id as _id
      owner: mockClubData.ownerId, // Use mockClubData.ownerId as owner
      name: mockClubData.name,
      address: { // Synthesize address as it's not fully structured in mockClubs
        street: mockClubData.address?.street || "123 Mock Street",
        city: mockClubData.address?.city || mockClubData.location?.split(',')[1]?.trim() || "Sportsville",
        state: mockClubData.address?.state || "CA",
        zipCode: mockClubData.address?.zipCode || "90000",
      } as ClubAddress,
      location: { // Synthesize GeoJSON location
        type: "Point",
        // Use mock coordinates if they exist and are valid, otherwise default
        coordinates: (mockClubData.location && typeof mockClubData.location === 'object' && 'coordinates' in mockClubData.location && Array.isArray(mockClubData.location.coordinates) && mockClubData.location.coordinates.length === 2)
          ? mockClubData.location.coordinates
          : [0, 0],
      } as ClubLocationGeo,
      description: mockClubData.description,
      contactEmail: mockClubData.contactEmail,
      contactPhone: mockClubData.contactPhone,
      images: mockClubData.images || ['https://placehold.co/600x400.png?text=Default+Club+Image'],
      amenities: mockClubData.amenities || [],
      services: mockClubData.services || [], // Include services if present in mock data
      averageRating: mockClubData.rating || 0, // Map rating to averageRating
      reviewCount: 0, // Default value, not in current mock
      isActive: true, // Default value
      isDeleted: false, // Default value
      isFeatured: mockClubData.isFavorite || false, // Map isFavorite to isFeatured or default
      createdAt: new Date().toISOString(), // Default value
      updatedAt: new Date().toISOString(), // Default value
      sport: mockClubData.sport,
      isFavorite: mockClubData.isFavorite,
      // __v: 0 // This field is often added by MongoDB, not usually part of the model directly
    };
  });

  return NextResponse.json(transformedClubs);
}

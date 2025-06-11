
import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { clubId: string } }
) {
  const clubId = params.clubId;
  // In a real app, you'd fetch this from a database
  const mockClubData = mockClubs.find((c) => c.id === clubId);

  if (!mockClubData) {
    return NextResponse.json({ message: 'Club not found' }, { status: 404 });
  }

  // Transform mockClubData to the detailed Club structure expected by the API response
  const clubResponse: Club = {
    _id: mockClubData.id,
    owner: mockClubData.ownerId || `owner_for_${mockClubData.id}`, // Use ownerId or a default
    name: mockClubData.name,
    address: { // Synthesize address as it's not structured in mockClubs
      street: "123 Mock Street",
      city: mockClubData.location?.split(',')[1]?.trim() || "Sportsville",
      state: "CA",
      zipCode: "90000",
      ...(mockClubData.address || {}), // Allow partial overrides if mockData ever includes it
    } as ClubAddress,
    location: { // Synthesize GeoJSON location
      type: "Point",
      coordinates: [0, 0], // Default coordinates
      ...(mockClubData.location && typeof mockClubData.location !== 'string' ? mockClubData.location : {}), // Allow override if mockData ever includes structured location
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
    isFeatured: mockClubData.isFavorite || false, // Map isFavorite or default
    createdAt: new Date().toISOString(), // Default value
    updatedAt: new Date().toISOString(), // Default value
    // Original sport and isFavorite from mockData can be added if needed for other logic,
    // but are not strictly part of the user-provided response structure for this specific API.
    sport: mockClubData.sport, 
    isFavorite: mockClubData.isFavorite,
  };

  return NextResponse.json(clubResponse);
}

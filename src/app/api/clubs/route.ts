
import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo } from '@/lib/types';

export async function GET() {
  // In a real app, you'd fetch this from a database
  const clubs: Club[] = mockClubs;
  return NextResponse.json(clubs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Basic validation (in real API, use Zod or similar)
    if (!body.name || !body.address || !body.location || !body.description) {
      return NextResponse.json({ message: 'Missing required club data (name, address, location, description)' }, { status: 400 });
    }
    if (!body.location.coordinates || body.location.coordinates.length !== 2) {
         return NextResponse.json({ message: 'Invalid location coordinates' }, { status: 400 });
    }


    console.log("Received club registration data at API:", body);

    // Simulate creating a new club
    const newClubData: Club = {
      _id: `club_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      owner: `owner_${Math.random().toString(36).substring(2, 9)}`, // Mock owner ID from a JWT or session in real app
      name: body.name,
      address: body.address as ClubAddress,
      location: body.location as ClubLocationGeo,
      description: body.description,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      images: body.images || [],
      amenities: body.amenities || [],
      // sport: body.sport, // If sport is part of the club data model and sent by client
      averageRating: 0,
      reviewCount: 0,
      isActive: true, // Default to active, pending approval perhaps
      isDeleted: false,
      isFeatured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // services: [] // Services usually added/managed separately
    };

    // Optional: Add to in-memory mockClubs for GET requests if desired for session persistence.
    // This is just for prototype behavior. A real DB would handle persistence.
    // mockClubs.push(newClubData); 

    return NextResponse.json(newClubData, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/clubs:', error);
    let message = 'Internal server error';
    let statusCode = 500;

    if (error instanceof SyntaxError) { // JSON parsing error
        message = "Invalid request body: " + error.message;
        statusCode = 400;
    } else if (error instanceof Error) {
        message = error.message; // Use specific error message if available
    }
    
    return NextResponse.json({ message }, { status: statusCode });
  }
}

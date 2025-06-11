
import { NextResponse } from 'next/server';
import { mockClubs, mockServices } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo, Service } from '@/lib/types';

export async function GET() {
  // Transform mockClubs to the detailed Club structure
  const transformedClubs: Club[] = mockClubs.map(mockClubData => {
    // Determine the services for the club. If mockClubData.services is an array of Service objects, use it.
    // If it's an array of service IDs (strings), map them to full Service objects from mockServices.
    // For this mock, mockClubData.services is already Service[] if present.
    const clubServices: Service[] = mockClubData.services || [];

    return {
      _id: mockClubData.id, // Use mockClubData.id as _id
      owner: mockClubData.ownerId || `owner_for_${mockClubData.id}`, // Use ownerId or a default
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
          : [-118.4004, 33.9850], // Default placeholder coordinates
      } as ClubLocationGeo,
      description: mockClubData.description,
      contactEmail: mockClubData.contactEmail,
      contactPhone: mockClubData.contactPhone,
      images: mockClubData.images || ['https://placehold.co/600x400.png?text=Default+Club+Image'],
      amenities: mockClubData.amenities || [],
      services: clubServices,
      averageRating: mockClubData.rating || 0, // Map rating to averageRating
      reviewCount: Math.floor(Math.random() * 50), // Default value, e.g. random number
      isActive: true, // Default value
      isDeleted: false, // Default value
      isFeatured: mockClubData.isFavorite || false, // Map isFavorite to isFeatured or default
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(), // Default value (random past date)
      updatedAt: new Date().toISOString(), // Default value
      sport: mockClubData.sport, 
      isFavorite: mockClubData.isFavorite,
      // Original id and ownerId kept for compatibility if needed by other parts of the app using old structure
      id: mockClubData.id, 
      ownerId: mockClubData.ownerId,
      // __v is often added by MongoDB, added here for matching example response
      // __v: 0 
    };
  });

  return NextResponse.json(transformedClubs);
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
    const newClubData: Club & { __v?: number } = { // Add __v to the type for the response
      _id: `club_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      owner: `owner_${Math.random().toString(36).substring(2, 9)}`, 
      name: body.name,
      address: body.address as ClubAddress,
      location: body.location as ClubLocationGeo,
      description: body.description,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      images: body.images || [],
      amenities: body.amenities || [],
      services: [], // Services are not part of this registration API call based on spec.
      // sport: body.sport, // If sport is part of the club data model and sent by client
      averageRating: 0,
      reviewCount: 0,
      isActive: true, 
      isDeleted: false,
      isFeatured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0 
    };
    
    // Optional: Add to in-memory mockClubs for GET requests if desired for session persistence.
    // This is just for prototype behavior. A real DB would handle persistence.
    // Note: If adding, ensure it's transformed to the simpler mockClubs structure if mockClubs expects that.
    // For now, we won't add to mockClubs to keep the GET /api/clubs output stable based on initial mockData.ts
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

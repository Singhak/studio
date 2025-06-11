
import { NextResponse } from 'next/server';
import { mockClubs, mockServices } from '@/lib/mockData';
import type { Club, ClubAddress, ClubLocationGeo, Service } from '@/lib/types';

export async function GET() {
  const transformedClubs: Club[] = mockClubs.map(mockClubData => {
    // Ensure services within the club data also conform to the updated Service type
    const clubServices: Service[] = (mockClubData.services || []).map(service => ({
        ...service, // Spread existing fields from mockService
        _id: service._id || service.id || `service_${Date.now()}`, // Ensure _id
        club: mockClubData._id || mockClubData.id || '', // Ensure club foreign key
        sportType: service.sportType || mockClubData.sport || "Tennis", // Default if not specified
        hourlyPrice: service.hourlyPrice || service.price || 0,
        capacity: service.capacity || 2,
        slotDurationMinutes: service.slotDurationMinutes || service.durationMinutes || 60,
        isActive: service.isActive !== undefined ? service.isActive : true,
        availableDays: service.availableDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        openingTime: service.openingTime || "09:00",
        closingTime: service.closingTime || "21:00",
    }));

    return {
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
      reviewCount: mockClubData.reviewCount || Math.floor(Math.random() * 50),
      isActive: mockClubData.isActive !== undefined ? mockClubData.isActive : true,
      isDeleted: mockClubData.isDeleted !== undefined ? mockClubData.isDeleted : false,
      isFeatured: mockClubData.isFeatured || mockClubData.isFavorite || false,
      createdAt: mockClubData.createdAt || new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      updatedAt: mockClubData.updatedAt || new Date().toISOString(),
      sport: mockClubData.sport,
      isFavorite: mockClubData.isFavorite,
      id: mockClubData.id,
      ownerId: mockClubData.ownerId,
      __v: (mockClubData as any).__v || 0,
    };
  });

  return NextResponse.json(transformedClubs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.address || !body.location || !body.description) {
      return NextResponse.json({ message: 'Missing required club data (name, address, location, description)' }, { status: 400 });
    }
    if (!body.location.coordinates || body.location.coordinates.length !== 2) {
         return NextResponse.json({ message: 'Invalid location coordinates' }, { status: 400 });
    }

    const newClubData: Club & { __v?: number } = {
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
      services: [], // Services are added/managed separately
      averageRating: 0,
      reviewCount: 0,
      isActive: true,
      isDeleted: false,
      isFeatured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0
    };

    return NextResponse.json(newClubData, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/clubs:', error);
    let message = 'Internal server error';
    let statusCode = 500;

    if (error instanceof SyntaxError) {
        message = "Invalid request body: " + error.message;
        statusCode = 400;
    } else if (error instanceof Error) {
        message = error.message;
    }
    
    return NextResponse.json({ message }, { status: statusCode });
  }
}

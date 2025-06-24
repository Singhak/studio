
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


export async function PUT(
  request: Request,
  { params }: { params: { clubId: string } }
) {
  const clubId = params.clubId;
  const clubIndex = mockClubs.findIndex((c) => c.id === clubId || c._id === clubId);

  if (clubIndex === -1) {
    return NextResponse.json({ message: 'Club not found' }, { status: 404 });
  }

  try {
    const body = await request.json();

    // Basic validation
    if (!body.name || !body.address || !body.location || !body.description) {
      return NextResponse.json({ message: 'Missing required club data' }, { status: 400 });
    }
    
    const originalClub = mockClubs[clubIndex];

    const updatedClubData: Club = {
      ...originalClub, // Keep original fields like owner, ratings etc.
      name: body.name,
      address: body.address as ClubAddress,
      location: body.location as ClubLocationGeo,
      description: body.description,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      images: body.images || originalClub.images, // Use new images if provided, else keep old
      amenities: body.amenities || originalClub.amenities,
      updatedAt: new Date().toISOString(),
    };

    // Simulate updating the mock data store
    mockClubs[clubIndex] = updatedClubData;

    console.log(`Club ${clubId} updated (mock):`, updatedClubData);

    return NextResponse.json(updatedClubData, { status: 200 });

  } catch (error) {
    console.error(`Error in PUT /api/clubs/${clubId}:`, error);
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

export async function PATCH(
  request: Request,
  { params }: { params: { clubId: string } }
) {
  const clubId = params.clubId;
  const clubIndex = mockClubs.findIndex((c) => c.id === clubId || c._id === clubId);

  if (clubIndex === -1) {
    return NextResponse.json({ message: 'Club not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { isActive, isFeatured } = body;

    const originalClub = mockClubs[clubIndex];
    
    const updatedClubData: Club = { ...originalClub };
    
    if (typeof isActive === 'boolean') {
      updatedClubData.isActive = isActive;
    }
    if (typeof isFeatured === 'boolean') {
      updatedClubData.isFeatured = isFeatured;
    }
    
    updatedClubData.updatedAt = new Date().toISOString();

    // Simulate updating the mock data store
    mockClubs[clubIndex] = updatedClubData;

    console.log(`Club ${clubId} status updated (mock):`, { isActive: updatedClubData.isActive, isFeatured: updatedClubData.isFeatured });

    return NextResponse.json(updatedClubData, { status: 200 });

  } catch (error) {
    console.error(`Error in PATCH /api/clubs/${clubId}:`, error);
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

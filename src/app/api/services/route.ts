
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Service, SportType, DayOfWeek } from '@/lib/types';
import { SPORTS_TYPES, DAYS_OF_WEEK } from '@/lib/types';

// In-memory store for mock services (for demonstration purposes)
// In a real app, this would be a database.
let servicesStore: Service[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation (use Zod for robust validation in a real app)
    if (!body.club || typeof body.club !== 'string') {
      return NextResponse.json({ message: 'Club ID (club) is required and must be a string.' }, { status: 400 });
    }
    if (!body.name || typeof body.name !== 'string' || body.name.length < 3) {
      return NextResponse.json({ message: 'Service name (name) is required and must be at least 3 characters.' }, { status: 400 });
    }
    if (!body.sportType || !SPORTS_TYPES.includes(body.sportType as SportType)) {
      return NextResponse.json({ message: `Invalid or missing sportType. Must be one of: ${SPORTS_TYPES.join(', ')}` }, { status: 400 });
    }
    if (body.hourlyPrice === undefined || typeof body.hourlyPrice !== 'number' || body.hourlyPrice <= 0) {
      return NextResponse.json({ message: 'Hourly price (hourlyPrice) is required and must be a positive number.' }, { status: 400 });
    }
    if (body.capacity === undefined || typeof body.capacity !== 'number' || body.capacity <= 0) {
      return NextResponse.json({ message: 'Capacity (capacity) is required and must be a positive integer.' }, { status: 400 });
    }
    if (body.availableDays && (!Array.isArray(body.availableDays) || !body.availableDays.every((day: string) => DAYS_OF_WEEK.includes(day as DayOfWeek)))) {
        return NextResponse.json({ message: `Invalid availableDays. Must be an array of: ${DAYS_OF_WEEK.join(', ')}` }, { status: 400 });
    }
    // Add more validations for openingTime, closingTime, slotDurationMinutes, images, etc. as needed

    const newService: Service = {
      _id: `service_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      club: body.club,
      name: body.name,
      sportType: body.sportType as SportType,
      hourlyPrice: body.hourlyPrice,
      capacity: body.capacity,
      description: body.description || undefined,
      images: body.images || [],
      isActive: body.isActive !== undefined ? body.isActive : true,
      availableDays: body.availableDays || [...DAYS_OF_WEEK],
      openingTime: body.openingTime || "09:00",
      closingTime: body.closingTime || "21:00",
      slotDurationMinutes: body.slotDurationMinutes || 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
    };

    servicesStore.push(newService); // Add to in-memory store

    console.log("New service created (mock):", newService);
    console.log("Current servicesStore count:", servicesStore.length);


    return NextResponse.json(newService, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/services:', error);
    let message = 'Internal server error';
    let statusCode = 500;

    if (error instanceof SyntaxError) {
        message = "Invalid request body: " + error.message;
        statusCode = 400;
    } else if (error instanceof Error) {
        message = error.message;
    }
    
    return NextResponse.json({ message: message }, { status: statusCode });
  }
}

// Example GET endpoint to see stored services (for debugging during development)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    if (clubId) {
        const clubServices = servicesStore.filter(s => s.club === clubId);
        return NextResponse.json(clubServices);
    }
    return NextResponse.json(servicesStore);
}


import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { mockServices } from '@/lib/mockData'; // Using the global mock services for this route
import type { Service } from '@/lib/types';

// In a real application, servicesStore would be a database.
// For this mock, we'll filter the global mockServices.
// The POST to /api/services adds to a local 'servicesStore' in that file,
// which isn't directly accessible here without refactoring.
// So, this GET will primarily reflect services defined in mockData.ts.

export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  const clubId = params.clubId;

  if (!clubId) {
    return NextResponse.json({ message: 'Club ID is required' }, { status: 400 });
  }

  // Filter services from the global mockServices array
  const clubServicesFromMock: Service[] = mockServices.filter(s => s.club === clubId);
  
  // Note: If services are added via POST /api/services, they are added to an in-memory
  // store specific to that route.ts instance and won't be reflected here unless
  // servicesStore is made globally accessible or persisted.
  // For this prototype, we assume this route returns services associated with the club from the initial mock data.

  if (clubServicesFromMock.length === 0) {
    // It's valid for a club to have no services, return an empty array.
    // To distinguish "no services" from "club not found", a separate club check might be needed if required by design.
  }

  return NextResponse.json(clubServicesFromMock);
}

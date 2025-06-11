
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { mockServices } from '@/lib/mockData'; // Using the global mock services
import type { Service } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { serviceId: string } }
) {
  const serviceId = params.serviceId;

  if (!serviceId) {
    return NextResponse.json({ message: 'Service ID is required' }, { status: 400 });
  }

  const service = mockServices.find(s => s._id === serviceId);

  if (!service) {
    return NextResponse.json({ message: 'Service not found' }, { status: 404 });
  }

  // The service object from mockServices should already conform to the Service type
  // and the desired response structure.
  return NextResponse.json(service);
}


import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { clubId: string } }
) {
  const clubId = params.clubId;
  // In a real app, you'd fetch this from a database
  const club: Club | undefined = mockClubs.find((c) => c.id === clubId);

  if (!club) {
    return NextResponse.json({ message: 'Club not found' }, { status: 404 });
  }
  return NextResponse.json(club);
}

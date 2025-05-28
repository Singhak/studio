
import { NextResponse } from 'next/server';
import { mockClubs } from '@/lib/mockData';
import type { Club } from '@/lib/types';

export async function GET() {
  // In a real app, you'd fetch this from a database
  const clubs: Club[] = mockClubs;
  return NextResponse.json(clubs);
}

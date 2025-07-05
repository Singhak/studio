
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import type { Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getClubById } from '@/services/clubService';
import { ClubDetailsContent } from '@/components/features/clubs/ClubDetailsContent';

/**
 * In a static export (`output: 'export'`), this function tells Next.js which dynamic
 * pages to pre-render at build time. By returning an empty array, we are explicitly
 * telling Next.js *not* to pre-render any club pages. Instead, they will all be
 * rendered on the client-side, making them behave like a true Single-Page Application (SPA) route.
 */
export async function generateStaticParams() {
  return [];
}

async function getClubDetails(clubId: string): Promise<Club | null> {
  try {
    const club = await getClubById(clubId);
    return club;
  } catch (error) {
    console.error(`Failed to fetch club details for ${clubId}:`, error);
    return null;
  }
}

export default function ClubDetailsPage() {
  const params = useParams();
  // useParams() can return a string or string array. We handle both.
  const clubId = Array.isArray(params.clubId) ? params.clubId[0] : params.clubId;

  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!clubId) return;

    const fetchClub = async () => {
      setIsLoading(true);
      setError(false);
      const fetchedClub = await getClubDetails(clubId);
      if (fetchedClub) {
        setClub(fetchedClub);
      } else {
        setError(true);
      }
      setIsLoading(false);
    };

    fetchClub();
  }, [clubId]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-12 text-center">
          <Loader2 className="mx-auto h-16 w-16 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading club details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !club) {
    return (
      <AppLayout>
        <div className="container py-12 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Club Not Found or Error</h1>
          <p className="text-muted-foreground">The club you are looking for does not exist, or there was an issue fetching its details.</p>
          <Button asChild className="mt-4">
            <a href="/clubs">Back to Clubs</a>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 px-4 mx-auto">
        <ClubDetailsContent club={club} />
      </div>
    </AppLayout>
  );
}

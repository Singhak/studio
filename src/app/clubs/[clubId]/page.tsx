
import { AppLayout } from '@/components/layout/AppLayout';
import type { Club } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { getClubById } from '@/services/clubService';
import { ClubDetailsContent } from '@/components/features/clubs/ClubDetailsContent';

interface ClubDetailsPageProps {
  params: { clubId: string };
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

export default async function ClubDetailsPage({ params }: ClubDetailsPageProps) {
  const clubId = params.clubId;

  // Ensure dynamic API access (params.clubId) happens after a microtask yield.
  await Promise.resolve();

  const club = await getClubDetails(clubId);

  if (!club) {
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

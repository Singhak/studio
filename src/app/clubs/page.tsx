import { AppLayout } from '@/components/layout/AppLayout';
import { ClubCard } from '@/components/features/clubs/ClubCard';
import { ClubSearchFilters } from '@/components/features/clubs/ClubSearchFilters';
import { mockClubs } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ClubDirectoryPage() {
  // Placeholder for actual data fetching and filtering
  const clubs = mockClubs;

  return (
    <AppLayout>
      <div className="container py-8 px-4 mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Find Sports Clubs</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Discover the perfect club for your favorite sport.
          </p>
        </header>

        <ClubSearchFilters />

        {clubs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
            {/* Placeholder Pagination */}
            <div className="mt-12 flex justify-center items-center space-x-2">
              <Button variant="outline" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button variant="outline">1</Button>
              <Button variant="outline" disabled>2</Button>
              <Button variant="outline" size="icon" disabled>
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-foreground">No clubs found</h2>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your search filters or check back later.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

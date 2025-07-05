"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { ClubCard } from '@/components/features/clubs/ClubCard';
import { ClubSearchFilters } from '@/components/features/clubs/ClubSearchFilters';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Club } from '@/lib/types';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { getAllClubs } from '@/services/clubService';
import { useSearchParams } from 'next/navigation';

interface Filters {
  searchTerm: string;
  sport: string;
  location: string;
}

// Extracted content to a new component to use Suspense for searchParams
function ClubDirectoryContent() {
  const searchParams = useSearchParams();
  const queryFromHome = searchParams.get('q') || '';

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    searchTerm: queryFromHome,
    sport: 'any',
    location: ''
  });

  const fetchClubs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedClubs = await getAllClubs();
      setClubs(fetchedClubs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clubs. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleSearch = (newFilters: Filters) => {
    setFilters(newFilters);
  };
  
  const filteredClubs = useMemo(() => {
    if (!clubs) return [];
    return clubs.filter(club => {
        const searchTermMatch = filters.searchTerm
            ? club.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
              (club.sport && club.sport.toLowerCase().includes(filters.searchTerm.toLowerCase()))
            : true;

        const sportMatch = filters.sport !== 'any'
            ? club.sport?.toLowerCase() === filters.sport.toLowerCase()
            : true;

        const locationMatch = filters.location
            ? (club.address?.city && club.address.city.toLowerCase().includes(filters.location.toLowerCase())) ||
              (club.address?.state && club.address.state.toLowerCase().includes(filters.location.toLowerCase()))
            : true;

        return searchTermMatch && sportMatch && locationMatch;
    });
  }, [clubs, filters]);

  return (
    <>
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Find Sports Clubs</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Discover the perfect club for your favorite sport.
        </p>
      </header>

      <ClubSearchFilters initialSearchTerm={queryFromHome} onSearch={handleSearch} />

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading clubs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-destructive">Error Loading Clubs</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={fetchClubs} className="mt-6">
            Try Again
          </Button>
        </div>
      ) : filteredClubs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClubs.map((club) => (
              <ClubCard key={club._id || club.id} club={club} />
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
    </>
  );
}


export default function ClubDirectoryPage() {
  return (
    <AppLayout>
      <div className="container py-8 px-4 mx-auto">
        <Suspense fallback={<div className="text-center py-12"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" /><p>Loading filters...</p></div>}>
          <ClubDirectoryContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}

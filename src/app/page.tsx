
"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlayCircle, PlusCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import type { Club } from '@/lib/types';
import { getAllClubs } from '@/services/clubService';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const [featuredClubs, setFeaturedClubs] = useState<Club[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

  useEffect(() => {
    const fetchFeaturedClubs = async () => {
      setIsLoadingFeatured(true);
      try {
        const allClubs = await getAllClubs();
        // Take the first 3 clubs as featured, or fewer if less than 3 are available
        setFeaturedClubs(allClubs.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch featured clubs:", error);
        setFeaturedClubs([]); // Set to empty array on error
      } finally {
        setIsLoadingFeatured(false);
      }
    };
    fetchFeaturedClubs();
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (query) {
      router.push(`/clubs?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/clubs');
    }
  };

  return (
    <AppLayout>
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url('https://placehold.co/1920x1080.png?text=Sports+Pattern')", backgroundSize: '300px 300px', backgroundRepeat: 'repeat', filter: 'grayscale(80%)' }} data-ai-hint="sports pattern"></div>
        <div className="container relative px-4 mx-auto text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Book Your Favorite <span className="text-primary">Sports Courts</span> With Ease
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground sm:text-xl">
            Discover and reserve courts for tennis, badminton, squash, and more. Playce connects you with the best local sports clubs.
          </p>
          <div className="mt-10 max-w-md mx-auto">
            <form className="flex gap-2" onSubmit={handleSearchSubmit}>
              <Input
                type="text"
                placeholder="Search by sport or club name..."
                className="flex-grow text-base"
                aria-label="Search clubs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" size="lg" className="text-base">
                <Search className="mr-2 h-5 w-5" /> Find
              </Button>
            </form>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="text-base">
              <Link href="/clubs">
                <PlayCircle className="mr-2 h-5 w-5" /> Explore Clubs
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <Link href="/dashboard/owner/register-club">
                <PlusCircle className="mr-2 h-5 w-5" /> List Your Club
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-card">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Why Choose Playce?</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-lg shadow-md border">
              <Search className="mx-auto h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Easy Search</h3>
              <p className="text-muted-foreground">Quickly find clubs by sport, location, and availability.</p>
            </div>
            <div className="p-6 rounded-lg shadow-md border">
              <PlayCircle className="mx-auto h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Instant Booking</h3>
              <p className="text-muted-foreground">Secure your court in just a few clicks. Real-time availability.</p>
            </div>
            <div className="p-6 rounded-lg shadow-md border">
              <PlusCircle className="mx-auto h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">For Club Owners</h3>
              <p className="text-muted-foreground">Manage your club, bookings, and pricing all in one place.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Featured Clubs</h2>
          {isLoadingFeatured ? (
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-muted-foreground">Loading featured clubs...</p>
            </div>
          ) : featuredClubs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredClubs.map((club) => (
                <div key={club.id || club._id} className="bg-card rounded-lg shadow-lg overflow-hidden transform transition-all hover:scale-105">
                  <Image
                    src={club.images?.[0] || 'https://placehold.co/600x400.png'}
                    alt={club.name}
                    width={600}
                    height={400}
                    className="w-full h-48 object-cover"
                    data-ai-hint={`${(club.sport || 'sports').toLowerCase()} court`}
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-1">{club.name}</h3>
                    <p className="text-sm text-primary font-medium">{club.sport || 'Sport'}</p>
                    <Button variant="link" asChild className="mt-4 p-0 h-auto">
                      <Link href={`/clubs/${club._id || club.id}`}>View Details &rarr;</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No featured clubs available at the moment.</p>
          )}
        </div>
      </section>
    </AppLayout>
  );
}

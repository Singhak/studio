
"use client";

import type { Club } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Zap, Star, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { toggleFavoriteClub } from '@/services/userService';

interface ClubCardProps {
  club: Club;
}

export function ClubCard({ club }: ClubCardProps) {
  const placeholderImage = club.images && club.images.length > 0 ? club.images[0] : 'https://placehold.co/600x400.png';
  const [isFavorite, setIsFavorite] = useState(club.isFavorite || false);

  useEffect(() => {
    // Sync with the prop if it changes (e.g., parent re-renders with updated data from API)
    setIsFavorite(club.isFavorite || false);
  }, [club.isFavorite]);

  const handleToggleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const clubId = club._id || club.id;
    if (!clubId) {
      console.error("Club does not have a valid ID for toggling favorite status.");
      return;
    }
    try {
      await toggleFavoriteClub(clubId);
      const newFavoriteStatus = !isFavorite;
      setIsFavorite(newFavoriteStatus);
      console.log(`Club ${club._id || club.id} favorite toggled to: ${newFavoriteStatus} (UI only)`);
    } catch (error) {
      // Optionally, you could show a toast notification or alert to inform the user of the error
      console.error("Error toggling favorite status:", error);
    }

    // In a real app, this would be an API call:
    // await api.updateFavoriteStatus(club.id, newFavoriteStatus);
    // For this prototype, the change is only local to this card's state.
    // The parent component (UserDashboardPage) fetches all clubs and filters by isFavorite.
    // To see a change persist across the app, a backend update and re-fetch would be needed.
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="p-0 relative">
        <Link href={`/clubs/${club._id || club.id}`} className="block aspect-[16/9] overflow-hidden">
          <Image
            src={placeholderImage}
            alt={club.name}
            width={600}
            height={400}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            data-ai-hint={`${club.sport?.toLowerCase() || 'sports'} court`}
          />
        </Link>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 bg-card/60 hover:bg-card/90 rounded-full text-destructive p-1.5 h-8 w-8 sm:h-9 sm:w-9"
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-destructive' : 'text-destructive-foreground stroke-destructive'}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <Link href={`/clubs/${club._id || club.id}`}>
          <CardTitle className="text-xl font-semibold mb-1 hover:text-primary transition-colors">{club.name}</CardTitle>
        </Link>
        <div className="flex items-center text-sm text-muted-foreground mb-1">
          <Zap className="w-4 h-4 mr-1.5 text-primary" />
          <span>{club.sport || 'Sport'}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <MapPin className="w-4 h-4 mr-1.5 text-primary" />
          <span>{club.address?.city || 'Location unspecified'}</span>
        </div>
        {club.averageRating !== undefined && club.averageRating !== null && (
          <div className="flex items-center text-sm mb-2">
            <Star className="w-4 h-4 mr-1 text-yellow-400 fill-yellow-400" />
            <span className="font-medium text-muted-foreground">{club.averageRating.toFixed(1)}</span>
            {club.reviewCount !== undefined && <span className="ml-1 text-xs">({club.reviewCount} reviews)</span>}
          </div>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {club.description}
        </p>
        {club.amenities && club.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {club.amenities.slice(0, 3).map(amenity => (
              <Badge key={amenity} variant="secondary" className="text-xs">{amenity}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button asChild className="w-full" variant="outline">
          <Link href={`/clubs/${club._id || club.id}`}>View Details & Book</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Zap } from 'lucide-react'; 
import { SPORTS_TYPES } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';

interface ClubSearchFiltersProps {
  initialSearchTerm?: string;
}

export function ClubSearchFilters({ initialSearchTerm = "" }: ClubSearchFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Placeholder for actual search logic.
    // You would typically use `searchTerm` and other filter values to
    // re-fetch or filter the club list.
    console.log("Search submitted with term:", searchTerm);
    // For example, you might call a prop function: onSearch({ searchTerm, sport, location });
  };

  return (
    <Card className="mb-8 shadow-md">
      <CardContent className="p-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label htmlFor="clubSearchTerm" className="text-sm font-medium text-muted-foreground flex items-center">
              <Search className="w-4 h-4 mr-2" /> Search Club or Sport
            </label>
            <Input
              id="clubSearchTerm"
              placeholder="e.g., Grand Slam Tennis"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-1.5">
            <label htmlFor="sportType" className="text-sm font-medium text-muted-foreground flex items-center">
              <Zap className="w-4 h-4 mr-2" /> Sport
            </label>
            <Select>
              <SelectTrigger id="sportType">
                <SelectValue placeholder="Any Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Sport</SelectItem>
                {SPORTS_TYPES.map((sport) => (
                  <SelectItem key={sport} value={sport.toLowerCase()}>
                    {sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="location" className="text-sm font-medium text-muted-foreground flex items-center">
              <MapPin className="w-4 h-4 mr-2" /> Location
            </label>
            <Input id="location" placeholder="e.g., Downtown" />
          </div>

          <Button type="submit" className="w-full lg:w-auto self-end h-10">
            <Search className="mr-2 h-4 w-4" /> Find Clubs
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

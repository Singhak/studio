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
  onSearch: (filters: { searchTerm: string; sport: string; location: string }) => void;
}

export function ClubSearchFilters({ initialSearchTerm = "", onSearch }: ClubSearchFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sport, setSport] = useState("any");
  const [location, setLocation] = useState("");

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch({ searchTerm: searchTerm.trim(), sport, location: location.trim() });
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
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger id="sportType">
                <SelectValue placeholder="Any Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Sport</SelectItem>
                {SPORTS_TYPES.map((sportType) => (
                  <SelectItem key={sportType} value={sportType.toLowerCase()}>
                    {sportType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="location" className="text-sm font-medium text-muted-foreground flex items-center">
              <MapPin className="w-4 h-4 mr-2" /> Location
            </label>
            <Input 
              id="location" 
              placeholder="e.g., Sportsville or CA" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full lg:w-auto self-end h-10">
            <Search className="mr-2 h-4 w-4" /> Find Clubs
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Zap } from 'lucide-react'; // Zap for sport
import { SPORTS_TYPES } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

export function ClubSearchFilters() {
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Placeholder for search logic
    console.log("Search submitted");
  };

  return (
    <Card className="mb-8 shadow-md">
      <CardContent className="p-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label htmlFor="searchTerm" className="text-sm font-medium text-muted-foreground flex items-center">
              <Search className="w-4 h-4 mr-2" /> Search Club or Sport
            </label>
            <Input id="searchTerm" placeholder="e.g., Grand Slam Tennis" />
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

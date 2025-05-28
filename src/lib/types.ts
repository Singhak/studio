export interface Club {
  id: string;
  name: string;
  sport: string;
  location: string;
  description: string;
  images: string[];
  services: Service[];
  contactEmail?: string;
  contactPhone?: string;
  rating?: number; // Optional: average rating
  amenities?: string[]; // e.g., Parking, Showers, Cafe
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number; // e.g., 60 for 1 hour
}

export interface TimeSlot {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:00"
  isAvailable: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  clubId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  totalPrice: number;
  createdAt: string; // ISO date string
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'owner';
  avatarUrl?: string;
}

export const SPORTS_TYPES = [
  "Tennis",
  "Badminton",
  "Squash",
  "Padel",
  "Pickleball",
  "Basketball",
  "Volleyball",
  "Futsal",
] as const;

export type SportType = typeof SPORTS_TYPES[number];

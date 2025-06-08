
export interface Club {
  id: string;
  ownerId?: string; // Added to associate club with an owner
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
  isFavorite?: boolean; // Added for favorite feature
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number; // e.g., 60 for 1 hour
}

export type TimeSlotStatus = 'available' | 'pending' | 'confirmed' | 'in-progress' | 'unavailable';

export interface TimeSlot {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:00"
  status: TimeSlotStatus;
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

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  timestamp: number; // Unix timestamp
  read: boolean;
  href?: string; // Optional link for navigation on click
}

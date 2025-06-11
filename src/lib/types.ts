
export interface ClubAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ClubLocationGeo {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Club {
  _id: string; 
  owner?: string; 
  name: string;
  address: ClubAddress; 
  location: ClubLocationGeo; 
  description: string;
  images: string[]; 
  services?: Service[]; // Services might be fetched/updated separately after club creation
  contactEmail?: string;
  contactPhone?: string;
  amenities?: string[]; 
  averageRating?: number; 
  reviewCount?: number; 
  isActive?: boolean; 
  isDeleted?: boolean; 
  isFeatured?: boolean; 
  createdAt?: string; 
  updatedAt?: string; 
  isFavorite?: boolean; 
  sport?: SportType; // Keep primary sport type for the club, even if not in this specific POST
  id?: string; // Keep original id for compatibility if needed during transition
  ownerId?: string; // Keep original ownerId for compatibility
}

export interface Service {
  id: string; 
  name: string;
  description?: string;
  price: number;
  durationMinutes: number; 
  sport?: SportType; 
}

export type TimeSlotStatus = 'available' | 'pending' | 'confirmed' | 'in-progress' | 'unavailable';

export interface TimeSlot {
  startTime: string; 
  endTime: string;   
  status: TimeSlotStatus;
}

export interface Booking {
  id: string;
  userId: string;
  clubId: string;
  serviceId: string;
  date: string; 
  startTime: string; 
  endTime: string; 
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  totalPrice: number;
  createdAt: string; 
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
  timestamp: number; 
  read: boolean;
  href?: string; 
}

export interface Review {
  id: string; 
  bookingId: string;
  clubId: string;
  serviceId: string;
  userId: string; 
  clubRating: number; 
  serviceRating: number; 
  comment?: string;
  createdAt: string; 
}

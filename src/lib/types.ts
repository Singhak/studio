
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
  services?: Service[];
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
  sport?: SportType;
  id?: string;
  ownerId?: string;
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

export const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export interface Service {
  _id: string;
  club: string; // Club ID to which this service belongs
  name: string;
  sportType: SportType;
  hourlyPrice: number;
  capacity: number;
  description?: string;
  images?: string[];
  isActive?: boolean;
  availableDays?: DayOfWeek[];
  openingTime?: string; // Format "HH:mm"
  closingTime?: string; // Format "HH:mm"
  slotDurationMinutes?: number;
  // API response only fields
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
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
  serviceId: string; // Should map to Service._id
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  totalPrice: number;
  notes?: string; // Added optional notes
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'owner';
  avatarUrl?: string;
}

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

// Payload for creating a booking
export interface CreateBookingPayload {
  serviceId: string;
  bookingDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  notes?: string;
}

// Response from creating a booking
export interface CreateBookingResponse {
  message: string;
  bookingId: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed'; // Should match Booking['status']
}

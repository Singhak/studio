

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

export type UserRole = 'user' | 'owner' | 'admin' | 'editor';

export interface CourtlyUserBase { // Renamed from AppUser to avoid conflict, and made more generic
  id: string; // Firebase UID
  email: string | null;
  name?: string | null; // displayName from Firebase
  roles: UserRole[];
  avatarUrl?: string | null; // photoURL from Firebase
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  address?: Partial<ClubAddress>;
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
  id?: string; // Kept for potential legacy use in mock data or simple components
  ownerId?: string; // Kept for potential legacy use
  __v?: number;
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
  userId: string; // Changed from 'customer' to 'userId' for consistency
  clubId: string;
  serviceId: string; // Should map to Service._id
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'blocked' | 'expired';
  totalPrice: number;
  notes?: string;
  createdAt: string;
}


// AppNotification: Used internally by AuthContext and Header for display
export interface AppNotification {
  id: string; // Corresponds to ApiNotification._id
  title: string;
  body?: string; // Corresponds to ApiNotification.message
  timestamp: number; // Corresponds to ApiNotification.createdAt (transformed)
  read: boolean; // Corresponds to ApiNotification.isRead
  href?: string; // Corresponds to ApiNotification.data.href
}

// ApiNotificationData: Structure for the nested 'data' object in ApiNotification
export interface ApiNotificationData {
  bookingId?: string;
  type?: string; // e.g., "new_booking"
  href?: string; // e.g., "/dashboard/owner"
  [key: string]: any; // Allow other dynamic properties
}

// ApiNotification: Structure for notifications fetched from the backend API
export interface ApiNotification {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: string; // e.g., "booking_pending"
  relatedEntityId?: string;
  relatedEntityType?: string; // e.g., "Booking"
  isRead: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  data?: ApiNotificationData;
  __v?: number;
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
  // Optional fields for special cases like blocking
  status?: Booking['status'];
  userId?: string;
}

// Response from creating a booking
export interface CreateBookingResponse {
  message: string;
  bookingId: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
}


import type { Club, Service, Booking, DayOfWeek, SportType } from './types';
import { DAYS_OF_WEEK, SPORTS_TYPES } from './types';

const defaultAvailableDays: DayOfWeek[] = [...DAYS_OF_WEEK];

export const mockServices: Service[] = [
  {
    _id: 's1',
    club: 'club1_mongo', // Corrected: Belongs to Grand Slam Tennis Club
    name: 'Standard Tennis Court Rental',
    sportType: "Tennis",
    hourlyPrice: 20,
    capacity: 4,
    description: '1 hour standard tennis court rental.',
    isActive: true,
    availableDays: defaultAvailableDays,
    openingTime: "08:00",
    closingTime: "22:00",
    slotDurationMinutes: 60,
    images: ['https://placehold.co/300x200.png?text=Tennis+Court'],
  },
  {
    _id: 's2',
    club: 'club1_mongo', // Corrected
    name: 'Premium Tennis Court Rental',
    sportType: "Tennis",
    hourlyPrice: 30,
    capacity: 4,
    description: '1 hour premium tennis court rental with better surface and lighting.',
    isActive: true,
    availableDays: defaultAvailableDays,
    openingTime: "08:00",
    closingTime: "22:00",
    slotDurationMinutes: 60,
    images: ['https://placehold.co/300x200.png?text=Premium+Tennis'],
  },
  {
    _id: 's3',
    club: 'club1_mongo', // Corrected
    name: 'Tennis Coaching Session',
    sportType: "Tennis",
    hourlyPrice: 50,
    capacity: 1,
    description: '1 hour personalized coaching session with a professional tennis coach.',
    isActive: true,
    availableDays: ["Mon", "Wed", "Fri"],
    openingTime: "09:00",
    closingTime: "17:00",
    slotDurationMinutes: 60,
    images: ['https://placehold.co/300x200.png?text=Tennis+Coaching'],
  },
  {
    _id: 's7', // New service for club1_mongo to test multi-sport filter
    club: 'club1_mongo', 
    name: 'Introductory Padel Session',
    sportType: "Padel", 
    hourlyPrice: 22,
    capacity: 4,
    description: '1 hour introductory Padel session for beginners.',
    isActive: true,
    availableDays: ["Sat", "Sun"],
    openingTime: "10:00",
    closingTime: "14:00",
    slotDurationMinutes: 60,
    images: ['https://placehold.co/300x200.png?text=Padel+Intro'],
  },
  {
    _id: 's4',
    club: 'club2_mongo', // Corrected: Belongs to Shuttle Masters Badminton Center
    name: 'Badminton Court Rental',
    sportType: "Badminton",
    hourlyPrice: 15,
    capacity: 4,
    description: '1 hour badminton court rental.',
    isActive: true,
    availableDays: defaultAvailableDays,
    openingTime: "09:00",
    closingTime: "21:00",
    slotDurationMinutes: 60,
    images: ['https://placehold.co/300x200.png?text=Badminton+Court'],
  },
  {
    _id: 's5',
    club: 'club3_mongo', // Corrected: Belongs to The Squash Box
    name: 'Squash Court Rental',
    sportType: "Squash",
    hourlyPrice: 18,
    capacity: 2,
    description: '1 hour squash court rental.',
    isActive: true,
    availableDays: defaultAvailableDays,
    openingTime: "10:00",
    closingTime: "20:00",
    slotDurationMinutes: 45,
    images: ['https://placehold.co/300x200.png?text=Squash+Court'],
  },
  {
    _id: 's6',
    club: 'club4_mongo', // Corrected: Belongs to Padel Palace Deluxe
    name: 'Padel Court Rental',
    sportType: "Padel",
    hourlyPrice: 25,
    capacity: 4,
    description: '1 hour padel court rental.',
    isActive: true,
    availableDays: defaultAvailableDays,
    openingTime: "07:00",
    closingTime: "23:00",
    slotDurationMinutes: 90,
    images: ['https://placehold.co/300x200.png?text=Padel+Court'],
  },
];

const owner1Id = 'owner123';

export const mockClubs: Club[] = [
  {
    id: 'club1', 
    _id: 'club1_mongo', 
    ownerId: owner1Id,
    owner: owner1Id, 
    name: 'Grand Slam Tennis Club',
    sport: 'Tennis', // This can be the primary sport, services define individual offerings
    address: { street: "1 Tennis Avenue", city: "Sportsville", state: "CA", zipCode: "90210"},
    location: { type: "Point", coordinates: [-118.4000, 33.9850] },
    description: 'Premier tennis facility with 10 clay courts and 5 hard courts. Professional coaching and Padel sessions available. Open 7 days a week.',
    images: ['https://placehold.co/600x400.png?text=Tennis+Court+1', 'https://placehold.co/600x400.png?text=Tennis+Court+2'],
    // services field in Club is now effectively ignored by ClubDetailsContent, which fetches fresh
    contactEmail: 'info@grandslamtennis.com',
    contactPhone: '555-0101',
    amenities: ['Parking', 'Showers', 'Pro Shop', 'Cafe', 'Padel Court'],
    averageRating: 4.8,
    reviewCount: 120,
    isActive: true,
    isDeleted: false,
    isFeatured: true,
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: true,
  },
  {
    id: 'club2',
    _id: 'club2_mongo',
    owner: 'owner789',
    name: 'Shuttle Masters Badminton Center',
    sport: 'Badminton',
    address: { street: "2 Badminton Lane", city: "Sportsville", state: "CA", zipCode: "90211"},
    location: { type: "Point", coordinates: [-118.4100, 33.9750] },
    description: 'State-of-the-art badminton center with 8 professional courts. Equipment rental and group classes offered.',
    images: ['https://placehold.co/600x400.png?text=Badminton+Court+1', 'https://placehold.co/600x400.png?text=Badminton+Hall'],
    contactEmail: 'contact@shuttlemasters.com',
    amenities: ['Parking', 'Changing Rooms', 'Water Fountain'],
    averageRating: 4.5,
    reviewCount: 85,
    isActive: true,
    isDeleted: false,
    isFeatured: false,
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: false,
  },
  {
    id: 'club3',
    _id: 'club3_mongo',
    ownerId: 'owner456',
    owner: 'owner456',
    name: 'The Squash Box',
    sport: 'Squash',
    address: { street: "3 Squash Court", city: "Sportsville", state: "CA", zipCode: "90212"},
    location: { type: "Point", coordinates: [-118.4200, 33.9650] },
    description: 'Friendly and competitive squash club with 6 well-maintained courts. Regular tournaments and leagues.',
    images: ['https://placehold.co/600x400.png?text=Squash+Court+View', 'https://placehold.co/600x400.png?text=Squash+Players'],
    contactPhone: '555-0103',
    amenities: ['Lockers', 'Viewing Gallery'],
    averageRating: 4.2,
    reviewCount: 60,
    isActive: true,
    isDeleted: false,
    isFeatured: false,
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: false,
  },
  {
    id: 'club4',
    _id: 'club4_mongo',
    ownerId: owner1Id,
    owner: owner1Id,
    name: 'Padel Palace Deluxe',
    sport: 'Padel',
    address: { street: "4 Padel Parkway", city: "Sportsville", state: "CA", zipCode: "90213"},
    location: { type: "Point", coordinates: [-118.3900, 33.9950] },
    description: 'Modern Padel club with 4 panoramic outdoor courts and 2 indoor courts. Social events and coaching for all levels.',
    images: ['https://placehold.co/600x400.png?text=Padel+Court+Night', 'https://placehold.co/600x400.png?text=Padel+Action'],
    contactEmail: 'play@padelpalace.com',
    amenities: ['Parking', 'Cafe', 'Equipment Rental', 'Floodlights'],
    averageRating: 4.9,
    reviewCount: 150,
    isActive: true,
    isDeleted: false,
    isFeatured: true,
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isFavorite: true,
  },
];

export const mockUserBookings: Booking[] = [
  {
    id: 'ub1',
    userId: 'user001',
    clubId: 'club1_mongo',
    serviceId: 's1', // Standard Tennis Court Rental
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    totalPrice: 20,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ub2',
    userId: 'user001',
    clubId: 'club2_mongo',
    serviceId: 's4', // Badminton Court Rental
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '15:00',
    status: 'pending',
    totalPrice: 15,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ub3',
    userId: 'user002',
    clubId: 'club1_mongo',
    serviceId: 's3', // Tennis Coaching Session
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    status: 'completed',
    totalPrice: 50,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ub4',
    userId: 'user001',
    clubId: 'club3_mongo',
    serviceId: 's5', // Squash Court Rental
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '16:00',
    endTime: '17:00',
    status: 'cancelled',
    totalPrice: 18,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ub5',
    userId: 'user001',
    clubId: 'club4_mongo',
    serviceId: 's6', // Padel Court Rental
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '19:30', // Padel often 90 min
    status: 'confirmed',
    totalPrice: 25, // This would be 1.5 * hourly usually, but totalPrice is explicit
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
];


// Mock bookings for the owner dashboard - these would typically be dynamically fetched and filtered
export const baseMockOwnerBookings: Booking[] = [
  // Bookings for club1_mongo (owner123)
  { ...mockUserBookings[0], userId: 'userABC' }, // Confirmed, for Grand Slam Tennis
  { ...mockUserBookings[2], userId: 'userXYZ', status: 'pending' }, // Pending, for Grand Slam Tennis (changed status for variety)
  {
    id: 'ob1',
    userId: 'userDEF',
    clubId: 'club1_mongo',
    serviceId: 's1',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '16:00',
    status: 'completed',
    totalPrice: 20,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  // Bookings for club4_mongo (owner123)
  { ...mockUserBookings[4], userId: 'userGHI' }, // Confirmed, for Padel Palace
  {
    id: 'ob2',
    userId: 'userJKL',
    clubId: 'club4_mongo',
    serviceId: 's6',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '11:00',
    endTime: '12:30',
    status: 'pending',
    totalPrice: 25,
    createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString()
  },
  // Booking for a different club to ensure filtering works
  {
    id: 'ob3',
    userId: 'userMNO',
    clubId: 'club2_mongo', // Belongs to Shuttle Masters (owner789)
    serviceId: 's4',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    totalPrice: 15,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];


    
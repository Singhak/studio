
import type { Club, Service, Booking } from './types';

export const mockServices: Service[] = [
  { id: 's1', name: 'Standard Court Booking', price: 20, durationMinutes: 60, description: '1 hour court rental.' },
  { id: 's2', name: 'Premium Court Booking', price: 30, durationMinutes: 60, description: '1 hour premium court rental with better surface.' },
  { id: 's3', name: 'Coaching Session', price: 50, durationMinutes: 60, description: '1 hour session with a professional coach.' },
  { id: 's4', name: 'Evening Slot Surcharge', price: 25, durationMinutes: 60, description: '1 hour court rental during peak evening hours.' },
];

const owner1Id = 'owner123'; // Example owner ID

export const mockClubs: Club[] = [
  {
    id: 'club1',
    ownerId: owner1Id,
    name: 'Grand Slam Tennis Club',
    sport: 'Tennis',
    location: 'Downtown, Sportsville',
    description: 'Premier tennis facility with 10 clay courts and 5 hard courts. Professional coaching available. Open 7 days a week.',
    images: ['https://placehold.co/600x400.png?text=Tennis+Court+1', 'https://placehold.co/600x400.png?text=Tennis+Court+2'],
    services: [mockServices[0], mockServices[2]],
    contactEmail: 'info@grandslamtennis.com',
    contactPhone: '555-0101',
    rating: 4.8,
    amenities: ['Parking', 'Showers', 'Pro Shop', 'Cafe'],
    isFavorite: true,
  },
  {
    id: 'club2',
    name: 'Shuttle Masters Badminton Center', // No ownerId or a different one
    sport: 'Badminton',
    location: 'North Suburb, Sportsville',
    description: 'State-of-the-art badminton center with 8 professional courts. Equipment rental and group classes offered.',
    images: ['https://placehold.co/600x400.png?text=Badminton+Court+1', 'https://placehold.co/600x400.png?text=Badminton+Hall'],
    services: [mockServices[0], mockServices[1]],
    contactEmail: 'contact@shuttlemasters.com',
    rating: 4.5,
    amenities: ['Parking', 'Changing Rooms', 'Water Fountain'],
    isFavorite: false,
  },
  {
    id: 'club3',
    ownerId: 'owner456', // Different owner
    name: 'The Squash Box',
    sport: 'Squash',
    location: 'West End, Sportsville',
    description: 'Friendly and competitive squash club with 6 well-maintained courts. Regular tournaments and leagues.',
    images: ['https://placehold.co/600x400.png?text=Squash+Court+View', 'https://placehold.co/600x400.png?text=Squash+Players'],
    services: [mockServices[0], mockServices[3]],
    contactPhone: '555-0103',
    rating: 4.2,
    amenities: ['Lockers', 'Viewing Gallery'],
    isFavorite: false,
  },
  {
    id: 'club4',
    ownerId: owner1Id,
    name: 'Padel Palace Deluxe', // Renamed slightly for clarity
    sport: 'Padel',
    location: 'Eastside Park, Sportsville',
    description: 'Modern Padel club with 4 panoramic outdoor courts and 2 indoor courts. Social events and coaching for all levels.',
    images: ['https://placehold.co/600x400.png?text=Padel+Court+Night', 'https://placehold.co/600x400.png?text=Padel+Action'],
    services: [mockServices[1], mockServices[2]],
    contactEmail: 'play@padelpalace.com',
    rating: 4.9,
    amenities: ['Parking', 'Cafe', 'Equipment Rental', 'Floodlights'],
    isFavorite: true,
  },
];

export const mockUserBookings: Booking[] = [
  {
    id: 'ub1',
    userId: 'user001', // Example user ID
    clubId: 'club1', // Corresponds to Grand Slam Tennis Club
    serviceId: 's1', // Standard Court Booking
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    totalPrice: 20,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // Created 10 days ago
  },
  {
    id: 'ub2',
    userId: 'user001',
    clubId: 'club2', // Shuttle Masters Badminton Center
    serviceId: 's2', // Premium Court Booking
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    startTime: '14:00',
    endTime: '15:00',
    status: 'pending',
    totalPrice: 30,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // Created 2 days ago
  },
  {
    id: 'ub3',
    userId: 'user002', // Different user
    clubId: 'club1', // Grand Slam Tennis Club
    serviceId: 's3', // Coaching Session
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
    startTime: '09:00',
    endTime: '10:00',
    status: 'completed',
    totalPrice: 50,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // Created 15 days ago
  },
  {
    id: 'ub4',
    userId: 'user001',
    clubId: 'club3', // The Squash Box
    serviceId: 's1', // Standard Court Booking
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days ago
    startTime: '16:00',
    endTime: '17:00',
    status: 'cancelled',
    totalPrice: 20,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() // Created 25 days ago
  },
  {
    id: 'ub5',
    userId: 'user001',
    clubId: 'club4', // Padel Palace Deluxe
    serviceId: 's2', // Premium Court Booking
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow
    startTime: '18:00',
    endTime: '19:00',
    status: 'confirmed',
    totalPrice: 30,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // Created 1 day ago
  },
];

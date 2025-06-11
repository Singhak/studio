
import { NextResponse } from 'next/server';
import type { ApiNotification } from '@/lib/types';

// Mock function to generate timestamps within the last week
const getRandomPastDateISO = (daysAgo: number = 7): string => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
};

const mockWeeklyNotifications: ApiNotification[] = [
  {
    _id: `notif_${Date.now()}_1`,
    recipient: "user123_mock", // Mock recipient ID
    title: "Upcoming Booking Reminder",
    message: "Your tennis court booking at Grand Slam Tennis Club is tomorrow at 10:00 AM.",
    type: "booking_reminder",
    relatedEntityId: "booking_abc_123",
    relatedEntityType: "Booking",
    isRead: false,
    createdAt: getRandomPastDateISO(2),
    updatedAt: getRandomPastDateISO(2),
    data: {
      bookingId: "booking_abc_123",
      href: "/dashboard/user",
    },
    __v: 0,
  },
  {
    _id: `notif_${Date.now()}_2`,
    recipient: "user123_mock",
    title: "New Club Promotion!",
    message: "Shuttle Masters Badminton Center is offering 20% off on all courts this weekend!",
    type: "promotion",
    relatedEntityId: "club2_mongo",
    relatedEntityType: "Club",
    isRead: true,
    createdAt: getRandomPastDateISO(4),
    updatedAt: getRandomPastDateISO(4),
    data: {
      clubId: "club2_mongo",
      href: "/clubs/club2_mongo",
    },
    __v: 0,
  },
  {
    _id: `notif_${Date.now()}_3`,
    recipient: "owner123_mock", // For a club owner
    title: "New Booking Request",
    message: "You have a new booking request for Padel Court 1 at Padel Palace Deluxe.",
    type: "booking_pending",
    relatedEntityId: "booking_xyz_789",
    relatedEntityType: "Booking",
    isRead: false,
    createdAt: getRandomPastDateISO(1),
    updatedAt: getRandomPastDateISO(1),
    data: {
      bookingId: "booking_xyz_789",
      href: "/dashboard/owner",
    },
    __v: 0,
  },
    {
    _id: `notif_${Date.now()}_4`,
    recipient: "user123_mock",
    title: "Booking Confirmed",
    message: "Your booking for Squash Court at The Squash Box has been confirmed.",
    type: "booking_confirmed",
    relatedEntityId: "booking_def_456",
    relatedEntityType: "Booking",
    isRead: true,
    createdAt: getRandomPastDateISO(5),
    updatedAt: getRandomPastDateISO(5),
    data: {
      bookingId: "booking_def_456",
      href: "/dashboard/user?bookingId=booking_def_456",
    },
    __v: 0,
  },
  {
    _id: `notif_${Date.now()}_5`,
    recipient: "owner123_mock",
    title: "Weekly Summary",
    message: "Your clubs had 15 new bookings this week. View report.",
    type: "report_summary",
    isRead: true,
    createdAt: getRandomPastDateISO(0), // Today
    updatedAt: getRandomPastDateISO(0),
    data: {
      reportId: "report_wk_23_2024",
      href: "/dashboard/owner/reports",
    },
    __v: 0,
  }
];


export async function GET(request: Request) {
  // In a real app, you'd fetch notifications for the authenticated user
  // and filter them for the last week from a database.
  // For this prototype, we return a static list of mock notifications
  // with varied read statuses and recent timestamps.
  
  // Simulate filtering for a specific recipient if needed (e.g., based on a mock auth token)
  // const MOCK_RECIPIENT_ID = "user123_mock"; 
  // const userNotifications = mockWeeklyNotifications.filter(n => n.recipient === MOCK_RECIPIENT_ID);

  return NextResponse.json(mockWeeklyNotifications);
}

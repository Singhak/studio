
import type { ApiNotification } from '@/lib/types';
import { mockWeeklyNotifications } from '@/lib/mockData';

/**
 * Marks a list of notifications as read.
 * In this static version, it just simulates success. The state is handled client-side.
 * @param notificationIds - An array of notification IDs to mark as read.
 * @returns Promise<void>
 */
export async function markNotificationsAsReadApi(notificationIds: string[]): Promise<void> {
  if (!notificationIds || notificationIds.length === 0) {
    console.warn("markNotificationsAsReadApi called with empty or null IDs.");
    return;
  }
  console.log("Simulating marking notifications as read (client-side state handles the change):", notificationIds);
  return Promise.resolve();
}

/**
 * Fetches the weekly notifications for the logged-in user from the mock data.
 * @returns Promise<ApiNotification[]>
 */
export async function getWeeklyNotificationsApi(): Promise<ApiNotification[]> {
  console.log("Fetching weekly notifications from local mock data.");
  return Promise.resolve(mockWeeklyNotifications);
}

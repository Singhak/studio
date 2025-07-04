
import type { ApiNotification } from '@/lib/types';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        } catch (e) {
            errorBody = { message: `Request failed with status ${response.status}` };
        }
        throw new Error(errorBody.message || 'An API error occurred');
    }
     if (response.status === 204) {
        return undefined as T;
    }
    return response.json();
}

/**
 * Marks a list of notifications as read by calling the backend API.
 * @param notificationIds - An array of notification IDs to mark as read.
 * @returns Promise<void>
 */
export async function markNotificationsAsReadApi(notificationIds: string[]): Promise<void> {
  if (!notificationIds || notificationIds.length === 0) {
    console.warn("markNotificationsAsReadApi called with empty or null IDs.");
    return;
  }
  await fetcher('/api/notifications/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationIds }),
  });
}

/**
 * Fetches the weekly notifications for the logged-in user from the mock API.
 * @returns Promise<ApiNotification[]>
 */
export async function getWeeklyNotificationsApi(): Promise<ApiNotification[]> {
  return await fetcher('/api/notifications/weekly');
}

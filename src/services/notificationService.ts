
import type { ApiNotification } from '@/lib/types';
import { getApiBaseUrl, authedFetch } from '@/lib/apiUtils';

/**
 * Marks a list of notifications as read via the API.
 * @param notificationIds - An array of notification IDs to mark as read.
 * @returns Promise<void>
 * @throws Will throw an error if the API call fails.
 */
export async function markNotificationsAsReadApi(notificationIds: string[]): Promise<void> {
  if (!notificationIds || notificationIds.length === 0) {
    console.warn("markNotificationsAsReadApi called with empty or null IDs, skipping API call.");
    return;
  }
  const apiUrlPath = `/notifications/mark-read`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    });

    if (response.status === 204) { // Successfully marked as read, no content
      return;
    }

    // Handle other non-204 but still ok responses if any, or non-ok responses
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to mark notifications as read: ${response.statusText} (${response.status})` }));
      throw new Error(errorBody.message);
    }
    // If response.ok is true but status is not 204 (e.g. 200 with a body),
    // it's still considered a success for this void function.
    // Log a warning if the status is unexpected but still 'ok'.
    if (response.status !== 204) {
      console.warn(`Mark notifications as read API returned status ${response.status} instead of 204, but was 'ok'.`);
    }

  } catch (error) {
    console.error('Error marking notifications as read via API:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while marking notifications as read.');
    }
  }
}

/**
 * Fetches the weekly notifications for the logged-in user from the API.
 * @returns Promise<ApiNotification[]>
 * @throws Will throw an error if the API call fails.
 */
export async function getWeeklyNotificationsApi(): Promise<ApiNotification[]> {
  const apiUrlPath = `/notifications/weekly`;
  try {
    const response = await authedFetch(apiUrlPath, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to fetch weekly notifications: ${response.statusText} (${response.status})` }));
      throw new Error(errorBody.message);
    }
    return await response.json() as ApiNotification[];
  } catch (error) {
    console.error('Error fetching weekly notifications via API:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while fetching weekly notifications.');
    }
  }
}

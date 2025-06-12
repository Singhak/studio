
import type { ApiNotification } from '@/lib/types';

const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path, correctly targets internal Next.js API routes
    return '/api';
  }
  // Server-side: use absolute path.
  // NEXT_PUBLIC_APP_URL should be set to the application's root URL (e.g., http://localhost:9002 or https://yourdomain.com)
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  // Remove trailing slash from baseUrl if present to prevent double slashes
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  return `${baseUrl}/api`;
}

async function getAuthHeaders(isPostOrPut: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  if (isPostOrPut) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

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
  const apiUrl = `${getApiBaseUrl()}/notifications/mark-read`;
  try {
    const authHeaders = await getAuthHeaders(true);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ notificationIds }),
    });

    if (response.status === 204) {
      return;
    }
    
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to mark notifications as read: ${response.statusText} (${response.status})` }));
      throw new Error(errorBody.message);
    }
    console.warn(`Mark notifications as read API API returned status ${response.status} instead of 204, but was 'ok'.`);

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
  const apiUrl = `${getApiBaseUrl()}/notifications/weekly`;
  try {
    const authHeaders = await getAuthHeaders(false);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: authHeaders,
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

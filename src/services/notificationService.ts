
const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  return `${baseUrl}/api`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
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
    return; // Or throw an error if this should not happen
  }
  const apiUrl = `${getApiBaseUrl()}/notifications/mark-read`;
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ notificationIds }),
    });

    if (response.status === 204) {
      // Successfully marked as read, no content to parse
      return;
    }
    
    // For other non-204 error statuses
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `Failed to mark notifications as read: ${response.statusText} (${response.status})` }));
      throw new Error(errorBody.message);
    }
    // If response.ok is true but status is not 204 (e.g. 200 with body), handle as needed or log warning.
    // For now, we strictly expect 204.
    console.warn(`Mark notifications as read API returned status ${response.status} instead of 204, but was 'ok'.`);

  } catch (error) {
    console.error('Error marking notifications as read via API:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while marking notifications as read.');
    }
  }
}

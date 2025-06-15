
const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

export function getApiBaseUrl(): string {
  // if (typeof window !== 'undefined') {
  //   // Client-side: use relative path, correctly targets internal Next.js API routes
  //   return '/api';
  // }
  // Server-side: use absolute path.
  // NEXT_PUBLIC_APP_URL should be set to the application's root URL (e.g., http://localhost:9002 or https://yourdomain.com)
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Default for dev server
  // Remove trailing slash from baseUrl if present to prevent double slashes
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  return `${baseUrl}/api`;
}

export async function getApiAuthHeaders(isPostOrPutOrDelete: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  if (isPostOrPutOrDelete) {
    headers['Content-Type'] = 'application/json';
  }
  // This function will run client-side when called from services.
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

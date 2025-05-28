
import type { Club } from '@/lib/types';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path, the browser will handle the domain
    return '/api';
  }
  // Server-side: construct an absolute URL.
  // In a real app, use an environment variable like process.env.NEXT_PUBLIC_APP_URL
  // or process.env.VERCEL_URL if deployed on Vercel.
  // For this prototype, we'll default to http://localhost:9002 (from package.json dev script)
  // You should configure this via an environment variable (e.g., NEXT_PUBLIC_APP_URL) for production.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  return `${baseUrl}/api`;
}

export async function getAllClubs(): Promise<Club[]> {
  const apiUrl = `${getApiBaseUrl()}/clubs`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch clubs: ${response.statusText} (${response.status}) from ${apiUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching all clubs:', error);
    // Depending on the app's error handling strategy,
    // you might want to return an empty array or rethrow a custom error.
    throw error; 
  }
}

export async function getClubById(clubId: string): Promise<Club | null> {
  const apiUrl = `${getApiBaseUrl()}/clubs/${clubId}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Club not found
      }
      throw new Error(`Failed to fetch club ${clubId}: ${response.statusText} (${response.status}) from ${apiUrl}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching club by ID ${clubId}:`, error);
    // Depending on the app's error handling strategy,
    // you might want to return null or rethrow a custom error.
    throw error;
  }
}

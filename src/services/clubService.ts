
import type { Club } from '@/lib/types';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path, the browser will handle the domain
    return '/api';
  }
  // Server-side: construct an absolute URL using environment variable.
  // Default to http://localhost:9002 for local dev if not set (though it should be set in .env.local)
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

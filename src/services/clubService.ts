
import type { Club } from '@/lib/types';

const API_BASE_URL = '/api'; // Relative to the current host

export async function getAllClubs(): Promise<Club[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/clubs`);
    if (!response.ok) {
      throw new Error(`Failed to fetch clubs: ${response.statusText} (${response.status})`);
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
  try {
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Club not found
      }
      throw new Error(`Failed to fetch club ${clubId}: ${response.statusText} (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching club by ID ${clubId}:`, error);
    // Depending on the app's error handling strategy,
    // you might want to return null or rethrow a custom error.
    throw error;
  }
}

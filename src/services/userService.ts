import { authedFetch } from "@/lib/apiUtils";
import { Club, CourtlyUserBase } from "@/lib/types";

export async function updateUserProfile(payload: CourtlyUserBase): Promise<CourtlyUserBase> {
    const apiUrlPath = `/users/my-info`;
    try {
        const response = await authedFetch(apiUrlPath, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        const responseBody = await response.json();
        if (!response.ok) {
            const errorMessage = responseBody?.message || `User update failed: ${response.statusText} (${response.status})`;
            throw new Error(errorMessage);
        }
        // Invalidate cache after successful update
        return responseBody as CourtlyUserBase;
    } catch (error) {
        console.error(`Error updating User`, error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unexpected error occurred during user update.');
        }
    }
}

export async function myFavoritesClub(): Promise<string[]> {
    const apiUrlPath = `/users/my-favorites/clubs`;
    try {
        const response = await authedFetch(apiUrlPath, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: `Failed to fetch favorites: ${response.statusText} (${response.status})` }));
            throw new Error(errorBody.message);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching User favorites:', error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unexpected error occurred while fetching User favorites.');
        }
    }
}
export async function toggleFavoriteClub(clubId: string): Promise<Club> {
    const apiUrlPath = `/users/favorites/club/${clubId}`;
    try {
        const response = await authedFetch(apiUrlPath, {
            method: 'POST',
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: `Failed to update favorite status: ${response.statusText} (${response.status})` }));
            throw new Error(errorBody.message);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating User favorite club:', error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('An unexpected error occurred while updating User favorite club.');
        }
    }
}
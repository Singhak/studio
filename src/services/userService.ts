import { authedFetch } from "@/lib/apiUtils";
import { CourtlyUserBase } from "@/lib/types";

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
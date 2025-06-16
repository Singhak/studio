
// src/lib/locationUtils.ts

/**
 * Interface for the approximate location data.
 */
export interface ApproximateLocation {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  queryIp?: string; // The IP address that was queried
}

/**
 * Fetches the approximate location of the user based on their IP address
 * using the ip-api.com service.
 *
 * IMPORTANT:
 * - This method provides an *approximate* location.
 * - It does NOT require explicit browser location permission.
 * - The user's IP address is sent to a third-party service (ip-api.com).
 * - Review ip-api.com's terms of service for production use, especially regarding rate limits.
 *
 * @returns {Promise<ApproximateLocation | null>} A promise that resolves to an
 * ApproximateLocation object or null if the location cannot be determined or an error occurs.
 */
export async function getApproximateLocation(): Promise<ApproximateLocation | null> {
  try {
    // Using http for ip-api.com as their free tier often uses http.
    // For production, ensure you use a service that supports https if available, or your own backend proxy.
    const response = await fetch('http://ip-api.com/json');

    if (!response.ok) {
      console.error(`Error fetching IP location: ${response.status} ${response.statusText}`);
      // Attempt to get error message from ip-api if available
      try {
        const errorData = await response.json();
        console.error('IP-API Error Message:', errorData?.message || 'No specific error message from API.');
      } catch (jsonError) {
        // Ignore if response wasn't JSON
      }
      return null;
    }

    const data = await response.json();

    if (data.status === 'success') {
      return {
        city: data.city,
        region: data.regionName,
        country: data.country,
        countryCode: data.countryCode,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        queryIp: data.query,
      };
    } else {
      console.error('Failed to get location from IP-API:', data.message || 'Unknown error from IP-API.');
      return null;
    }
  } catch (error) {
    console.error('Network or other error fetching IP location:', error);
    return null;
  }
}

/**
 * Example usage (you can call this from a component or another service):
 *
 * async function logUserLocation() {
 *   console.log("Attempting to get approximate location...");
 *   const location = await getApproximateLocation();
 *   if (location) {
 *     console.log('Approximate Location:', location);
 *     // You could send this to your backend, use it for analytics, etc.
 *   } else {
 *     console.log('Could not determine approximate location.');
 *   }
 * }
 *
 * // To test it (e.g., in a useEffect hook in a client component):
 * // useEffect(() => {
 * //   logUserLocation();
 * // }, []);
 */

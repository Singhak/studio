
// src/lib/locationUtils.ts

/**
 * Interface for the combined location data.
 */
export interface UserLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number | null; // Accuracy in meters, from Geolocation API
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  isp?: string;
  queryIp?: string; // The IP address that was queried (from IP API)
  source: 'geolocation-api' | 'ip-api' | 'error' | 'unavailable';
  error?: string; // Optional error message if something went wrong
  timestamp: number; // When the location data was fetched
}

/**
 * Fetches the approximate location of the user based on their IP address
 * using the ip-api.com service.
 * This is used as a fallback if browser geolocation is unavailable or denied.
 *
 * @returns {Promise<UserLocation>} A promise that resolves to a UserLocation object.
 */
export async function getApproximateLocationByIp(): Promise<UserLocation> {
  const timestamp = Date.now();
  try {
    const response = await fetch('http://ip-api.com/json');

    if (!response.ok) {
      const errorText = `Error fetching IP location: ${response.status} ${response.statusText}`;
      console.error(errorText);
      try {
        const errorData = await response.json();
        console.error('IP-API Error Message:', errorData?.message || 'No specific error message from API.');
      } catch (jsonError) {
        // Ignore if response wasn't JSON
      }
      return { source: 'error', error: errorText, timestamp };
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
        source: 'ip-api',
        timestamp,
      };
    } else {
      const errorMessage = `Failed to get location from IP-API: ${data.message || 'Unknown error from IP-API.'}`;
      console.error(errorMessage);
      return { source: 'error', error: errorMessage, timestamp };
    }
  } catch (error) {
    const networkError = 'Network or other error fetching IP location.';
    console.error(networkError, error);
    return { source: 'error', error: networkError, timestamp };
  }
}

/**
 * Gets the user's current location.
 * First, it tries to use the precise browser Geolocation API.
 * If permission is denied or the API is unavailable/fails, it falls back to IP-based geolocation.
 *
 * @returns {Promise<UserLocation>} A promise that resolves to a UserLocation object.
 */
export async function getUserDeviceLocation(): Promise<UserLocation> {
  const timestamp = Date.now();
  if (typeof window !== 'undefined' && navigator.geolocation) {
    return new Promise<UserLocation>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'geolocation-api',
            timestamp: position.timestamp, // Use timestamp from position if available
          });
        },
        async (error) => {
          let errorMessage = "Geolocation API error: ";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "User denied the request for Geolocation.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage += "The request to get user location timed out.";
              break;
            default:
              errorMessage += "An unknown error occurred.";
              break;
          }
          console.warn(errorMessage, 'Falling back to IP-based location.');
          resolve(await getApproximateLocationByIp());
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds
          maximumAge: 60000, // 1 minute old cached position is acceptable
        }
      );
    });
  } else {
    console.log('Browser Geolocation API not available. Falling back to IP-based location.');
    return getApproximateLocationByIp();
  }
}

/**
 * Example usage (you can call this from a component or another service):
 *
 * async function logUserLocation() {
 *   console.log("Attempting to get user's device location...");
 *   const location = await getUserDeviceLocation();
 *   if (location.source !== 'error') {
 *     console.log('User Location:', location);
 *     // You could send this to your backend, use it for analytics, personalization, etc.
 *     // Example: if (location.source === 'geolocation-api') { console.log('Precise location!'); }
 *     // else if (location.source === 'ip-api') { console.log('Approximate location.'); }
 *   } else {
 *     console.log('Could not determine user location:', location.error);
 *   }
 * }
 *
 * // To test it (e.g., in a useEffect hook in a client component):
 * // useEffect(() => {
 * //   logUserLocation();
 * // }, []);
 */

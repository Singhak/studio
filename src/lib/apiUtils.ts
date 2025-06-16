
const CUSTOM_ACCESS_TOKEN_KEY = 'courtlyCustomAccessToken';

export function getApiBaseUrl(): string {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  return `${baseUrl}/api`;
}

// Placeholder functions to be replaced by AuthContext implementations
let _getAccessToken: () => string | null = () => {
  // Fallback to localStorage if not initialized, though direct access is preferred via initialization
  if (typeof window !== 'undefined') return localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY);
  return null;
};
let _attemptTokenRefresh: () => Promise<boolean> = () => {
  console.warn("apiUtils: _attemptTokenRefresh called before initialization from AuthContext.");
  return Promise.resolve(false);
};
let _logoutUser: () => Promise<void> = () => {
  console.warn("apiUtils: _logoutUser called before initialization from AuthContext.");
  return Promise.resolve();
};

interface AuthHelpers {
  getAccessToken: () => string | null;
  attemptTokenRefresh: () => Promise<boolean>;
  logoutUser: () => Promise<void>;
}

/**
 * Initializes the API utility with authentication helper functions from AuthContext.
 * This should be called once AuthContext is initialized.
 */
export function initializeAuthHelpers(helpers: AuthHelpers): void {
  _getAccessToken = helpers.getAccessToken;
  _attemptTokenRefresh = helpers.attemptTokenRefresh;
  _logoutUser = helpers.logoutUser;
}

/**
 * Performs an authenticated fetch request, handling token refresh automatically.
 * @param urlPath The API path (e.g., "/clubs", "/bookings/123")
 * @param options Standard Fetch API options
 * @returns Promise<Response>
 */
export async function authedFetch(urlPath: string, options: RequestInit = {}): Promise<Response> {
  const fullUrl = `${getApiBaseUrl()}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`;
  
  const prepareRequest = (token: string | null): RequestInit => {
    const reqOptions = { ...options };
    reqOptions.headers = { ...reqOptions.headers };

    if (token) {
      (reqOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const method = reqOptions.method?.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      if (!(reqOptions.body instanceof FormData) && !(reqOptions.headers as Record<string, string>)['Content-Type']) {
        (reqOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      }
    }
    return reqOptions;
  };

  let token = _getAccessToken();
  let requestOptions = prepareRequest(token);
  let response = await fetch(fullUrl, requestOptions);

  if (response.status === 401) {
    console.log(`AUTHED_FETCH: Received 401 for ${fullUrl}. Attempting token refresh.`);
    const refreshedSuccessfully = await _attemptTokenRefresh();

    if (refreshedSuccessfully) {
      token = _getAccessToken(); // Get the new token
      if (token) {
        requestOptions = prepareRequest(token); // Re-prepare request with new token
        console.log(`AUTHED_FETCH: Retrying request to ${fullUrl} with new token.`);
        response = await fetch(fullUrl, requestOptions);
      } else {
        console.error("AUTHED_FETCH: Token refresh reported success, but no new token found.");
        await _logoutUser(); // Ensure user is logged out if new token isn't available post-refresh
        // Construct a new Response object to simulate a 401, as the original response might be consumed
        return new Response(JSON.stringify({ message: "Session expired or critical refresh error." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      console.log(`AUTHED_FETCH: Token refresh failed for ${fullUrl}.`);
      // _logoutUser might have been called by _attemptTokenRefresh if the refresh token was invalid.
      // If not (e.g. network error during refresh), the session might still be partially valid on Firebase side.
      // The original 401 response is returned, the caller should handle this (e.g. redirect to login).
    }
  }
  return response;
}


// Keep this for now if any part of the app needs to construct headers manually,
// though authedFetch should be the primary way for services.
export async function getApiAuthHeaders(isPostOrPutOrDelete: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  if (isPostOrPutOrDelete) {
    headers['Content-Type'] = 'application/json';
  }
  const token = _getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

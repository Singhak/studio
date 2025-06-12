
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const realAuthApiUrl = process.env.REAL_AUTH_API_URL;

  if (!realAuthApiUrl) {
    console.error('LOGIN_PROXY_ERROR: REAL_AUTH_API_URL environment variable is not set. Ensure it is defined in your .env.local file and the server is restarted.');
    return NextResponse.json({ message: 'Authentication service is misconfigured. Please contact support (Ref: ENV_MISSING).' }, { status: 503 }); // Service Unavailable
  }

  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      console.error('LOGIN_PROXY_ERROR: idToken is missing from the request body.');
      return NextResponse.json({ message: 'idToken is required' }, { status: 400 });
    }

    console.log(`LOGIN_PROXY_INFO: Attempting to proxy login request for idToken (truncated): ${idToken.substring(0, 20)}... to ${realAuthApiUrl}`);

    // Make a request to your real authentication API
    const realApiResponse = await fetch(realAuthApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Example: Add an API key if your real backend requires it
        // 'X-Api-Key': process.env.REAL_AUTH_API_KEY || '',
      },
      body: JSON.stringify({ firebaseToken: idToken }), // Adjust if your real API expects a different body
    });

    // Try to get text first for better error logging if not JSON
    const responseText = await realApiResponse.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`LOGIN_PROXY_ERROR: Failed to parse JSON response from real API. Status: ${realApiResponse.status}. Response text: ${responseText}`, e);
      return NextResponse.json({ message: 'Invalid response format from authentication service (not JSON).' }, { status: 502 }); // Bad Gateway
    }

    if (!realApiResponse.ok) {
      const errorMessage = responseData?.message || responseData?.error || `Error from real authentication API: ${realApiResponse.status} ${realApiResponse.statusText}`;
      console.error(`LOGIN_PROXY_ERROR: Real auth API returned an error. Status: ${realApiResponse.status}. Response:`, responseData);
      return NextResponse.json({ message: errorMessage }, { status: realApiResponse.status });
    }

    const { accessToken, refreshToken } = responseData;

    if (!accessToken || !refreshToken) {
      console.error('LOGIN_PROXY_ERROR: Real auth API response missing accessToken or refreshToken. Response:', responseData);
      return NextResponse.json({ message: 'Invalid token data from authentication service.' }, { status: 502 }); // Bad Gateway
    }

    console.log('LOGIN_PROXY_INFO: Successfully proxied login. Returning tokens.');
    return NextResponse.json({ accessToken, refreshToken });

  } catch (error) {
    console.error('LOGIN_PROXY_ERROR: Unexpected error in /api/auth/login proxy route:', error);
    let message = 'Internal server error while contacting authentication service.';
    // Check if it's a fetch-related network error
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
        message = `Network error or could not connect to the authentication service at ${realAuthApiUrl}. Please check the URL and network connectivity.`;
        return NextResponse.json({ message }, { status: 504 }); // Gateway Timeout
    }
    return NextResponse.json({ message: message + ` (Ref: PROXY_CATCH_ALL)` }, { status: 500 });
  }
}

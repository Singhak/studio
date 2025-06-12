
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const realAuthApiUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/login';

  if (!realAuthApiUrl) {
    console.error('REAL_AUTH_API_URL environment variable is not set.');
    return NextResponse.json({ message: 'Authentication service is misconfigured. Please contact support.' }, { status: 503 }); // Service Unavailable
  }

  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ message: 'idToken is required' }, { status: 400 });
    }

    // Make a request to your real authentication API
    // Adjust the body structure if your real API expects something different
    const realApiResponse = await fetch(realAuthApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers your real API might need, like an API key
        // 'X-Api-Key': process.env.REAL_AUTH_API_KEY || '',
      },
      body: JSON.stringify({ idToken: idToken }), // Sending idToken as firebaseToken
    });

    const responseData = await realApiResponse.json();

    if (!realApiResponse.ok) {
      // Forward the error message from your real API if available
      const errorMessage = responseData?.message || `Error from real authentication API: ${realApiResponse.status} ${realApiResponse.statusText}`;
      console.error('Error response from real auth API:', responseData);
      return NextResponse.json({ message: errorMessage }, { status: realApiResponse.status });
    }

    // Assuming your real API returns accessToken and refreshToken
    const { accessToken, refreshToken } = responseData;

    if (!accessToken || !refreshToken) {
      console.error('Real auth API response missing accessToken or refreshToken:', responseData);
      return NextResponse.json({ message: 'Invalid response from authentication service.' }, { status: 502 }); // Bad Gateway
    }

    return NextResponse.json({ accessToken, refreshToken });

  } catch (error) {
    console.error('Error in /api/auth/login proxying to real API:', error);
    let message = 'Internal server error while contacting authentication service.';
    if (error instanceof SyntaxError) {
        message = "Failed to parse response from authentication service.";
        return NextResponse.json({ message }, { status: 502 }); // Bad Gateway
    } else if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
        message = "Network error or could not connect to the authentication service.";
        return NextResponse.json({ message }, { status: 504 }); // Gateway Timeout
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}

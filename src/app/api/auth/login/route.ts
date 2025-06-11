
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ message: 'idToken is required' }, { status: 400 });
    }

    // In a real backend, you would validate the Firebase idToken here
    // using the Firebase Admin SDK.
    // For this prototype, we'll just simulate a successful response.
    console.log('Mock /api/auth/login received idToken:', idToken.substring(0, 20) + '...'); // Log a snippet

    const accessToken = `mock-access-token-for-${Date.now()}`;
    const refreshToken = `mock-refresh-token-for-${Date.now()}`;

    return NextResponse.json({ accessToken, refreshToken });

  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

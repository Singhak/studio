
import { NextResponse } from 'next/server';

// This API route provides the public Firebase configuration to the service worker.
// Service workers cannot access process.env, so they fetch the config from here.
export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Basic validation to ensure we don't send an empty object
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return NextResponse.json(
      { error: 'Firebase configuration is missing on the server.' },
      { status: 500 }
    );
  }

  return NextResponse.json(firebaseConfig);
}

// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    // Try to use service account key if available
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccount) {
      const serviceAccountKey = JSON.parse(serviceAccount);
      initializeApp({
        credential: cert(serviceAccountKey),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-buddy-prod',
      });
    } else {
      // Use default credentials (works in production with proper IAM roles)
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-buddy-prod',
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    // Fallback initialization
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-buddy-prod',
    });
  }
}

export const adminDb = getFirestore();

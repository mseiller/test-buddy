// API endpoint to update user plan (for webhook use)
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Use service account key from environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-buddy-prod',
      });
      console.log('Firebase Admin SDK initialized with service account');
    } else {
      // Fallback to project ID only
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-buddy-prod',
      });
      console.log('Firebase Admin SDK initialized with project ID only');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, plan, subscriptionId, isTrial, trialEnd } = await request.json();

    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'Missing userId or plan' },
        { status: 400 }
      );
    }

    // Verify this is a valid plan
    const validPlans = ['free', 'student', 'pro'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    
    const updateData: any = {
      plan,
      updatedAt: new Date(),
    };

    if (subscriptionId) {
      updateData.subscriptionId = subscriptionId;
    }
    if (isTrial !== undefined) {
      updateData.isTrial = isTrial;
    }
    if (trialEnd !== undefined) {
      updateData.trialEnd = trialEnd;
    }

    const userRef = db.collection('users').doc(userId);
    
    // Check if user document exists, if not create it
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        uid: userId,
        plan: plan,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...updateData
      });
      console.log(`Created new user document for ${userId} with ${plan} plan`);
    } else {
      // Update existing user document
      await userRef.update(updateData);
      console.log(`Updated existing user document for ${userId} to ${plan} plan`);
    }

    console.log(`Successfully updated user ${userId} to ${plan} plan`);
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${userId} updated to ${plan} plan` 
    });

  } catch (error) {
    console.error('Error updating user plan:', error);
    return NextResponse.json(
      { error: 'Failed to update user plan' },
      { status: 500 }
    );
  }
}

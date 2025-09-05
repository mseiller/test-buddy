import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLAN_TO_PRICE_ID } from '@/lib/stripe';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already done
if (!auth.apps.length) {
  auth.initializeApp();
}

export async function POST(request: NextRequest) {
  try {
    const { plan, userId } = await request.json();

    if (!plan || !userId) {
      return NextResponse.json(
        { error: 'Missing plan or userId' },
        { status: 400 }
      );
    }

    if (!PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Verify the user exists in Firebase
    try {
      await getAuth().getUser(userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const priceId = PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID];

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/cancel`,
      metadata: {
        userId,
        plan,
      },
      customer_email: undefined, // We'll get this from Firebase user
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

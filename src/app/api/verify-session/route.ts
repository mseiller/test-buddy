import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    const { userId, plan } = session.metadata || {};
    
    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'Missing user ID or plan in session metadata' },
        { status: 400 }
      );
    }

    // Get subscription details
    let subscription = null;
    let isTrialSubscription = false;
    let trialEnd = null;

    if (session.subscription) {
      subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      isTrialSubscription = subscription.status === 'trialing';
      trialEnd = isTrialSubscription ? subscription.trial_end : null;
    }

    // Update user plan via our API
    const updateResponse = await fetch(`${request.nextUrl.origin}/api/update-user-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        plan: plan as 'student' | 'pro',
        isTrial: isTrialSubscription,
        trialEnd: trialEnd,
        subscriptionId: subscription?.id,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update user plan:', errorText);
      return NextResponse.json(
        { error: 'Failed to update user plan' },
        { status: 500 }
      );
    }

    console.log(`Successfully verified session and updated user ${userId} to ${plan} plan`);

    return NextResponse.json({ 
      success: true, 
      message: `User ${userId} updated to ${plan} plan` 
    });

  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}

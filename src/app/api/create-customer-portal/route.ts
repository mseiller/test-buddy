import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId, subscriptionId, returnUrl } = await request.json();


    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    let customerId: string;

    if (subscriptionId) {
      // Get customer ID from subscription
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      customerId = subscription.customer as string;
    } else {
      // Try to find customer by searching subscriptions with userId in metadata
      let userSubscription = null;
      let hasMore = true;
      let startingAfter = undefined;
      
      // Search through all subscriptions (paginated)
      while (hasMore && !userSubscription) {
        const subscriptions = await stripe.subscriptions.list({
          limit: 100,
          starting_after: startingAfter,
        });
        
        userSubscription = subscriptions.data.find(sub => 
          sub.metadata?.userId === userId
        );
        
        hasMore = subscriptions.has_more;
        if (hasMore && subscriptions.data.length > 0) {
          startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
        }
      }
      
      if (!userSubscription) {
        // Return a helpful error message
        return NextResponse.json(
          { error: 'No active subscription found for this user. This might be because your subscription was created before we added proper user tracking. Please contact support to link your subscription to your account.' },
          { status: 404 }
        );
      }
      
      customerId = userSubscription.customer as string;
    }

    // Create a customer portal session
    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || `${request.nextUrl.origin}/support`,
      });
    } catch (error: any) {
      if (error.type === 'StripeInvalidRequestError' && error.message.includes('No configuration provided')) {
        return NextResponse.json(
          { error: 'Customer portal is not configured. Please contact support to set up subscription management.' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });

  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}

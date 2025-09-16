import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook received at:', new Date().toISOString());
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook event type:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        console.log('Session metadata:', session.metadata);
        const { userId, plan, isTrial } = session.metadata!;
        
        if (userId && plan) {
          console.log(`Processing payment for user ${userId}, plan ${plan}`);
          try {
            // Check if this is a trial subscription
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const isTrialSubscription = subscription.status === 'trialing';
            
            // Call our internal API to update the user plan
            const updateResponse = await fetch(`${request.nextUrl.origin}/api/update-user-plan`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                plan: plan as 'student' | 'pro',
                isTrial: isTrialSubscription,
                trialEnd: isTrialSubscription ? subscription.trial_end : null,
                subscriptionId: subscription.id,
              }),
            });

            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error('Failed to update user plan via API:', errorText);
              throw new Error(`Failed to update user plan via API: ${errorText}`);
            }
            
            console.log(`User ${userId} ${isTrialSubscription ? 'started trial for' : 'upgraded to'} ${plan} plan`);
          } catch (error) {
            console.error('Failed to update user plan:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription updates (e.g., plan changes, cancellations)
        console.log('Subscription updated:', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription cancellations - downgrade to free plan
        const userId = subscription.metadata?.userId;
        if (userId) {
          try {
            // Call our internal API to update the user plan
            const updateResponse = await fetch(`${request.nextUrl.origin}/api/update-user-plan`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId,
                plan: 'free',
              }),
            });

            if (!updateResponse.ok) {
              throw new Error('Failed to update user plan via API');
            }
            console.log(`User ${userId} subscription cancelled, downgraded to free`);
          } catch (error) {
            console.error('Failed to downgrade user plan:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle failed payments
        console.log('Payment failed for subscription:', (invoice as any).subscription || 'unknown');
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLAN_TO_PRICE_ID, STRIPE_COUPON_IDS, TRIAL_PERIODS } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, couponCode, isTrial = false } = await request.json();

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

    const priceId = PLAN_TO_PRICE_ID[plan as keyof typeof PLAN_TO_PRICE_ID];
    const trialDays = isTrial ? TRIAL_PERIODS[plan as keyof typeof TRIAL_PERIODS] : undefined;

    // Build session configuration
    const sessionConfig: any = {
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
      locale: 'en', // Set explicit locale to prevent i18n errors
      metadata: {
        userId,
        plan,
        isTrial: isTrial.toString(),
      },
      customer_email: undefined, // We'll get this from Firebase user
    };

    // Add trial period and metadata to subscription
    sessionConfig.subscription_data = {
      metadata: {
        userId,
        plan,
        isTrial: isTrial.toString(),
      },
    };

    if (isTrial && trialDays) {
      sessionConfig.subscription_data.trial_period_days = trialDays;
    }

    // Add coupon if provided
    if (couponCode) {
      // Check if it's a promotional code or coupon ID
      if (couponCode.startsWith('promo_')) {
        // It's a promotional code ID, we need to get the associated coupon
        try {
          const promoCode = await stripe.promotionCodes.retrieve(couponCode);
          sessionConfig.discounts = [{
            coupon: promoCode.coupon.id,
          }];
        } catch (error) {
          console.error('Error retrieving promotional code:', error);
          return NextResponse.json(
            { error: 'Invalid promotional code' },
            { status: 400 }
          );
        }
      } else {
        // Try to find it as a promotional code by name first
        try {
          const promotionCodes = await stripe.promotionCodes.list({
            code: couponCode,
            active: true,
          });
          
          if (promotionCodes.data.length > 0) {
            // Found a promotion code, use the associated coupon
            const promoCode = promotionCodes.data[0];
            sessionConfig.discounts = [{
              coupon: promoCode.coupon.id,
            }];
          } else {
            // It's a direct coupon ID
            sessionConfig.discounts = [{
              coupon: couponCode,
            }];
          }
        } catch (error) {
          console.error('Error looking up promotional code:', error);
          return NextResponse.json(
            { error: 'Invalid coupon code' },
            { status: 400 }
          );
        }
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { couponCode } = await request.json();

    if (!couponCode) {
      return NextResponse.json(
        { error: 'Missing coupon code' },
        { status: 400 }
      );
    }

    let coupon;
    
    try {
      // Check if it's a promotional code ID (starts with 'promo_')
      if (couponCode.startsWith('promo_')) {
        const promoCode = await stripe.promotionCodes.retrieve(couponCode);
        coupon = await stripe.coupons.retrieve(promoCode.coupon.id);
      } else {
        // First try to get it as a promotion code by code name
        const promotionCodes = await stripe.promotionCodes.list({
          code: couponCode,
          active: true,
        });
        
        if (promotionCodes.data.length > 0) {
          // Found a promotion code, get the associated coupon
          const promoCode = promotionCodes.data[0];
          coupon = await stripe.coupons.retrieve(promoCode.coupon.id);
        } else {
          // Try to get it as a direct coupon ID
          coupon = await stripe.coupons.retrieve(couponCode);
        }
      }
    } catch (error) {
      console.error('Error in coupon lookup:', error);
      // If neither works, return invalid
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 400 }
      );
    }
    
    // Check if coupon is valid (active can be undefined for valid coupons)
    if (!coupon.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired coupon' },
        { status: 400 }
      );
    }

    // Return coupon details
    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        duration: coupon.duration,
        duration_in_months: coupon.duration_in_months,
        max_redemptions: coupon.max_redemptions,
        times_redeemed: coupon.times_redeemed,
        metadata: coupon.metadata,
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    
    return NextResponse.json(
      { error: 'Invalid coupon code' },
      { status: 400 }
    );
  }
}

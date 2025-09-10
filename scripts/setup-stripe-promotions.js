#!/usr/bin/env node

/**
 * Script to set up Stripe promotional offers
 * Run with: node scripts/setup-stripe-promotions.js
 */

const Stripe = require('stripe');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function setupPromotions() {
  try {
    console.log('🚀 Setting up Stripe promotional offers...\n');

    // 1. Create or get lifetime pro coupon for family testing
    console.log('📝 Creating/checking lifetime pro coupon for family...');
    let familyCoupon;
    try {
      familyCoupon = await stripe.coupons.create({
        id: 'BUDDYFAMILY2025',
        name: 'Buddy Family 2025 Lifetime Pro',
        percent_off: 100,
        duration: 'forever',
        max_redemptions: 10, // Limit to 10 family members
        metadata: {
          description: 'Free lifetime pro access for family testing',
          created_by: 'admin'
        }
      });
      console.log(`✅ Created family coupon: ${familyCoupon.id}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        familyCoupon = await stripe.coupons.retrieve('BUDDYFAMILY2025');
        console.log(`✅ Family coupon already exists: ${familyCoupon.id}`);
      } else {
        throw error;
      }
    }

    // 2. Create or get 7-day trial coupon for student plan
    console.log('📝 Creating/checking 7-day trial coupon for student plan...');
    let studentTrialCoupon;
    try {
      studentTrialCoupon = await stripe.coupons.create({
        id: 'STUDENT_7DAY_TRIAL',
        name: 'Student 7-Day Free Trial',
        percent_off: 100,
        duration: 'once',
        metadata: {
          description: '7-day free trial for student plan',
          plan: 'student',
          trial_days: '7'
        }
      });
      console.log(`✅ Created student trial coupon: ${studentTrialCoupon.id}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        studentTrialCoupon = await stripe.coupons.retrieve('STUDENT_7DAY_TRIAL');
        console.log(`✅ Student trial coupon already exists: ${studentTrialCoupon.id}`);
      } else {
        throw error;
      }
    }

    // 3. Create or get 7-day trial coupon for pro plan
    console.log('📝 Creating/checking 7-day trial coupon for pro plan...');
    let proTrialCoupon;
    try {
      proTrialCoupon = await stripe.coupons.create({
        id: 'PRO_7DAY_TRIAL',
        name: 'Pro 7-Day Free Trial',
        percent_off: 100,
        duration: 'once',
        metadata: {
          description: '7-day free trial for pro plan',
          plan: 'pro',
          trial_days: '7'
        }
      });
      console.log(`✅ Created pro trial coupon: ${proTrialCoupon.id}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        proTrialCoupon = await stripe.coupons.retrieve('PRO_7DAY_TRIAL');
        console.log(`✅ Pro trial coupon already exists: ${proTrialCoupon.id}`);
      } else {
        throw error;
      }
    }

    // 4. Create promotional codes for easier sharing
    console.log('📝 Creating/checking promotional codes...');
    
    let familyPromoCode;
    try {
      familyPromoCode = await stripe.promotionCodes.create({
        coupon: familyCoupon.id,
        code: 'BUDDYFAMILY2025',
        active: true,
        max_redemptions: 10,
        restrictions: {
          first_time_transaction: true
        }
      });
      console.log(`✅ Created family promo code: ${familyPromoCode.code}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        const existingCodes = await stripe.promotionCodes.list({ code: 'BUDDYFAMILY2025' });
        familyPromoCode = existingCodes.data[0];
        console.log(`✅ Family promo code already exists: ${familyPromoCode.code}`);
      } else {
        throw error;
      }
    }

    let studentTrialPromoCode;
    try {
      studentTrialPromoCode = await stripe.promotionCodes.create({
        coupon: studentTrialCoupon.id,
        code: 'STUDENT7DAY',
        active: true,
        max_redemptions: 100,
        restrictions: {
          first_time_transaction: true
        }
      });
      console.log(`✅ Created student trial promo code: ${studentTrialPromoCode.code}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        const existingCodes = await stripe.promotionCodes.list({ code: 'STUDENT7DAY' });
        studentTrialPromoCode = existingCodes.data[0];
        console.log(`✅ Student trial promo code already exists: ${studentTrialPromoCode.code}`);
      } else {
        throw error;
      }
    }

    let proTrialPromoCode;
    try {
      proTrialPromoCode = await stripe.promotionCodes.create({
        coupon: proTrialCoupon.id,
        code: 'PRO7DAY',
        active: true,
        max_redemptions: 100,
        restrictions: {
          first_time_transaction: true
        }
      });
      console.log(`✅ Created pro trial promo code: ${proTrialPromoCode.code}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        const existingCodes = await stripe.promotionCodes.list({ code: 'PRO7DAY' });
        proTrialPromoCode = existingCodes.data[0];
        console.log(`✅ Pro trial promo code already exists: ${proTrialPromoCode.code}`);
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All promotional offers created successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Family Lifetime Pro: ${familyPromoCode.code} (${familyCoupon.id})`);
    console.log(`- Student 7-Day Trial: ${studentTrialPromoCode.code} (${studentTrialCoupon.id})`);
    console.log(`- Pro 7-Day Trial: ${proTrialPromoCode.code} (${proTrialCoupon.id})`);
    
    console.log('\n💡 Next steps:');
    console.log('1. Add these coupon IDs to your environment variables');
    console.log('2. Update your checkout session creation to support trials');
    console.log('3. Add coupon validation to your checkout flow');

  } catch (error) {
    console.error('❌ Error setting up promotions:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupPromotions();

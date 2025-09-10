import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Stripe price IDs for your plans
export const STRIPE_PRICE_IDS = {
  student: process.env.STRIPE_STUDENT_PRICE_ID!,
  pro: process.env.STRIPE_PRO_PRICE_ID!,
} as const;

// Stripe coupon IDs for promotional offers
export const STRIPE_COUPON_IDS = {
  familyLifetimePro: process.env.STRIPE_FAMILY_LIFETIME_COUPON_ID || 'BUDDYFAMILY2025',
  studentTrial: process.env.STRIPE_STUDENT_TRIAL_COUPON_ID || 'STUDENT_7DAY_TRIAL',
  proTrial: process.env.STRIPE_PRO_TRIAL_COUPON_ID || 'PRO_7DAY_TRIAL',
} as const;

// Plan mapping
export const PLAN_TO_PRICE_ID = {
  student: STRIPE_PRICE_IDS.student,
  pro: STRIPE_PRICE_IDS.pro,
} as const;

// Trial periods (in days)
export const TRIAL_PERIODS = {
  student: 7,
  pro: 7,
} as const;

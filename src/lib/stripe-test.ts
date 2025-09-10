// Test mode for Stripe integration
// This allows you to test the UI without real Stripe keys

export const isStripeTestMode = () => {
  // Check the publishable key since this runs on client-side
  // Only return true if the key is missing or contains placeholder text
  return !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
         process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('your_stripe_publishable_key_here') ||
         process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('pk_test_your_stripe_publishable_key_here') ||
         process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'pk_test_your_stripe_publishable_key_here';
};

export const getTestModeMessage = () => {
  if (isStripeTestMode()) {
    return {
      title: "Test Mode - Stripe Not Configured",
      message: "To test payments, you need to set up Stripe keys in your .env.local file. See DEPLOYMENT_GUIDE.md for instructions.",
      showTestButton: true
    };
  }
  return null;
};

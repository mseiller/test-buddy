// Test mode for Stripe integration
// This allows you to test the UI without real Stripe keys

export const isStripeTestMode = () => {
  return !process.env.STRIPE_SECRET_KEY || 
         process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here');
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

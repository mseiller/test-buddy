# Stripe Promotions Setup Guide

This guide will help you set up promotional offers for Test Buddy, including family lifetime access and 7-day free trials.

## 🚀 Quick Setup

### 1. Run the Setup Script

First, make sure you have your Stripe secret key in your environment:

```bash
# Add to your .env.local
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

Then run the setup script:

```bash
node scripts/setup-stripe-promotions.js
```

This will create:
- **FAMILY2024** - Lifetime pro access for family (10 uses)
- **STUDENT7DAY** - 7-day free trial for student plan (100 uses)
- **PRO7DAY** - 7-day free trial for pro plan (100 uses)

### 2. Update Environment Variables

Add these to your `.env.local` file:

```bash
# Existing Stripe config
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs
STRIPE_STUDENT_PRICE_ID=price_your_student_price_id
STRIPE_PRO_PRICE_ID=price_your_pro_price_id

# New: Coupon IDs (optional - defaults will work)
STRIPE_FAMILY_LIFETIME_COUPON_ID=FAMILY_LIFETIME_PRO
STRIPE_STUDENT_TRIAL_COUPON_ID=STUDENT_7DAY_TRIAL
STRIPE_PRO_TRIAL_COUPON_ID=PRO_7DAY_TRIAL
```

### 3. Test the Integration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test coupon validation:**
   ```bash
   curl -X POST http://localhost:3000/api/validate-coupon \
     -H "Content-Type: application/json" \
     -d '{"couponCode": "FAMILY2024"}'
   ```

3. **Test trial checkout:**
   - Open the paywall modal
   - Check "Start with a 7-day free trial"
   - Try upgrading to Student or Pro plan

## 🎯 Promotional Campaigns

### Family Testing Campaign
- **Code:** `FAMILY2024`
- **Benefit:** Lifetime Pro access (100% off forever)
- **Usage:** Share with up to 10 family members
- **Perfect for:** Getting feedback from trusted users

### Student Trial Campaign
- **Code:** `STUDENT7DAY`
- **Benefit:** 7-day free trial of Student plan
- **Usage:** Up to 100 redemptions
- **Perfect for:** Converting free users to paid

### Pro Trial Campaign
- **Code:** `PRO7DAY`
- **Benefit:** 7-day free trial of Pro plan
- **Usage:** Up to 100 redemptions
- **Perfect for:** Upselling Student users to Pro

## 📊 Monitoring Usage

### Check Coupon Usage in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Coupons**
3. View redemption counts and remaining uses

### Monitor Trial Conversions

1. Go to **Customers** → **Subscriptions**
2. Filter by trial status
3. Track conversion rates from trial to paid

## 🔧 Customization

### Modify Trial Periods

Edit `src/lib/stripe.ts`:

```typescript
export const TRIAL_PERIODS = {
  student: 14, // Change to 14 days
  pro: 7,     // Keep 7 days
} as const;
```

### Add More Coupons

1. Create in Stripe Dashboard or via API
2. Add to `STRIPE_COUPON_IDS` in `src/lib/stripe.ts`
3. Update the setup script if needed

### Custom Promo Codes

Create new promotion codes in Stripe Dashboard:
1. Go to **Products** → **Coupons**
2. Click on a coupon
3. Add **Promotion Codes**
4. Set custom codes like `WELCOME2024`, `STUDENT50`, etc.

## 🚨 Important Notes

### Trial Subscriptions
- Users get full plan access during trial
- No payment required upfront
- Automatic conversion to paid after trial
- Users can cancel anytime during trial

### Coupon Validation
- Real-time validation in the UI
- Server-side validation during checkout
- Automatic application during Stripe checkout

### Webhook Handling
- Trial status tracked in user profile
- Automatic plan updates when trials end
- Subscription status monitoring

## 🎉 Success Metrics to Track

1. **Trial Conversion Rate:** % of trials that convert to paid
2. **Coupon Usage:** How many family codes are used
3. **Time to Conversion:** How quickly users upgrade
4. **Churn Rate:** How many users cancel after trial

## 🔄 Next Steps

1. **Set up analytics** to track conversion rates
2. **Create email sequences** for trial users
3. **A/B test** different trial periods
4. **Monitor feedback** from family testers
5. **Iterate** based on usage data

## 🆘 Troubleshooting

### Common Issues

**Coupon not working:**
- Check if coupon is active in Stripe
- Verify coupon code spelling
- Check if usage limit reached

**Trial not starting:**
- Verify trial_period_days in checkout session
- Check webhook is receiving events
- Confirm user profile is updating

**Payment not processing:**
- Check Stripe keys are correct
- Verify webhook endpoint is accessible
- Check for error logs in Stripe Dashboard

### Getting Help

- Check Stripe Dashboard for detailed error logs
- Review webhook delivery attempts
- Test with Stripe's test cards
- Use Stripe CLI for local webhook testing

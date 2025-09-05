# Test Buddy Deployment Guide

## 🚀 Quick Launch Checklist

### 1. Stripe Setup (Required for Payments)

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com) and create an account
   - Complete business verification

2. **Create Products & Prices**
   - In Stripe Dashboard → Products
   - Create "Student Plan" product with $5/month recurring price
   - Create "Pro Plan" product with $15/month recurring price
   - Copy the Price IDs (start with `price_`)

3. **Get API Keys**
   - In Stripe Dashboard → Developers → API Keys
   - Copy your Publishable Key (starts with `pk_test_`)
   - Copy your Secret Key (starts with `sk_test_`)

4. **Set up Webhooks**
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the webhook secret (starts with `whsec_`)

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs
STRIPE_STUDENT_PRICE_ID=price_your_student_price_id
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
```

### 3. Vercel Deployment

1. **Connect to Vercel**
   - Push your code to GitHub
   - Connect your GitHub repo to Vercel
   - Import the project

2. **Set Environment Variables in Vercel**
   - Go to your Vercel project → Settings → Environment Variables
   - Add all the environment variables from your `.env.local`
   - Make sure to use production Stripe keys (remove `_test`)

3. **Deploy**
   - Vercel will automatically deploy on push to main
   - Or manually deploy from the Vercel dashboard

### 4. Domain Setup (Optional)

1. **Buy Domain through Vercel**
   - In Vercel Dashboard → Domains
   - Search and purchase your domain
   - Vercel will automatically configure DNS

2. **Update Stripe Webhook URL**
   - Update your Stripe webhook endpoint to use your new domain
   - Test the webhook to ensure it's working

### 5. Final Testing

1. **Test Payment Flow**
   - Try upgrading to Student plan
   - Try upgrading to Pro plan
   - Verify webhook events are received
   - Check that user plans are updated in Firebase

2. **Test Support Page**
   - Visit `/support` page
   - Test the contact form
   - Verify support links work

## 🔧 Production Checklist

- [ ] Stripe account created and verified
- [ ] Products and prices created in Stripe
- [ ] Webhook endpoint configured
- [ ] Environment variables set in Vercel
- [ ] Domain configured (optional)
- [ ] Payment flow tested
- [ ] Support page tested
- [ ] Firebase rules deployed
- [ ] Firestore indexes created

## 📞 Support

- **Email**: support@yourbuddyapps.com
- **Support Page**: `/support`

## 🎯 Launch Timeline

**Today/Saturday**: Complete Stripe setup and deploy to Vercel
**Sunday**: Test everything thoroughly
**Monday**: Launch! 🚀

## 💡 Pro Tips

1. **Start with Test Mode**: Use Stripe test keys first, then switch to live keys
2. **Monitor Webhooks**: Check Stripe dashboard for webhook delivery status
3. **Test Payments**: Use Stripe test card numbers (4242 4242 4242 4242)
4. **Backup Plan**: Keep the old direct plan update code commented out as backup

## 🚨 Troubleshooting

**Webhook Issues**: Check Vercel function logs and Stripe webhook logs
**Payment Failures**: Verify price IDs and API keys are correct
**User Plan Not Updating**: Check Firebase permissions and webhook events

---

**You're ready to launch! 🎉**

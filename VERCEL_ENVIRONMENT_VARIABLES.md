# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these to your Vercel project settings:

### **Firebase Configuration**
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test-buddy-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-buddy-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=test-buddy-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"test-buddy-prod",...}
```

### **Stripe Configuration (Live Mode)**
```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STUDENT_PRICE_ID=price_1RdJU3LF0ZMaRFVJosVhsS3M
STRIPE_PRO_PRICE_ID=price_1RdJV2LF0ZMaRFVJQWtCdfSW
STRIPE_FAMILY_LIFETIME_COUPON_ID=BUDDYFAMILY2025
STRIPE_STUDENT_TRIAL_COUPON_ID=STUDENT7DAYTRIAL
STRIPE_PRO_TRIAL_COUPON_ID=PRO7DAYTRIAL
```

### **Email Configuration**
```
NAMECHEAP_EMAIL_USER=notification@yourbuddyapps.com
NAMECHEAP_EMAIL_PASSWORD=your-email-password
NAMECHEAP_SUPPORT_EMAIL=support@yourbuddyapps.com
```

### **OpenRouter API**
```
OPENROUTER_API_KEY=your-openrouter-api-key
```

## How to Add Environment Variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above
5. Make sure they're set for **Production** environment
6. Click "Save"

## Important Notes:

- **FIREBASE_SERVICE_ACCOUNT_KEY** should be the entire JSON as a single line
- All Stripe keys should be **LIVE** keys (not test keys)
- Make sure to set the environment to **Production** for all variables
- The domain will be `test-buddy.com` once deployed

# Test Buddy - Production Deployment Guide

## **Current Status: Phase 3.2 - Webhook Configuration**

### ✅ **Completed:**
- Email system working (Namecheap SMTP)
- Stripe integration working (test mode)
- Firebase authentication working
- Core functionality working
- Favicon conflict resolved

---

## **Phase 3: Stripe Live Configuration**

### **3.1 Switch to Live Mode**
1. **Go to Stripe Dashboard** → Switch to "Live" mode
2. **Create Live Products** (if not already done):
   - Student Plan: $9.99/month
   - Pro Plan: $19.99/month  
   - Family Lifetime: $199.99 one-time
3. **Create Live Coupons**:
   - `BUDDYFAMILY2025` (Family discount)
   - `STUDENT_7DAY_TRIAL` (Student trial)
   - `PRO_7DAY_TRIAL` (Pro trial)

### **3.2 Webhook Configuration** ⬅️ **YOU ARE HERE**
1. **Create Live API Keys**:
   - Go to Stripe Dashboard → Developers → API Keys
   - Switch to "Live" mode
   - Click "Create secret key"
   - Choose **"building your own integration"** (not 3rd party)
   - Copy the live secret key (starts with `sk_live_`)
   - Copy the live publishable key (starts with `pk_live_`)

2. **Create Live Webhook**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe` (update with your actual domain)
   - **Events to Listen For**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - **Copy the webhook signing secret** (starts with `whsec_`)

### **3.3 Customer Portal Configuration**
1. **Go to Stripe Dashboard** → Settings → Billing → Customer Portal
2. **Configure portal settings**:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Set cancellation reasons
3. **Save configuration**

---

## **Phase 4: Environment Variables**

### **4.1 Production Environment Variables**
Create these in your hosting platform (Vercel/Netlify):

```bash
# Stripe Live Keys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret

# Stripe Live Price IDs (get from Stripe Dashboard)
STRIPE_STUDENT_PRICE_ID=price_live_student_price_id
STRIPE_PRO_PRICE_ID=price_live_pro_price_id
STRIPE_FAMILY_LIFETIME_PRICE_ID=price_live_family_price_id

# Stripe Live Coupon IDs
STRIPE_FAMILY_LIFETIME_COUPON_ID=BUDDYFAMILY2025
STRIPE_STUDENT_TRIAL_COUPON_ID=STUDENT_7DAY_TRIAL
STRIPE_PRO_TRIAL_COUPON_ID=PRO_7DAY_TRIAL

# Firebase Production Keys
NEXT_PUBLIC_FIREBASE_API_KEY=your_prod_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test-buddy-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-buddy-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=test-buddy-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_prod_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_prod_app_id
FIREBASE_SERVICE_ACCOUNT_KEY=your_prod_service_account_json

# Email (Production)
NAMECHEAP_EMAIL_USER=notification@yourbuddyapps.com
NAMECHEAP_EMAIL_PASSWORD=your_email_password
NAMECHEAP_SUPPORT_EMAIL=support@yourbuddyapps.com

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key
```

---

## **Phase 5: GitHub Repository**

### **5.1 Repository Setup**
1. **Create GitHub repository** (if not exists)
2. **Push code** to `main` branch
3. **Create `.env.example`** file:

```bash
# Copy the environment variables above but with placeholder values
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
# ... etc
```

4. **Update README.md** with setup instructions

### **5.2 Branch Strategy**
- **`main`**: Production-ready code
- **`develop`**: Development branch
- **Feature branches**: For new features

---

## **Phase 6: Hosting & Domain**

### **6.1 Vercel Deployment (Recommended)**
1. **Connect GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** to production
4. **Get production URL** (e.g., `https://test-buddy.vercel.app`)

### **6.2 Domain Setup**
1. **Purchase domain** (if not already done)
2. **Configure DNS** to point to Vercel
3. **Set up SSL certificate** (automatic with Vercel)
4. **Update webhook URL** in Stripe to use your domain

---

## **Phase 7: Testing & Validation**

### **7.1 Pre-Launch Testing**
- [ ] **Test Stripe flows** in live mode (with small amounts)
- [ ] **Verify webhook functionality**
- [ ] **Test promotional codes**
- [ ] **Test trial periods**
- [ ] **Test user authentication** (production Firebase)
- [ ] **Test file uploads** (production Storage)
- [ ] **Test email system** (production SMTP)

### **7.2 Performance & Security**
- [ ] **Run Lighthouse audit**
- [ ] **Check for security vulnerabilities**
- [ ] **Test mobile responsiveness**
- [ ] **Verify favicon works**

---

## **Phase 8: Launch Preparation**

### **8.1 Content & Branding**
- [ ] **Update favicon** (if needed)
- [ ] **Review all copy and messaging**
- [ ] **Test user onboarding flow**
- [ ] **Prepare support documentation**

### **8.2 Monitoring Setup**
- [ ] **Set up error tracking** (Sentry, LogRocket, etc.)
- [ ] **Configure analytics** (Google Analytics, Mixpanel, etc.)
- [ ] **Set up uptime monitoring**

---

## **Phase 9: Go Live**

### **9.1 Soft Launch**
- [ ] **Deploy to production**
- [ ] **Test with small group** (family/friends)
- [ ] **Monitor for issues**
- [ ] **Gather feedback**

### **9.2 Full Launch**
- [ ] **Announce publicly**
- [ ] **Share promotional codes**
- [ ] **Monitor user signups**
- [ ] **Track conversion rates**

---

## **Recommended Order:**
1. **Firebase Production** → **GitHub** → **Vercel** → **Stripe Live** → **Test** → **Launch**

## **Time Estimate:**
- **Firebase Setup**: 1-2 hours
- **Domain & Hosting**: 30 minutes
- **Stripe Live**: 1 hour
- **Testing**: 1-2 hours  
- **Total**: 3.5-5.5 hours

## **Firebase Data Strategy Recommendation:**
**Start Fresh** - Don't migrate test data to production. This prevents:
- Test user IDs mixing with real users
- Test data cluttering production analytics
- Potential security issues from test configurations
- Cleaner production environment

---

## **Next Steps:**
1. **Complete Phase 3.2** - Set up Stripe live webhooks
2. **Move to Phase 4** - Set up production environment variables
3. **Continue through phases** systematically

**Ready to proceed with Phase 3.2?** 🚀

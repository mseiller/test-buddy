# Test Buddy App - Production Deployment Checklist

## 🚀 Pre-Deployment Setup

### 1. Fix Remaining Issues
- [ ] **Fix favicon conflict** - Delete duplicate `src/app/favicon.ico` file
- [ ] **Test all core functionality** - Quiz generation, file upload, user authentication
- [ ] **Verify Stripe integration** - Test payments, webhooks, customer portal
- [ ] **Test email system** - Support form, notifications

### 2. Environment Variables Setup
Create production environment variables for your hosting platform:

```bash
# Firebase (Production)
NEXT_PUBLIC_FIREBASE_API_KEY=your_prod_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test-buddy-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-buddy-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=test-buddy-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_SERVICE_ACCOUNT_KEY=your_prod_service_account_json

# Stripe (Production)
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_secret
STRIPE_WEBHOOK_SECRET=whsec_your_prod_webhook_secret

# Email (Production)
NAMECHEAP_EMAIL_USER=notification@yourbuddyapps.com
NAMECHEAP_EMAIL_PASSWORD=your_email_password
NAMECHEAP_SUPPORT_EMAIL=support@yourbuddyapps.com

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key
```

### 3. Firebase Production Setup
- [ ] **Create production Firebase project** (if not already done)
- [ ] **Configure Authentication** - Enable email/password, Google, etc.
- [ ] **Set up Firestore** - Configure security rules for production
- [ ] **Configure Storage** - Set up file upload rules
- [ ] **Update security rules** - Ensure proper access control
- [ ] **Set up Firebase Admin SDK** - Generate service account key

### 4. Stripe Production Setup
- [ ] **Switch to live mode** in Stripe dashboard
- [ ] **Create production products and prices**
- [ ] **Configure customer portal** for production
- [ ] **Set up production webhooks** - Point to your production domain
- [ ] **Test payment flow** with real cards (use small amounts)
- [ ] **Configure webhook endpoints** for production

### 5. Domain and SSL Setup
- [ ] **Purchase domain** (if not already done)
- [ ] **Configure DNS** - Point to your hosting platform
- [ ] **Set up SSL certificate** - Usually automatic with modern hosting
- [ ] **Update CORS settings** - Allow your production domain

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

### Option 2: Netlify
```bash
# Build the project
npm run build

# Deploy to Netlify
# Upload dist folder or connect GitHub repo
```

### Option 3: AWS/GCP/Azure
- Set up serverless functions
- Configure CDN
- Set up database connections

## 🔧 Post-Deployment Configuration

### 6. Production Webhooks
- [ ] **Update Stripe webhooks** - Point to `https://yourdomain.com/api/webhooks/stripe`
- [ ] **Test webhook delivery** - Verify events are received
- [ ] **Monitor webhook logs** - Check for failures

### 7. Email Configuration
- [ ] **Test support form** - Send test emails
- [ ] **Verify email delivery** - Check spam folders
- [ ] **Set up email monitoring** - Track delivery rates

### 8. Security & Performance
- [ ] **Enable HTTPS** - Ensure all traffic is encrypted
- [ ] **Set up monitoring** - Error tracking, performance monitoring
- [ ] **Configure backups** - Database and file backups
- [ ] **Set up logging** - Application and error logs

### 9. Testing & Validation
- [ ] **Test user registration** - Create test accounts
- [ ] **Test quiz generation** - Verify AI integration works
- [ ] **Test file uploads** - PDF processing functionality
- [ ] **Test payment flow** - End-to-end payment testing
- [ ] **Test email system** - Support form and notifications
- [ ] **Test customer portal** - Subscription management

### 10. Go-Live Checklist
- [ ] **Update DNS** - Point domain to production
- [ ] **Test all functionality** - Complete user journey
- [ ] **Monitor error logs** - Check for issues
- [ ] **Set up analytics** - Google Analytics, etc.
- [ ] **Create backup strategy** - Regular backups
- [ ] **Document deployment process** - For future updates

## 📊 Monitoring & Maintenance

### 11. Ongoing Maintenance
- [ ] **Set up uptime monitoring** - Pingdom, UptimeRobot
- [ ] **Configure error tracking** - Sentry, Bugsnag
- [ ] **Set up performance monitoring** - New Relic, DataDog
- [ ] **Create monitoring dashboards** - Key metrics
- [ ] **Set up alerts** - Email/SMS notifications for issues

### 12. Backup & Recovery
- [ ] **Database backups** - Daily automated backups
- [ ] **File storage backups** - User uploads and assets
- [ ] **Code repository backups** - Git repository
- [ ] **Environment configuration** - Document all settings
- [ ] **Recovery procedures** - Test restore processes

## 🚨 Important Notes

1. **Test with small amounts** - Use Stripe test mode until everything works
2. **Monitor closely** - Watch logs and errors after deployment
3. **Have rollback plan** - Know how to revert if issues arise
4. **Update documentation** - Keep deployment docs current
5. **Security first** - Ensure all credentials are secure

## 📞 Support & Resources

- **Firebase Console**: https://console.firebase.google.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Namecheap Email**: https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-email-address

---

**Ready to deploy?** Start with fixing the favicon issue and setting up your production environment variables!

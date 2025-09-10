# Local Testing Guide

## 🧪 Testing Your Test Buddy Application Locally

Your development server is running at: **http://localhost:3000**

### ✅ What You Can Test Right Now:

1. **Authentication Flow**
   - Sign up with a new account
   - Sign in with existing account
   - Sign out functionality

2. **Core Features**
   - File upload (PDF, DOCX, TXT, images)
   - Quiz generation from documents
   - Taking quizzes
   - Viewing quiz results
   - Test history
   - Folder management (Pro plan feature)

3. **Plan System (Test Mode)**
   - View current plan in user dropdown
   - Try upgrading plans (will work in test mode)
   - See plan restrictions and feature gates
   - Test paywall modal

4. **Support System**
   - Visit `/support` page
   - Test contact form
   - View FAQ section

### 🧪 Test Mode Features:

- **Plan Upgrades**: Will work locally but show "Test Mode" message
- **No Real Payments**: Stripe integration is in test mode
- **Full Functionality**: All features work as they would in production

### 🎯 How to Test the Payment Flow:

1. **Sign in to your account**
2. **Try to use a premium feature** (like creating more than 3 tests)
3. **Click "Upgrade"** when the paywall appears
4. **Select a plan** (Student or Pro)
5. **Click "Upgrade"** - it will work in test mode!

### 📱 Test Different Scenarios:

- **Free Plan**: Create 3 tests, then try to create more
- **Student Plan**: Test retakes and basic analytics
- **Pro Plan**: Test folders, AI feedback, and unlimited tests

### 🔧 If You Want to Test Real Stripe:

1. Set up a Stripe account (see DEPLOYMENT_GUIDE.md)
2. Replace the placeholder keys in `.env.local`
3. Restart the development server
4. Test with Stripe test cards

### 🚀 Ready for Production?

Once local testing is complete:
1. Push to GitHub
2. Deploy to Vercel
3. Set up production Stripe keys
4. Launch! 🎉

---

**Your app is ready to test! Open http://localhost:3000 and start exploring!**

# Firebase Service Account Setup

To fix the webhook authentication issue, we need to create a Firebase service account key.

## Steps to Create Service Account Key:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `test-buddy-prod`

2. **Navigate to Project Settings**
   - Click the gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"

3. **Go to Service Accounts Tab**
   - Click on "Service accounts" tab
   - You should see "Firebase Admin SDK"

4. **Generate New Private Key**
   - Click "Generate new private key"
   - Click "Generate key" in the confirmation dialog
   - A JSON file will be downloaded

5. **Add to Environment Variables**
   - Copy the contents of the downloaded JSON file
   - Add it to your `.env.local` file as:
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"test-buddy-prod",...}'
   ```

6. **Restart Development Server**
   - The webhook should now work with proper authentication

## Alternative: Manual User Update

If you want to manually update your user's plan right now:

1. Get your user ID from browser console:
   ```javascript
   firebase.auth().currentUser?.uid
   ```

2. Run the manual update script:
   ```bash
   node scripts/fix-user-plan.js <YOUR_USER_ID>
   ```

This will immediately update your user to Pro plan.

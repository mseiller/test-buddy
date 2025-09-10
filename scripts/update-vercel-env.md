# Update Vercel Environment Variables

## Problem
The production app is using Firebase project `test-buddy-7d2cc`, but your user data exists in `test-buddy-prod`.

## Solution
Update the Vercel environment variables to use the correct Firebase project.

## Steps to Fix

### 1. Go to Vercel Dashboard
1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find your `test-buddy` project
3. Click on it

### 2. Update Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
3. Update its value from `test-buddy-7d2cc` to `test-buddy-prod`
4. Make sure it's enabled for **Production** environment
5. Click **Save**

### 3. Update Other Firebase Variables (if needed)
Check if these also need updating:
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` → should be `test-buddy-prod.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` → should be `test-buddy-prod.appspot.com`

### 4. Redeploy
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger a new deployment

### 5. Verify the Fix
After deployment, check:
```bash
curl -s "https://www.test-buddy.com/api/health" | jq .firebaseProjectId
```
Should return: `"test-buddy-prod"`

## Alternative: Use Vercel CLI
If you have Vercel CLI installed:
```bash
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
# Enter: test-buddy-prod
```

## Expected Result
After this fix:
- ✅ User authentication will work
- ✅ User data will be accessible
- ✅ Folders and tests will load properly
- ✅ No more "Missing or insufficient permissions" errors

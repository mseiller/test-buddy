# 🚨 CRITICAL SECURITY FIX GUIDE

## **IMMEDIATE ACTIONS REQUIRED**

### **1. Revoke Exposed Firebase API Key (URGENT)**
- Go to [Firebase Console](https://console.firebase.google.com/project/test-buddy-prod/settings/general)
- Find the API key: `AIzaSyAY7TlhRLIZHb-YMgXsSCkzbYzuFJDNO-8`
- Click "Regenerate" to create a new key
- **This will immediately invalidate the old key**

### **2. Update Environment Variables**
After regenerating the Firebase API key, update these files:
- `.env.local` (local development)
- Vercel environment variables (production)

### **3. Clean Git History (CRITICAL)**

The file `scripts/fix-user-plan.js` contained exposed secrets and was committed to Git. Here are your options:

#### **Option A: Force Push (Recommended for Private Repos)**
```bash
# Remove the problematic commit entirely
git reset --hard 8338e37
git push --force-with-lease origin updated_main
```

#### **Option B: Use BFG Repo-Cleaner (For Public Repos)**
```bash
# Install BFG
brew install bfg

# Remove the file from all history
bfg --delete-files fix-user-plan.js
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force-with-lease origin updated_main
```

#### **Option C: Create New Repository (Safest)**
1. Create a new GitHub repository
2. Copy only the clean code (without the problematic file)
3. Update your Vercel deployment to point to the new repo

### **4. Prevent Future Leaks**

#### **Update .gitignore**
Add these patterns to `.gitignore`:
```
# Scripts with potential secrets
scripts/fix-*.js
scripts/*-user-*.js
scripts/*-plan-*.js

# Environment files
.env*
!.env.example

# Build files that might contain secrets
.next/
build/
dist/
```

#### **Use Environment Variables**
Never hardcode secrets in scripts. Instead:
```javascript
// ❌ BAD - Hardcoded secrets
const firebaseConfig = {
  apiKey: "AIzaSyAY7TlhRLIZHb-YMgXsSCkzbYzuFJDNO-8",
  // ...
};

// ✅ GOOD - Use environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // ...
};
```

### **5. Verify Security**
After fixing:
1. Check GitHub's security tab for any remaining alerts
2. Run a security scan: `npm audit`
3. Verify no secrets in current codebase: `grep -r "sk_\|pk_\|AIza" . --exclude-dir=node_modules --exclude-dir=.git`

## **Current Status**
- ✅ File deleted from working directory
- ✅ File removed from current commit
- ⚠️ File still exists in Git history (commit 5e47088)
- ⚠️ Firebase API key still active (needs regeneration)

## **Next Steps**
1. **IMMEDIATELY** regenerate Firebase API key
2. Choose one of the Git history cleaning options above
3. Update all environment variables
4. Test the application
5. Set up proper security measures

## **Impact Assessment**
- **Firebase API Key**: Can be used to access your Firebase project
- **Project ID**: Public information, not critical
- **App ID**: Public information, not critical
- **Subscription ID**: Less critical, but should be rotated

**This is a HIGH SEVERITY security issue that requires immediate action.**

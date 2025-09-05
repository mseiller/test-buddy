# GitHub Setup Commands

After creating your GitHub repository, run these commands in your terminal:

## 1. Add GitHub Remote
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

## 2. Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## 3. Verify Push
```bash
git remote -v
```

## Example:
If your GitHub username is `seiller` and you name the repo `test-buddy`:
```bash
git remote add origin https://github.com/seiller/test-buddy.git
git branch -M main
git push -u origin main
```

## After Pushing to GitHub:
1. Go to Vercel.com
2. Import your GitHub repository
3. Set up environment variables
4. Deploy!

Your Stripe integration and support page will be live! 🚀

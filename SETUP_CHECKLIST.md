# Firebase Deployment Setup Checklist

## ✅ Configuration Files Created
- [x] `.firebaserc` - Firebase project configuration
- [x] `firebase.json` - Hosting configuration
- [x] `.github/workflows/firebase-deploy-dev.yml` - GitHub Actions workflow
- [x] Updated `vite.config.ts` - Production API URL configured
- [x] Updated `.gitignore` - Firebase files excluded

## 📋 Setup Steps (Do These Now)

### Step 1: Enable Firebase Hosting
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **CC-EMS-Dev**
3. Click **Build** → **Hosting** (in left sidebar)
4. Click **Get started**
5. Follow the setup wizard (you can skip the initial deployment)

### Step 2: Get Firebase Service Account
1. Follow instructions in `FIREBASE_SETUP_GUIDE.md`
2. Download the service account JSON
3. Copy the entire JSON content

### Step 3: Add GitHub Secrets
Go to: `https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions`

Add these secrets:

#### Secret 1: FIREBASE_SERVICE_ACCOUNT
- Click **"New repository secret"**
- Name: `FIREBASE_SERVICE_ACCOUNT`
- Value: Paste the **ENTIRE JSON** from Step 2
- Click **"Add secret"**

#### Secret 2: VITE_API_URL_DEV
- Click **"New repository secret"**
- Name: `VITE_API_URL_DEV`
- Value: `https://api-dev.cc-ems.com/api`
- Click **"Add secret"**

#### Secret 3: GEMINI_API_KEY (Optional)
- Only if you're using AI features
- Name: `GEMINI_API_KEY`
- Value: Your Gemini API key

### Step 4: Verify Backend CORS
Ensure your backend at `https://api-dev.cc-ems.com/api` allows CORS from:
- `https://cc-ems-dev.web.app`
- `https://cc-ems-dev.firebaseapp.com`
- `http://localhost:3000` (for local development)

### Step 5: Test Deployment
1. Commit and push all changes to `main` branch:
   ```bash
   git add .
   git commit -m "feat: Add Firebase deployment configuration"
   git push origin main
   ```

2. Or manually trigger:
   - Go to GitHub → Actions tab
   - Select "Deploy to Firebase (Dev/Test)"
   - Click "Run workflow"

## 🎯 Expected Results

After successful deployment:
- ✅ Frontend will be live at: `https://cc-ems-dev.web.app`
- ✅ Frontend will connect to: `https://api-dev.cc-ems.com/api`
- ✅ GitHub Actions will show green checkmark

## 📝 Files to Review

- `FIREBASE_SETUP_GUIDE.md` - Detailed Firebase Service Account setup
- `DEPLOYMENT.md` - Complete deployment documentation
- `.github/workflows/firebase-deploy-dev.yml` - GitHub Actions workflow

## 🚨 Common Issues

### "Firebase project not found"
- Verify project ID in `.firebaserc` is `cc-ems-dev`
- Ensure you're logged into Firebase CLI: `firebase login`

### "Service account authentication failed"
- Double-check the JSON content in GitHub Secrets
- Ensure you copied the ENTIRE JSON (including all brackets)

### "Build failed"
- Check GitHub Actions logs for specific errors
- Verify all secrets are set correctly
- Ensure `npm ci` can install all dependencies

### "API not connecting"
- Verify `VITE_API_URL_DEV` secret is set correctly
- Check backend CORS settings
- Test backend URL directly: `https://api-dev.cc-ems.com/api/health`

## ✅ Ready to Deploy?

Once all secrets are added:
1. Push to `main` branch, OR
2. Manually trigger workflow from GitHub Actions

Your app will be live in a few minutes! 🚀


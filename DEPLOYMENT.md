# Firebase Deployment Guide - Dev/Test Environment

## Project Details
- **Firebase Project ID**: `cc-ems-dev`
- **Project Name**: `CC-EMS-Dev`
- **Environment**: Dev/Test

## Setup Instructions

### 1. Firebase Service Account Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content
5. Add it to GitHub Secrets as `FIREBASE_SERVICE_ACCOUNT`

### 2. GitHub Secrets Required

Add these secrets in GitHub → Settings → Secrets and variables → Actions:

#### Required Secrets:
- **`FIREBASE_SERVICE_ACCOUNT`**: Full JSON content from Firebase Service Account
  - See `FIREBASE_SETUP_GUIDE.md` for detailed instructions
- **`VITE_API_URL_DEV`**: Backend API URL for dev/test environment
  - **Value**: `https://api-dev.cc-ems.com/api`
- **`GEMINI_API_KEY`** (optional): If using AI features

### 3. Deployment

Deployment happens automatically when you push to the `main` branch, or you can trigger it manually:

1. Go to GitHub → Actions tab
2. Select "Deploy to Firebase (Dev/Test)" workflow
3. Click "Run workflow"

### 4. Access Your Deployed App

After successful deployment, your app will be available at:
- **Hosting URL**: `https://cc-ems-dev.web.app`
- **Alternative URL**: `https://cc-ems-dev.firebaseapp.com`

## Backend API Configuration

✅ **Configured**: Backend API is deployed separately
- **Backend API URL**: `https://api-dev.cc-ems.com/api`
- Frontend is configured to use this URL in production builds
- Ensure CORS is configured on backend to allow requests from `https://cc-ems-dev.web.app`

## MongoDB Configuration

Ensure your MongoDB Atlas:
1. Has IP whitelist configured (allow Firebase Functions IPs or 0.0.0.0/0 for dev)
2. Connection string is ready (will be used in backend environment variables)

## Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Verify all secrets are set correctly
- Ensure Node.js version matches (currently set to 20)

### Deployment Fails
- Verify Firebase Service Account JSON is correct
- Check Firebase project ID matches: `cc-ems-dev`
- Ensure Firebase Hosting is enabled in Firebase Console

### API Not Working
- Verify `VITE_API_URL_DEV` secret is set correctly
- Check CORS settings in backend
- Verify backend is running and accessible

## Next Steps for Production

When ready for production:
1. Create a new Firebase project for production
2. Create a new GitHub Actions workflow for production
3. Update environment variables and secrets
4. Use a different branch (e.g., `production`) for production deployments


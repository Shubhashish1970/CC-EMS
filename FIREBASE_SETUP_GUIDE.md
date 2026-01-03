# Firebase Service Account Setup Guide

## Step-by-Step Instructions

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **CC-EMS-Dev** (Project ID: `cc-ems-dev`)

### Step 2: Navigate to Service Accounts
1. Click on the **⚙️ Settings** icon (top left, next to "Project Overview")
2. Select **Project settings**
3. Click on the **Service accounts** tab (in the top navigation)

### Step 3: Generate Service Account Key
1. You'll see a section titled "Firebase Admin SDK"
2. Click on the **"Generate new private key"** button
3. A dialog will appear warning you about keeping the key secure
4. Click **"Generate key"**
5. A JSON file will be downloaded to your computer (usually in Downloads folder)
   - File name will be something like: `cc-ems-dev-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`

### Step 4: Copy the JSON Content
1. Open the downloaded JSON file in a text editor
2. **Copy the ENTIRE content** of the file (it should look like this):

```json
{
  "type": "service_account",
  "project_id": "cc-ems-dev",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@cc-ems-dev.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Step 5: Add to GitHub Secrets
1. Go to your GitHub repository: `https://github.com/Shubhashish1970/CC-EMS`
2. Click on **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**
5. Name: `FIREBASE_SERVICE_ACCOUNT`
6. Value: **Paste the ENTIRE JSON content** you copied in Step 4
7. Click **"Add secret"**

### Step 6: Add Other Required Secrets

Add these additional secrets:

#### Secret 1: VITE_API_URL_DEV
- **Name**: `VITE_API_URL_DEV`
- **Value**: `https://api-dev.cc-ems.com/api`

#### Secret 2: GEMINI_API_KEY (if using AI features)
- **Name**: `GEMINI_API_KEY`
- **Value**: Your Gemini API key (if you have one)

### Step 7: Verify Secrets
After adding all secrets, you should see:
- ✅ `FIREBASE_SERVICE_ACCOUNT`
- ✅ `VITE_API_URL_DEV`
- ✅ `GEMINI_API_KEY` (if applicable)

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit the service account JSON file to Git
- Never share the service account key publicly
- The JSON file is already in `.gitignore` to prevent accidental commits
- If the key is ever exposed, regenerate it immediately in Firebase Console

## Troubleshooting

### Can't find Service Accounts tab?
- Make sure you're in **Project settings** (not User settings)
- You need to be a project owner or have appropriate permissions

### JSON file won't download?
- Check your browser's download settings
- Try a different browser
- Check if pop-up blockers are enabled

### GitHub secret too large?
- The service account JSON should be fine (usually ~2KB)
- If you get an error, double-check you copied the entire JSON correctly

## Next Steps

Once all secrets are added:
1. The GitHub Actions workflow will automatically use these secrets
2. Push to `main` branch to trigger deployment
3. Or manually trigger from GitHub Actions tab



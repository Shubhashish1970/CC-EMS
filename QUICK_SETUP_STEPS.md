# Quick Setup Steps - Firebase Service Account & GitHub Secrets

## Step 1: Get Firebase Service Account JSON

### Detailed Instructions:

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Make sure you're logged in with the correct Google account

2. **Select Your Project**
   - Click on the project dropdown (top left, shows "CC-EMS-Dev")
   - Select **CC-EMS-Dev** (Project ID: `cc-ems-dev`)

3. **Navigate to Service Accounts**
   - Click the **⚙️ Settings** icon (gear icon, top left next to "Project Overview")
   - Click **"Project settings"** from the dropdown
   - Click on the **"Service accounts"** tab (in the top navigation bar)

4. **Generate Private Key**
   - Scroll down to the section titled **"Firebase Admin SDK"**
   - You'll see a code snippet and a button
   - Click the **"Generate new private key"** button
   - A warning dialog will appear - click **"Generate key"**
   - A JSON file will download automatically (usually to your Downloads folder)
   - File name will be something like: `cc-ems-dev-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`

5. **Open the JSON File**
   - Go to your Downloads folder
   - Open the downloaded JSON file in a text editor (TextEdit, VS Code, etc.)
   - **Copy the ENTIRE content** - it should look like this:

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

**⚠️ IMPORTANT**: Copy the ENTIRE JSON including the opening `{` and closing `}`

---

## Step 2: Add GitHub Secrets

### Detailed Instructions:

1. **Go to GitHub Repository Settings**
   - Open: https://github.com/Shubhashish1970/CC-EMS
   - Click on **"Settings"** tab (top navigation, next to "Insights")

2. **Navigate to Secrets**
   - In the left sidebar, click **"Secrets and variables"**
   - Click **"Actions"** (under "Secrets and variables")

3. **Add First Secret: FIREBASE_SERVICE_ACCOUNT**
   - Click the **"New repository secret"** button (top right)
   - **Name**: Type exactly: `FIREBASE_SERVICE_ACCOUNT`
   - **Secret**: Paste the ENTIRE JSON content you copied in Step 1
   - Click **"Add secret"**
   - ✅ You should see it appear in the list

4. **Add Second Secret: VITE_API_URL_DEV**
   - Click **"New repository secret"** again
   - **Name**: Type exactly: `VITE_API_URL_DEV`
   - **Secret**: Type exactly: `https://api-dev.cc-ems.com/api`
   - Click **"Add secret"**
   - ✅ You should see it appear in the list

5. **Add Third Secret: GEMINI_API_KEY (Optional)**
   - Only if you're using AI features
   - Click **"New repository secret"** again
   - **Name**: Type exactly: `GEMINI_API_KEY`
   - **Secret**: Paste your Gemini API key
   - Click **"Add secret"**

6. **Verify All Secrets**
   - You should now see 2-3 secrets:
     - ✅ `FIREBASE_SERVICE_ACCOUNT`
     - ✅ `VITE_API_URL_DEV`
     - ✅ `GEMINI_API_KEY` (if added)

---

## Visual Guide - Where to Find Service Accounts

```
Firebase Console
  └── Select Project: CC-EMS-Dev
      └── ⚙️ Settings (gear icon, top left)
          └── Project settings
              └── Service accounts tab
                  └── Firebase Admin SDK section
                      └── "Generate new private key" button
```

---

## Troubleshooting

### Can't find Service Accounts?
- Make sure you're in **Project settings** (not User settings)
- You need to be a project owner or have admin permissions

### JSON file won't download?
- Check browser download settings
- Try a different browser
- Check if pop-up blockers are enabled

### GitHub secret too large?
- The JSON should be fine (usually ~2KB)
- Make sure you copied the ENTIRE JSON correctly
- Check for any extra spaces or line breaks

### Secret not working?
- Double-check the secret name is EXACTLY: `FIREBASE_SERVICE_ACCOUNT`
- Ensure the JSON is valid (starts with `{` and ends with `}`)
- Make sure there are no extra quotes around the JSON

---

## Once You're Done

After adding all secrets, let me know and I'll:
1. Commit all the configuration files
2. Push to GitHub
3. Trigger the deployment (or you can do it manually)

Your app will be live at: **https://cc-ems-dev.web.app** 🚀


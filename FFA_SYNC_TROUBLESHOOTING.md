# FFA Sync Troubleshooting Guide

## Issue: Request Timeout When Syncing FFA

If you're seeing timeout errors when clicking "Sync FFA" in the Admin Dashboard, this guide will help you fix it.

## Root Cause

The backend is trying to connect to the Mock FFA API, but either:
1. Mock FFA API is not deployed to Cloud Run
2. Backend has `FFA_API_URL` set to `localhost:4000` (which doesn't work in Cloud Run production)

## Quick Fix Steps

### Option 1: Deploy Mock FFA API via GitHub Actions (Recommended)

1. **Go to GitHub Actions:**
   - Navigate to: https://github.com/Shubhashish1970/CC-EMS/actions/workflows/deploy-mock-ffa-api.yml

2. **Trigger Mock FFA API Deployment:**
   - Click "Run workflow" button (top right)
   - Select branch: `main`
   - Click "Run workflow" (green button)
   - Wait for deployment to complete (~2-3 minutes)

3. **Verify Mock FFA API is Deployed:**
   - Check the workflow run logs
   - Look for: `✅ Mock FFA API deployed successfully!`
   - Note the Service URL (e.g., `https://mock-ffa-api-xxxxx.run.app`)

4. **Redeploy Backend:**
   - The backend deployment will auto-detect the Mock FFA API URL on next deployment
   - Or trigger backend deployment manually:
     - Go to: https://github.com/Shubhashish1970/CC-EMS/actions/workflows/deploy-backend.yml
     - Click "Run workflow"
     - Select branch: `main`
     - Click "Run workflow"

### Option 2: Set FFA_API_URL Manually (If Mock FFA API is Already Deployed)

1. **Get Mock FFA API URL:**
   - Run the diagnostic script (if you have gcloud CLI):
     ```bash
     ./scripts/check-ffa-api-status.sh
     ```
   - OR check GitHub Actions logs for "Deploy Mock FFA API to Cloud Run" workflow
   - Look for: `🔗 Service URL: https://mock-ffa-api-xxxxx.run.app`

2. **Set GitHub Secret:**
   - Go to: https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions
   - Click "New repository secret"
   - Name: `FFA_API_URL`
   - Value: `https://mock-ffa-api-xxxxx.run.app/api` (add `/api` to the service URL)
   - Click "Add secret"

3. **Redeploy Backend:**
   - Go to: https://github.com/Shubhashish1970/CC-EMS/actions/workflows/deploy-backend.yml
   - Click "Run workflow"
   - Select branch: `main`
   - Click "Run workflow"

### Option 3: Use Diagnostic Scripts (Local)

If you have `gcloud` CLI installed and authenticated:

```bash
# Check if Mock FFA API is deployed
./scripts/check-ffa-api-status.sh

# Check what FFA_API_URL is set in backend
./scripts/check-backend-ffa-url.sh
```

## Verification

After deployment:

1. **Check Deployment Logs:**
   - Go to GitHub Actions: https://github.com/Shubhashish1970/CC-EMS/actions/workflows/deploy-backend.yml
   - Open the latest workflow run
   - Look for: `✅ Found Mock FFA API at: https://...`
   - Look for: `✅ Final FFA_API_URL_VALUE: https://mock-ffa-api-xxxxx.run.app/api`

2. **Check Backend Logs (if still having issues):**
   - Go to Google Cloud Console
   - Navigate to Cloud Run → cc-ems-backend → Logs
   - Look for FFA sync attempts and connection details

3. **Test FFA Sync:**
   - Go to Admin Dashboard → Activity Sampling
   - Click "Sync FFA" button
   - Should see success message instead of timeout

## Current Status

Based on deployment workflow improvements:
- ✅ Backend deployment now fails fast if Mock FFA API is not found (prevents localhost fallback)
- ⏳ Mock FFA API deployment needs to be triggered manually via GitHub Actions
- ⏳ After Mock FFA API is deployed, backend will auto-detect the URL on next deployment

## Expected Behavior After Fix

- Mock FFA API deployed at: `https://mock-ffa-api-xxxxx.run.app`
- Backend `FFA_API_URL` set to: `https://mock-ffa-api-xxxxx.run.app/api`
- FFA Sync button works without timeout errors
- Activities and farmers sync successfully

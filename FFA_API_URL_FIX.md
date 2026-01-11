# FFA_API_URL Configuration Issue

## Problem Identified

The verification workflow shows that `FFA_API_URL` is incorrectly set in the backend:

**Current (Wrong):**
```
https://cc-ems-backend-pkfkujfoga-uc.a.run.app
```

**Should Be:**
```
https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api
```

## Root Cause

The backend's `FFA_API_URL` environment variable is pointing to the backend service itself instead of the Mock FFA API service. This causes:
- 404 errors when backend tries to call FFA endpoints
- Backend attempting to call itself (circular)
- FFA sync failing

## Solution

### Option 1: Update GitHub Secret (Recommended)

1. **Go to GitHub Secrets:**
   - Navigate to: https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions

2. **Update FFA_API_URL Secret:**
   - Click on `FFA_API_URL` secret
   - Click "Update" button
   - **Set value to:** `https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api`
   - **Important:** Include `/api` at the end
   - Click "Update secret"

3. **Redeploy Backend:**
   - Go to: https://github.com/Shubhashish1970/CC-EMS/actions/workflows/deploy-backend.yml
   - Click "Run workflow"
   - Select branch: `main`
   - Click "Run workflow"
   - Wait for deployment to complete (~3-5 minutes)

### Option 2: Verify Current Secret Value

If the GitHub secret is already set correctly, the deployment might not have picked it up. In this case:
1. Verify the secret value in GitHub Settings
2. Trigger a backend redeployment to apply the correct value

## Verification

After updating and redeploying:

1. **Check Deployment Logs:**
   - Look for: `✅ Using FFA_API_URL from GitHub secret: https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api`
   - Verify the correct URL is being used

2. **Run Verification Script:**
   ```bash
   ./scripts/verify-ffa-config.sh
   ```
   Should show:
   - ✅ Backend FFA_API_URL: `https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api`
   - ✅ Health endpoint working (HTTP 200)
   - ✅ Activities endpoint working (HTTP 200)

3. **Check Backend Logs:**
   - Google Cloud Console → Cloud Run → `cc-ems-backend` → Logs
   - Look for: `[FFA SYNC] Fetching activities from FFA API: https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api/activities`
   - Should show successful API calls, not 404 errors

4. **Test FFA Sync:**
   - Admin Dashboard → Activity Sampling
   - Click "Sync FFA" button
   - Should complete successfully without 404 errors

## Expected Result

After fixing:
- ✅ Backend `FFA_API_URL` = `https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api`
- ✅ FFA sync works without 404 errors
- ✅ Backend logs show successful FFA API calls
- ✅ Activities are synced successfully
- ✅ Verification workflow passes

## Current Status

- ❌ `FFA_API_URL` points to backend itself (wrong)
- ✅ Mock FFA API is deployed and working
- ✅ Verification script identifies the issue
- 🔄 Next: Update GitHub secret and redeploy

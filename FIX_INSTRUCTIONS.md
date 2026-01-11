# Fix FFA_API_URL Configuration

## Issue

The backend's `FFA_API_URL` is currently set to:
```
https://cc-ems-backend-pkfkujfoga-uc.a.run.app
```

This is **WRONG** - it's pointing to the backend itself instead of the Mock FFA API.

## Correct Value

The `FFA_API_URL` should be set to:
```
https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api
```

## How to Fix

### Step 1: Update GitHub Secret

1. **Navigate to GitHub Secrets:**
   - Go to: https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions

2. **Find and Update FFA_API_URL:**
   - Scroll down to find `FFA_API_URL` in the list
   - Click on the `FFA_API_URL` secret (or click the edit/pencil icon)

3. **Update the Value:**
   - Click "Update" button
   - **Delete the current value** (which is likely: `https://cc-ems-backend-pkfkujfoga-uc.a.run.app`)
   - **Enter the correct value:** `https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api`
   - ⚠️ **Important:** Make sure to include `/api` at the end
   - Click "Update secret"

4. **Verify:**
   - The secret should now show: `FFA_API_URL` (last updated: just now)
   - Value should be: `https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api`

### Step 2: Redeploy Backend

1. **Go to Backend Deployment Workflow:**
   - Navigate to: https://github.com/Shubhashish1970/CC-EMS/actions/workflows/deploy-backend.yml

2. **Trigger Deployment:**
   - Click the "Run workflow" button (top right)
   - Select branch: `main`
   - Click the green "Run workflow" button
   - Wait for deployment to complete (~3-5 minutes)

3. **Verify in Deployment Logs:**
   - Look for this line in the logs:
     ```
     ✅ Using FFA_API_URL from GitHub secret: https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api
     ```
   - This confirms the correct URL is being used

### Step 3: Verify Fix

1. **Run Verification Workflow:**
   - Go to: https://github.com/Shubhashish1970/CC-EMS/actions/workflows/verify-ffa-config.yml
   - Click "Run workflow"
   - Select branch: `main`
   - Click "Run workflow"
   - The workflow should now **pass** ✅

2. **Or Run Locally:**
   ```bash
   ./scripts/verify-ffa-config.sh
   ```
   Should show:
   - ✅ Backend FFA_API_URL: `https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api`
   - ✅ Health endpoint working (HTTP 200)
   - ✅ Activities endpoint working (HTTP 200)

3. **Test FFA Sync:**
   - Go to Admin Dashboard → Activity Sampling
   - Click "Sync FFA" button
   - Should complete successfully without 404 errors

## Summary

**Current (Wrong):**
- `FFA_API_URL` = `https://cc-ems-backend-pkfkujfoga-uc.a.run.app` ❌

**After Fix:**
- `FFA_API_URL` = `https://mock-ffa-api-pkfkujfoqa-uc.a.run.app/api` ✅

**Action Required:**
1. Update GitHub secret `FFA_API_URL` to the correct value
2. Redeploy backend
3. Verify fix

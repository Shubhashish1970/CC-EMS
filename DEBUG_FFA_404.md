# Debugging FFA Sync 404 Error

## Issue
FFA Sync is returning 404 error: `FFA API error (404): Not Found`

## Root Cause Analysis

### URL Construction Logic
1. **FFA_API_URL format (from deployment):** `https://mock-ffa-api-xxxxx.run.app/api`
2. **Backend code constructs:** `${FFA_API_URL}/activities?limit=100`
3. **Final URL:** `https://mock-ffa-api-xxxxx.run.app/api/activities?limit=100` ✅
4. **Mock FFA API endpoint:** `app.get('/api/activities', ...)` ✅

The URL construction logic is **correct**.

### Possible Causes of 404

1. **Mock FFA API Not Deployed** (Most Likely)
   - The service `mock-ffa-api` doesn't exist in Cloud Run
   - Any request to a non-existent service returns 404
   - **Solution:** Deploy Mock FFA API first

2. **FFA_API_URL Points to Wrong Service**
   - If `FFA_API_URL` points to backend URL instead of Mock FFA API
   - Backend doesn't have `/api/activities` endpoint
   - **Solution:** Verify and correct `FFA_API_URL` value

3. **Trailing Slash Issue**
   - If `FFA_API_URL` has trailing slash: `https://mock-ffa-api-xxxxx.run.app/api/`
   - URL becomes: `https://mock-ffa-api-xxxxx.run.app/api//activities` (double slash)
   - Some servers might not handle this correctly
   - **Solution:** Fixed in code to remove trailing slash

4. **Mock FFA API Service Not Accessible**
   - Service exists but is not publicly accessible
   - Network/firewall issues
   - **Solution:** Check Cloud Run service permissions

## How to Verify

### Check Backend Logs
Look for this log entry in Cloud Run logs:
```
[FFA SYNC] Fetching activities from FFA API: https://...
```

This shows the **exact URL** being used. Compare it with:
- Expected Mock FFA API URL: `https://mock-ffa-api-xxxxx.run.app/api/activities?limit=100`

### Test Mock FFA API Directly
1. Get Mock FFA API URL from Cloud Run console
2. Test health endpoint:
   ```bash
   curl https://mock-ffa-api-xxxxx.run.app/api/health
   ```
   Should return: `{"success": true, "message": "Mock FFA API is running", ...}`

3. Test activities endpoint:
   ```bash
   curl https://mock-ffa-api-xxxxx.run.app/api/activities?limit=5
   ```
   Should return activities data

### Check FFA_API_URL Value
From backend deployment logs (GitHub Actions), look for:
```
✅ Final FFA_API_URL_VALUE: https://mock-ffa-api-xxxxx.run.app/api
```

## Fix Applied

I've added code to handle trailing slashes in `FFA_API_URL`:
- Removes trailing slash if present
- Prevents double-slash issues: `/api//activities`
- Ensures clean URL construction

## Next Steps

1. **Verify Mock FFA API is Deployed:**
   - Go to: Google Cloud Console → Cloud Run
   - Check if `mock-ffa-api` service exists
   - If not, deploy it via GitHub Actions

2. **Check Backend Logs:**
   - Look for the actual URL being used
   - Verify it matches Mock FFA API URL

3. **Test Mock FFA API:**
   - Test the endpoints directly to confirm they work
   - If they don't work, the Mock FFA API needs to be deployed/fixed

4. **Redeploy Backend:**
   - After Mock FFA API is confirmed working
   - Backend will auto-detect the correct URL

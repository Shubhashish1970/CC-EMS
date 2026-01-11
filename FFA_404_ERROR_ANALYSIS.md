# FFA Sync 404 Error Analysis

## Error Message
```
FFA API error (404): Not Found
Failed to fetch activities from FFA API: FFA API error (404): Not Found
```

## Root Cause Analysis

The 404 error indicates that the endpoint `/api/activities` is not found at the configured `FFA_API_URL`.

### Expected URL Structure
- **FFA_API_URL should be:** `https://mock-ffa-api-xxxxx.run.app/api`
- **Code constructs:** `${FFA_API_URL}/activities?limit=100`
- **Final URL:** `https://mock-ffa-api-xxxxx.run.app/api/activities?limit=100`
- **Mock FFA API endpoint:** `app.get('/api/activities', ...)`

### Possible Causes

1. **FFA_API_URL Not Set Correctly**
   - The environment variable might be pointing to the wrong URL
   - It might be pointing to the backend URL instead of Mock FFA API URL
   - Check the deployment logs to see what `FFA_API_URL` was set to

2. **Mock FFA API Not Deployed**
   - The Mock FFA API service might not be deployed
   - The service might be deployed but not accessible
   - Check if `mock-ffa-api` service exists in Cloud Run

3. **Trailing Slash Issue**
   - If `FFA_API_URL` has a trailing slash: `https://mock-ffa-api-xxxxx.run.app/api/`
   - Then URL becomes: `https://mock-ffa-api-xxxxx.run.app/api//activities` (double slash)
   - This might cause routing issues

4. **Double /api Issue**
   - If `FFA_API_URL` already includes `/api`: `https://mock-ffa-api-xxxxx.run.app/api`
   - And code appends `/activities`, we get: `/api/activities` ✅ (Correct)
   - But if somehow there's double `/api/api`, that would be wrong

## How to Debug

1. **Check Backend Logs for FFA_API_URL**
   - Look for: `[FFA SYNC] Fetching activities from FFA API: https://...`
   - This log shows the actual URL being used
   - Compare it with the expected Mock FFA API URL

2. **Check Deployment Logs**
   - Go to: GitHub Actions → Deploy Backend workflow
   - Look for: `✅ Final FFA_API_URL_VALUE: https://...`
   - Verify it points to Mock FFA API, not backend

3. **Verify Mock FFA API is Deployed**
   - Go to: Google Cloud Console → Cloud Run
   - Check if `mock-ffa-api` service exists
   - Verify its URL matches the `FFA_API_URL`

4. **Test Mock FFA API Directly**
   - Try accessing: `https://mock-ffa-api-xxxxx.run.app/api/health`
   - Should return: `{"success": true, "message": "Mock FFA API is running", ...}`
   - Try accessing: `https://mock-ffa-api-xxxxx.run.app/api/activities?limit=100`
   - Should return activities data

## Solution

Based on the error, the most likely issue is that `FFA_API_URL` is either:
1. Not set (using default `http://localhost:4000/api` which doesn't work in Cloud Run)
2. Set to the wrong URL (pointing to backend instead of Mock FFA API)
3. Mock FFA API is not deployed

**Recommended Actions:**
1. Verify Mock FFA API is deployed and accessible
2. Check the actual `FFA_API_URL` value from backend logs
3. If wrong, redeploy backend (it should auto-detect Mock FFA API URL)
4. Or manually set `FFA_API_URL` GitHub secret to: `https://mock-ffa-api-xxxxx.run.app/api`

# Fix Login Issue - Database Configuration

## Problem
The deployed backend is using a different database than the local one. The login fails because the deployed backend's `MONGODB_URI` environment variable points to a different database (possibly `test` or an old database).

## Solution

The deployed backend gets its `MONGODB_URI` from **GitHub Secrets**. You need to update the secret to point to `Kweka_Call_Centre` database.

### Option 1: Update GitHub Secret (Recommended)

1. **Go to GitHub Repository Settings:**
   - Navigate to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
   - Or: Repository → Settings → Secrets and variables → Actions

2. **Find `MONGODB_URI` secret:**
   - Click on `MONGODB_URI` to edit it

3. **Update the database name:**
   - Current (likely): `mongodb+srv://.../test?...`
   - Change to: `mongodb+srv://.../Kweka_Call_Centre?...`
   
   Example:
   ```
   mongodb+srv://shubhashish_db_user:QBkSEUpsL1fLYyOV@cluster0.lmyofqz.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority
   ```

4. **Save the secret**

5. **Redeploy the backend:**
   - The next push to `main` branch will trigger a new deployment
   - Or manually trigger: Actions → Deploy Backend to Cloud Run → Run workflow

### Option 2: Update Cloud Run Directly (Quick Fix)

If you have `gcloud` CLI installed and authenticated:

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Update the MONGODB_URI environment variable
gcloud run services update cc-ems-backend \
  --region us-central1 \
  --update-env-vars MONGODB_URI="mongodb+srv://shubhashish_db_user:QBkSEUpsL1fLYyOV@cluster0.lmyofqz.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority"
```

**Note:** This is a temporary fix. The next deployment will overwrite it with the GitHub secret value.

### Option 3: Check Current Configuration

Run the script to check what database the deployed backend is using:

```bash
./scripts/check-cloud-run-env.sh
```

Or manually check:

```bash
gcloud run services describe cc-ems-backend \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env[?(@.name=='MONGODB_URI')].value)"
```

## Verify Fix

After updating:

1. **Wait 1-2 minutes** for Cloud Run to update
2. **Try logging in again** with:
   - Email: `shubhashish@intelliagri.in`
   - Password: `Admin@123`

3. **Check backend logs** if still failing:
   ```bash
   gcloud run services logs read cc-ems-backend --region us-central1 --limit 50
   ```

## Current Database Status

✅ **Local database (`Kweka_Call_Centre`) is fixed:**
- All users have password: `Admin@123`
- All data migrated from `test` database
- 4 users available:
  - `shubhashish@kweka.ai` (mis_admin)
  - `shubhashish@intelliagri.in` (cc_agent)
  - `telegu@naclind.com` (cc_agent)
  - `shubhashish.dutta@gmail.com` (team_lead)

⚠️ **Deployed backend needs to be updated** to use `Kweka_Call_Centre` database.

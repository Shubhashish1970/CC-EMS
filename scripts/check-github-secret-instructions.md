# How to Check GitHub MONGODB_URI Secret

Since I cannot directly access GitHub secrets (they are encrypted), here's how you can check and update it:

## Method 1: Check via GitHub Web Interface

1. **Go to your repository secrets:**
   - Navigate to: `https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions`
   - Or: Repository → Settings → Secrets and variables → Actions

2. **Find `MONGODB_URI`:**
   - You'll see a list of secrets
   - Find `MONGODB_URI` in the list
   - **Note:** You can see the secret name, but the value is hidden (shows as `••••••••`)
   - Click on `MONGODB_URI` to edit it

3. **Check the database name:**
   - When you click to edit, you'll see the full URI
   - Look for the database name in the URI: `mongodb+srv://.../DATABASE_NAME?...`
   - It should be: `Kweka_Call_Centre`
   - If it shows `test` or something else, that's the problem!

## Method 2: Check via GitHub CLI (if installed)

```bash
# Install GitHub CLI if not installed
# brew install gh (macOS) or see https://cli.github.com/

# Authenticate
gh auth login

# List secrets (names only, values are hidden)
gh secret list

# Note: You cannot view secret values via CLI for security reasons
# You can only update them
```

## Method 3: Check Cloud Run Logs

The backend logs might show which database it's connecting to:

```bash
gcloud run services logs read cc-ems-backend \
  --region us-central1 \
  --limit 50 \
  --project YOUR_PROJECT_ID
```

Look for connection messages that might show the database name.

## Method 4: Test Login and Check Error

The login error can tell us:
- If user not found → Database might be wrong
- If password invalid → Database is correct but password hash is wrong

## Current Status

✅ **Local database (`Kweka_Call_Centre`) is correct:**
- All users have password: `Admin@123`
- 4 users available

⚠️ **Deployed backend needs verification:**
- Check if GitHub secret `MONGODB_URI` points to `Kweka_Call_Centre`
- If it points to `test` or another database, update it

## How to Update the Secret

1. Go to: `https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions`
2. Click on `MONGODB_URI`
3. Update the URI to:
   ```
   mongodb+srv://shubhashish_db_user:QBkSEUpsL1fLYyOV@cluster0.lmyofqz.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority
   ```
4. Click "Update secret"
5. Redeploy (or wait for next push to trigger deployment)

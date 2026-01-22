# How to Check GitHub MONGODB_URI Secret

## ⚠️ Important: Secrets Cannot Be Read Programmatically

GitHub secrets are **encrypted and secure**. I cannot read them directly, but you can check them through the web interface.

## Method 1: Check via GitHub Web Interface (Easiest)

### Step-by-Step:

1. **Go to your repository:**
   ```
   https://github.com/Shubhashish1970/CC-EMS
   ```

2. **Navigate to Secrets:**
   - Click **Settings** (top menu)
   - Click **Secrets and variables** → **Actions** (left sidebar)

3. **Find MONGODB_URI:**
   - You'll see a list of secrets
   - Find **`MONGODB_URI`** in the list
   - **Note:** The value is hidden (shows as `••••••••`)

4. **View/Edit the Secret:**
   - Click on **`MONGODB_URI`**
   - You'll see the **full connection string** (unmasked)
   - Look for the database name: `mongodb+srv://.../DATABASE_NAME?...`

5. **Check the Database Name:**
   - ✅ **Should be:** `Kweka_Call_Centre`
   - ❌ **If it's:** `test`, `ems_call_centre`, or anything else → **This is the problem!**

6. **Update if Wrong:**
   - Change the database name to `Kweka_Call_Centre`
   - Full URI should be:
     ```
     mongodb+srv://shubhashish_db_user:QBkSEUpsL1fLYyOV@cluster0.lmyofqz.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority
     ```
   - Click **Update secret**

## Method 2: Use GitHub CLI (If Installed)

```bash
# Install GitHub CLI (if not installed)
# macOS: brew install gh
# Or: https://cli.github.com/

# Authenticate
gh auth login

# List secrets (names only, values are hidden)
gh secret list

# Note: Secret VALUES cannot be viewed via CLI for security
# You can only update them:
# gh secret set MONGODB_URI
```

## Method 3: Check Deployment Logs

The deployment workflow logs might show clues (though the actual secret value is masked):

1. Go to: `https://github.com/Shubhashish1970/CC-EMS/actions`
2. Click on the latest "Deploy Backend to Cloud Run" workflow
3. Look for any error messages about database connection
4. **Note:** The actual `MONGODB_URI` value will be masked as `***`

## Method 4: Infer from Login Behavior

Based on the login error, we can infer:

- **"User not found"** → Backend connects to `test` or empty database
- **"Invalid credentials"** → Database might be correct, but password hash is wrong
- **Login succeeds** → Database is correct (`Kweka_Call_Centre`)

## What We Know

✅ **Correct Database:** `Kweka_Call_Centre`
- Has 4 users
- Password `Admin@123` works for `shubhashish@intelliagri.in`

❌ **Wrong Databases:**
- `test` → 0 users
- `ems_call_centre` → 0 users

## Quick Check Script

I've created a script to test the deployed backend:

```bash
./scripts/check-deployed-database.sh
```

This will test login and infer which database the backend is using.

## Summary

**You need to manually check the GitHub secret** because:
1. Secrets are encrypted for security
2. Only repository owners/admins can view them
3. They're never exposed in logs or API responses

**The secret should point to:**
```
mongodb+srv://.../Kweka_Call_Centre?...
```

If it points to any other database, that's why login fails!

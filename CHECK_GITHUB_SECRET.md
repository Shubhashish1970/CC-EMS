# Check GitHub MONGODB_URI Secret

## Quick Steps to Check and Fix

### Step 1: Access GitHub Secrets

1. Go to your repository: `https://github.com/Shubhashish1970/CC-EMS`
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Find **`MONGODB_URI`** in the list

### Step 2: Check the Database Name

1. Click on **`MONGODB_URI`** to edit it
2. You'll see the full connection string
3. **Look for the database name** in the URI:
   ```
   mongodb+srv://.../DATABASE_NAME?...
   ```

### Step 3: Verify What It Should Be

**Current (likely wrong):**
- `.../test?...` ❌
- `.../ems_call_centre?...` ❌
- Or some other database name ❌

**Should be:**
- `.../Kweka_Call_Centre?...` ✅

### Step 4: Update If Wrong

If the database name is NOT `Kweka_Call_Centre`, update it to:

```
mongodb+srv://shubhashish_db_user:QBkSEUpsL1fLYyOV@cluster0.lmyofqz.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority
```

**Important:** Make sure the database name is exactly `Kweka_Call_Centre` (case-sensitive).

### Step 5: Save and Redeploy

1. Click **Update secret**
2. The next deployment will use the new value
3. Or manually trigger: **Actions** → **Deploy Backend to Cloud Run** → **Run workflow**

## Why This Matters

- ✅ **Local database** (`Kweka_Call_Centre`) has all users with password `Admin@123`
- ❌ **Deployed backend** uses whatever database is in the GitHub secret
- If the secret points to `test` or another database, login will fail because:
  - That database might not have the users
  - Or the passwords might be different

## Verification

After updating the secret and redeploying, try logging in:
- Email: `shubhashish@intelliagri.in`
- Password: `Admin@123`

If it still fails, check:
1. Deployment completed successfully (check GitHub Actions)
2. Wait 2-3 minutes after deployment for service to update
3. Check browser console for specific error messages

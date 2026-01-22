# MongoDB Database Verification Results

## ✅ Verification Complete

Using MongoDB CLI, I've verified all databases in your cluster:

### Database Status

| Database | Users Count | Login User Found | Status |
|----------|-------------|------------------|--------|
| **Kweka_Call_Centre** | **4** | ✅ **YES** | ✅ **CORRECT** |
| test | 0 | ❌ NO | ❌ **WRONG** |
| ems_call_centre | 0 | ❌ NO | ❌ **WRONG** |

### Kweka_Call_Centre Database (✅ CORRECT)

**Users:**
- `shubhashish@kweka.ai` (mis_admin)
- `shubhashish@intelliagri.in` (cc_agent) ✅ **Login user**
- `telegu@naclind.com` (cc_agent)
- `shubhashish.dutta@gmail.com` (team_lead)

**Password Verification:**
- ✅ Password `Admin@123` works for `shubhashish@intelliagri.in`
- ✅ All users have valid password hashes
- ✅ User is active

### Test Database (❌ WRONG)

- **0 users** - Empty database
- If deployed backend connects here, login will fail with "User not found"

### ems_call_centre Database (❌ WRONG)

- **0 users** - Empty database
- If deployed backend connects here, login will fail with "User not found"

## 🔍 Root Cause

The deployed backend is likely connecting to the **`test`** database (or another wrong database) instead of **`Kweka_Call_Centre`**.

This is why login fails:
1. Backend queries `test` database (or wrong database)
2. User `shubhashish@intelliagri.in` doesn't exist there (0 users)
3. Backend returns "Invalid credentials"

## ✅ Solution

**Update GitHub Secret `MONGODB_URI` to:**

```
mongodb+srv://shubhashish_db_user:QBkSEUpsL1fLYyOV@cluster0.lmyofqz.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority
```

**Important:** The database name must be exactly `Kweka_Call_Centre` (case-sensitive).

## 📝 Steps to Fix

1. **Go to GitHub Secrets:**
   - `https://github.com/Shubhashish1970/CC-EMS/settings/secrets/actions`

2. **Edit `MONGODB_URI` secret:**
   - Click on `MONGODB_URI`
   - Verify database name is `Kweka_Call_Centre`
   - If not, update to the URI above

3. **Redeploy:**
   - Push a change to trigger deployment, or
   - Manually trigger: Actions → Deploy Backend to Cloud Run

4. **Test Login:**
   - Email: `shubhashish@intelliagri.in`
   - Password: `Admin@123`

## 🧪 Test Script

Run this script anytime to verify database status:

```bash
./scripts/test-mongodb-connection.sh
```

This will show you which database has the correct users.

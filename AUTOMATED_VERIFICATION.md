# Automated Verification Tools

This document describes the automated verification tools created for the CC EMS system.

## Available Scripts

### 1. `scripts/verify-ffa-config.sh`
**Purpose:** Comprehensive FFA API configuration verification

**What it does:**
- Checks backend `FFA_API_URL` environment variable
- Tests Mock FFA API health endpoint
- Tests Mock FFA API activities endpoint
- Provides clear status messages and error diagnostics

**Usage:**
```bash
./scripts/verify-ffa-config.sh
```

**When to use:**
- Manual verification of FFA API configuration
- Troubleshooting 404 errors
- Pre-deployment checks
- After updating `FFA_API_URL` secret

### 2. `scripts/verify-deployment.sh`
**Purpose:** Post-deployment verification

**What it does:**
- Verifies `FFA_API_URL` is set in deployed service
- Tests FFA API connectivity after deployment
- Provides deployment status feedback

**Usage:**
```bash
./scripts/verify-deployment.sh [SERVICE_NAME]
```

**When to use:**
- Automatically runs after backend deployment (via GitHub Actions)
- Manual verification after deployment
- Quick health check

### 3. `scripts/quick-test-ffa.sh`
**Purpose:** Quick FFA API URL testing (no gcloud auth required)

**What it does:**
- Tests any FFA_API_URL value you provide
- Tests health and activities endpoints
- Shows HTTP status codes and responses

**Usage:**
```bash
./scripts/quick-test-ffa.sh <FFA_API_URL>
```

**Example:**
```bash
./scripts/quick-test-ffa.sh https://mock-ffa-api-xxxxx.run.app/api
```

**When to use:**
- Quick testing without authentication
- Testing URLs before setting as secret
- Troubleshooting endpoint issues

## GitHub Actions Workflows

### 1. `.github/workflows/verify-ffa-config.yml`
**Purpose:** Automated FFA API configuration verification

**Triggers:**
- Manual workflow dispatch
- Daily schedule (2 AM UTC)
- When verification scripts change

**What it does:**
- Runs `verify-ffa-config.sh` in CI environment
- Verifies backend configuration
- Tests FFA API connectivity
- Provides status in GitHub Actions

**Access:**
- GitHub Actions → "Verify FFA API Configuration" workflow

### 2. `.github/workflows/deploy-backend.yml` (Updated)
**Purpose:** Backend deployment with post-deployment verification

**New feature:**
- Automatically runs `verify-deployment.sh` after deployment
- Verifies `FFA_API_URL` is set correctly
- Tests FFA API connectivity
- Provides feedback in deployment logs

## Benefits

1. **Automated Verification:** No manual checks needed
2. **Early Detection:** Problems detected immediately after deployment
3. **Clear Diagnostics:** Detailed error messages and solutions
4. **CI/CD Integration:** Runs automatically in GitHub Actions
5. **Time Savings:** Reduces manual verification time

## Example Workflow

1. **Update FFA_API_URL Secret:**
   - Go to GitHub Secrets
   - Update `FFA_API_URL` value
   
2. **Deploy Backend:**
   - GitHub Actions automatically deploys
   - Post-deployment verification runs automatically
   - Check deployment logs for verification status

3. **Manual Verification (if needed):**
   ```bash
   ./scripts/verify-ffa-config.sh
   ```

4. **Scheduled Verification:**
   - Runs daily at 2 AM UTC
   - Check GitHub Actions for results

## Troubleshooting

If verification fails:

1. **Check Backend Logs:**
   - Google Cloud Console → Cloud Run → `cc-ems-backend` → Logs
   - Look for `[FFA SYNC]` messages

2. **Verify Mock FFA API:**
   ```bash
   ./scripts/quick-test-ffa.sh https://mock-ffa-api-xxxxx.run.app/api
   ```

3. **Check GitHub Secrets:**
   - Ensure `FFA_API_URL` is set correctly
   - Format: `https://mock-ffa-api-xxxxx.run.app/api`

4. **Redeploy Backend:**
   - Trigger deployment workflow
   - Check verification step in logs

## Future Enhancements

Potential additions:
- Health check endpoint in backend
- Automated email alerts on failures
- Integration with monitoring services
- Extended verification for other services
- Performance testing automation

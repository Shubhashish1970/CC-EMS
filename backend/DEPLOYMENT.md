# Backend Deployment Guide - Google Cloud Run

This guide covers deploying the CC EMS Backend API to Google Cloud Run.

## Prerequisites

- Google Cloud Platform account with billing enabled
- Google Cloud SDK (`gcloud`) installed
- MongoDB Atlas account (or MongoDB instance)
- Domain name configured (optional, for custom domain)

## Required Environment Variables

Set these environment variables in Cloud Run:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ Yes | `mongodb+srv://user:pass@cluster.mongodb.net/Kweka_Call_Centre` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | ✅ Yes | `your-super-secret-jwt-key-change-in-production` |
| `JWT_EXPIRES_IN` | JWT token expiration | ❌ No | `7d` (default) |
| `PORT` | Server port | ❌ No | `8080` (Cloud Run default) |
| `NODE_ENV` | Environment mode | ❌ No | `production` (recommended) |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | ❌ No | `https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com` |
| `FFA_API_URL` | FFA API endpoint | ❌ No | `http://localhost:4000/api` (default) |
| `ENABLE_CRON` | Enable cron jobs | ❌ No | `true` (recommended for production) |

## Deployment Steps

### Step 1: Install Google Cloud SDK

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### Step 2: Authenticate and Set Project

```bash
# Login to GCP
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### Step 3: Build Docker Image

```bash
cd backend

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cc-ems-backend

# Or use Artifact Registry (recommended)
gcloud artifacts repositories create cc-ems-repo \
  --repository-format=docker \
  --location=us-central1

gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/cc-ems-repo/cc-ems-backend
```

### Step 4: Deploy to Cloud Run

```bash
gcloud run deploy cc-ems-backend \
  --image gcr.io/YOUR_PROJECT_ID/cc-ems-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars MONGODB_URI=your-mongodb-uri,JWT_SECRET=your-jwt-secret,NODE_ENV=production,CORS_ORIGIN=https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com,ENABLE_CRON=true
```

### Step 5: Configure Environment Variables (Alternative Method)

Instead of setting env vars in the deploy command, you can use:

```bash
# Set environment variables
gcloud run services update cc-ems-backend \
  --region us-central1 \
  --set-env-vars MONGODB_URI=your-mongodb-uri \
  --set-env-vars JWT_SECRET=your-jwt-secret \
  --set-env-vars NODE_ENV=production \
  --set-env-vars CORS_ORIGIN=https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com \
  --set-env-vars ENABLE_CRON=true
```

Or use Google Cloud Console:
1. Go to Cloud Run → Select service → Edit & Deploy New Revision
2. Go to "Variables & Secrets" tab
3. Add environment variables

### Step 6: Configure Custom Domain (Optional)

1. **Map Domain in Cloud Run:**
   ```bash
   gcloud run domain-mappings create \
     --service cc-ems-backend \
     --domain api-dev.cc-ems.com \
     --region us-central1
   ```

2. **Update DNS Records:**
   - Cloud Run will provide DNS records to add
   - Add the provided CNAME or A records to your DNS provider
   - Wait for DNS propagation (can take up to 48 hours)

### Step 7: Verify Deployment

```bash
# Get the service URL
gcloud run services describe cc-ems-backend --region us-central1 --format 'value(status.url)'

# Test health endpoint
curl https://YOUR_SERVICE_URL/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "EMS Call Centre API is running",
  "timestamp": "2024-01-03T12:00:00.000Z"
}
```

## Post-Deployment Steps

### 1. Verify Health Endpoint

```bash
curl https://api-dev.cc-ems.com/api/health
```

### 2. Verify Database Connection

```bash
curl https://api-dev.cc-ems.com/api/health/database
```

Expected response:
```json
{
  "success": true,
  "message": "Database connected",
  "readyState": 1
}
```

### 3. Test Authentication

```bash
curl -X POST https://api-dev.cc-ems.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@nacl.com","password":"your-password"}'
```

### 4. Update Frontend CORS

Ensure your backend CORS configuration includes:
- `https://cc-ems-dev.web.app`
- `https://cc-ems-dev.firebaseapp.com`

Set `CORS_ORIGIN` environment variable:
```
CORS_ORIGIN=https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com
```

### 5. Seed Initial Data (First Time Only)

If deploying for the first time, you may need to:
1. Seed admin user
2. Seed master data (crops/products)

These can be done via scripts or API endpoints.

## Monitoring & Logs

- **View Logs**: `gcloud run services logs read cc-ems-backend --region us-central1`
- **Cloud Console**: Go to Cloud Run → Select service → Logs tab
- **Real-time Logs**: `gcloud run services logs tail cc-ems-backend --region us-central1`

## Troubleshooting

### Backend Not Starting
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check logs: `gcloud run services logs read cc-ems-backend --region us-central1`
- Verify PORT is set to 8080 (Cloud Run requirement)

### CORS Errors
- Verify `CORS_ORIGIN` includes your frontend domain
- Check backend logs for CORS rejection messages
- Ensure CORS_ORIGIN is comma-separated without spaces

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0` (all IPs) or Cloud Run IP ranges
- Check MongoDB connection string format
- Verify database name: `Kweka_Call_Centre`

### Health Check Failing
- Ensure PORT environment variable is set to 8080
- Check if health endpoint is accessible: `/api/health`
- Verify service is running: `gcloud run services describe cc-ems-backend --region us-central1`

### Container Build Failures
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Review build logs in Cloud Build console

## Security Checklist

- [ ] JWT_SECRET is strong (min 32 characters, random)
- [ ] MongoDB connection string uses authentication
- [ ] CORS_ORIGIN is restricted to known domains
- [ ] NODE_ENV is set to `production`
- [ ] HTTPS is enabled (automatic with Cloud Run)
- [ ] Environment variables are stored securely in Cloud Run
- [ ] Service is configured with appropriate IAM permissions
- [ ] Consider using Secret Manager for sensitive values

## Cost Optimization

- **Min Instances**: Set to 0 for cost savings (cold starts may occur)
- **Max Instances**: Adjust based on expected traffic (25-30 agents = 2-3 instances)
- **Memory**: 512Mi is sufficient for this workload
- **CPU**: 1 CPU is sufficient
- **Timeout**: 300 seconds (5 minutes) is reasonable

## Next Steps

After successful deployment:
1. Update frontend `VITE_API_URL_DEV` to point to your deployed backend
2. Test login functionality
3. Monitor logs for any errors
4. Set up monitoring/alerting in Cloud Console
5. Configure Cloud Run service account permissions if needed

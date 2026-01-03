# Quick Backend Deployment Guide - Google Cloud Run

## 🚀 Prerequisites

1. **Google Cloud Platform Account**
   - Sign up at [cloud.google.com](https://cloud.google.com)
   - Enable billing (required for Cloud Run)

2. **Install Google Cloud SDK**
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

3. **Authenticate**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

## 📦 Step 1: Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

## 🏗️ Step 2: Build Docker Image

```bash
cd backend

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cc-ems-backend
```

## 🚀 Step 3: Deploy to Cloud Run

```bash
gcloud run deploy cc-ems-backend \
  --image gcr.io/YOUR_PROJECT_ID/cc-ems-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars MONGODB_URI=your-mongodb-uri,JWT_SECRET=your-jwt-secret,NODE_ENV=production,CORS_ORIGIN=https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com,ENABLE_CRON=true
```

**Replace:**
- `YOUR_PROJECT_ID` with your GCP project ID
- `your-mongodb-uri` with your MongoDB Atlas connection string
- `your-jwt-secret` with a strong random string (min 32 characters)

## 🌐 Step 4: Configure Custom Domain (Optional)

```bash
gcloud run domain-mappings create \
  --service cc-ems-backend \
  --domain api-dev.cc-ems.com \
  --region us-central1
```

Then update your DNS records as instructed by Cloud Run.

## ✅ Step 5: Verify Deployment

```bash
# Get service URL
gcloud run services describe cc-ems-backend --region us-central1 --format 'value(status.url)'

# Test health endpoint
curl https://YOUR_SERVICE_URL/api/health
```

Should return:
```json
{
  "success": true,
  "message": "EMS Call Centre API is running"
}
```

---

## 📋 Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | JWT secret (min 32 chars) |
| `CORS_ORIGIN` | ⚠️ | Frontend domains (comma-separated) |
| `NODE_ENV` | ⚠️ | Set to `production` |
| `ENABLE_CRON` | ⚠️ | Set to `true` for cron jobs |
| `FFA_API_URL` | ⚠️ | FFA API endpoint |
| `PORT` | ❌ | Auto-set to 8080 by Cloud Run |
| `JWT_EXPIRES_IN` | ❌ | Default: `7d` |

---

## ✅ Post-Deployment Checklist

- [ ] Health endpoint works: `/api/health`
- [ ] Database health works: `/api/health/database`
- [ ] CORS allows frontend domains
- [ ] Custom domain configured (if needed)
- [ ] Environment variables set correctly
- [ ] Logs show no errors

---

## 🔍 Troubleshooting

**Backend not starting?**
- Check all environment variables are set
- Verify MongoDB connection string
- Check logs: `gcloud run services logs read cc-ems-backend --region us-central1`

**CORS errors?**
- Verify `CORS_ORIGIN` includes frontend domain
- Check backend logs for CORS rejections

**Database connection failed?**
- Check MongoDB Atlas IP whitelist (allow all IPs: `0.0.0.0/0` for testing)
- Verify connection string format
- Check database name: `Kweka_Call_Centre`

**Container build failed?**
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Review build logs in Cloud Build console

---

## 🎯 Next Steps After Deployment

1. **Update Frontend API URL**
   - Update GitHub Secret: `VITE_API_URL_DEV`
   - Set to: `https://api-dev.cc-ems.com/api` (or your Cloud Run URL)
   - Redeploy frontend

2. **Test Login**
   - Go to frontend: `https://cc-ems-dev.web.app`
   - Try logging in with test credentials

3. **Monitor Logs**
   - View logs: `gcloud run services logs tail cc-ems-backend --region us-central1`
   - Or use Cloud Console: Cloud Run → Select service → Logs

---

## 📚 More Information

- **Full Deployment Guide**: See `backend/DEPLOYMENT.md`
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Dockerfile**: Already configured in `backend/Dockerfile`

# Backend Deployment - Google Cloud Run Setup ✅

## What's Been Created

I've set up complete deployment configuration for your backend API on Google Cloud Run. Here's what's ready:

### 📦 Deployment Files Created

1. **`backend/Dockerfile`** - Container configuration for Cloud Run
2. **`backend/.dockerignore`** - Files to exclude from Docker build
3. **`backend/DEPLOYMENT.md`** - Comprehensive Cloud Run deployment guide
4. **`backend/QUICK_DEPLOY.md`** - Quick start guide for Cloud Run
5. **`backend/.github/workflows/deploy-backend.yml`** - GitHub Actions workflow for CI/CD (optional)

### 🎯 Deployment Platform: Google Cloud Run

**Why Cloud Run?**
- ✅ Serverless containerized deployment
- ✅ Auto-scaling (0 to N instances based on traffic)
- ✅ Pay-per-use pricing (cost-effective for 25-30 agents)
- ✅ Integrated with Firebase ecosystem
- ✅ Built-in HTTPS and load balancing
- ✅ Custom domain support
- ✅ No server management required

### 📋 Required Information

Before deploying, you'll need:

1. **Google Cloud Platform Account**
   - Sign up at [cloud.google.com](https://cloud.google.com)
   - Enable billing (required for Cloud Run)
   - Create a project

2. **MongoDB Atlas Connection String**
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/Kweka_Call_Centre`
   - Database name: `Kweka_Call_Centre`
   - Make sure IP whitelist allows all IPs (`0.0.0.0/0`) for testing

3. **JWT Secret**
   - Generate a strong random string (minimum 32 characters)
   - Example: Use `openssl rand -base64 32` or any secure random generator

4. **Domain Configuration** (if using custom domain)
   - Domain: `api-dev.cc-ems.com`
   - Update DNS records as instructed by Cloud Run

### 🚀 Quick Start

1. **Install Google Cloud SDK**
   ```bash
   brew install google-cloud-sdk  # macOS
   ```

2. **Authenticate and Set Project**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Enable APIs**
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   ```

4. **Build and Deploy**
   ```bash
   cd backend
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cc-ems-backend
   
   gcloud run deploy cc-ems-backend \
     --image gcr.io/YOUR_PROJECT_ID/cc-ems-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars MONGODB_URI=...,JWT_SECRET=...,CORS_ORIGIN=...
   ```

See `backend/QUICK_DEPLOY.md` for detailed steps.

### ✅ Verification Steps

After deployment, verify:

1. **Health Check**:
   ```bash
   curl https://api-dev.cc-ems.com/api/health
   ```
   Should return: `{"success":true,"message":"EMS Call Centre API is running",...}`

2. **Database Connection**:
   ```bash
   curl https://api-dev.cc-ems.com/api/health/database
   ```
   Should return: `{"success":true,"message":"Database connected",...}`

3. **Test Login**:
   ```bash
   curl -X POST https://api-dev.cc-ems.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"agent@nacl.com","password":"your-password"}'
   ```

### 🔄 After Backend is Deployed

1. **Update Frontend GitHub Secret**:
   - Go to GitHub → Settings → Secrets → Actions
   - Update `VITE_API_URL_DEV` to: `https://api-dev.cc-ems.com/api`
   - This will trigger a new frontend deployment

2. **Test Frontend Login**:
   - Go to: https://cc-ems-dev.web.app
   - Try logging in
   - Should now connect successfully!

### 📚 Documentation

- **Quick Start**: See `backend/QUICK_DEPLOY.md`
- **Full Guide**: See `backend/DEPLOYMENT.md`
- **Cloud Run Docs**: https://cloud.google.com/run/docs

### 🆘 Troubleshooting

**Backend won't start?**
- Check all environment variables are set correctly
- Verify MongoDB connection string
- Check Cloud Run logs: `gcloud run services logs read cc-ems-backend --region us-central1`

**CORS errors?**
- Verify `CORS_ORIGIN` includes: `https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com`
- Check backend logs for CORS rejection messages

**Database connection failed?**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Verify database name: `Kweka_Call_Centre`

**Container build failed?**
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Review build logs in Cloud Build console

---

## 🎉 Ready to Deploy!

All configuration files are ready. Follow the steps in `backend/QUICK_DEPLOY.md` to deploy to Google Cloud Run.

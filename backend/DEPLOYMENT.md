# Backend Deployment Guide

This guide covers deploying the CC EMS Backend API to production.

## Prerequisites

- MongoDB Atlas account (or MongoDB instance)
- Deployment platform account (Railway, Render, Google Cloud Run, etc.)
- Domain name configured (if using custom domain)

## Required Environment Variables

Set these environment variables in your deployment platform:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | ✅ Yes | `mongodb+srv://user:pass@cluster.mongodb.net/Kweka_Call_Centre` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | ✅ Yes | `your-super-secret-jwt-key-change-in-production` |
| `JWT_EXPIRES_IN` | JWT token expiration | ❌ No | `7d` (default) |
| `PORT` | Server port | ❌ No | `5000` (default) |
| `NODE_ENV` | Environment mode | ❌ No | `production` (recommended) |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | ❌ No | `https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com` |
| `FFA_API_URL` | FFA API endpoint | ❌ No | `http://localhost:4000/api` (default) |
| `ENABLE_CRON` | Enable cron jobs | ❌ No | `true` (recommended for production) |

## Deployment Options

### Option 1: Railway (Recommended for Quick Setup)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up/login with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` directory as the root

3. **Configure Environment Variables**
   - Go to Project Settings → Variables
   - Add all required environment variables (see above)

4. **Configure Build Settings**
   - Railway will auto-detect the Dockerfile
   - Or set build command: `npm run build`
   - Set start command: `npm start`

5. **Get Domain**
   - Railway provides a default domain
   - Or configure custom domain: `api-dev.cc-ems.com`

### Option 2: Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up/login

2. **Create Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Set:
     - **Name**: `cc-ems-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Docker`
     - **Build Command**: (auto-detected from Dockerfile)
     - **Start Command**: (auto-detected from Dockerfile)

3. **Configure Environment Variables**
   - Go to Environment tab
   - Add all required variables

4. **Configure Custom Domain**
   - Go to Settings → Custom Domains
   - Add: `api-dev.cc-ems.com`
   - Update DNS records as instructed

### Option 3: Google Cloud Run

1. **Install Google Cloud SDK**
   ```bash
   # Install gcloud CLI
   ```

2. **Build and Push Docker Image**
   ```bash
   cd backend
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cc-ems-backend
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy cc-ems-backend \
     --image gcr.io/YOUR_PROJECT_ID/cc-ems-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars MONGODB_URI=...,JWT_SECRET=...,CORS_ORIGIN=...
   ```

4. **Configure Custom Domain**
   - Go to Cloud Run → Manage Custom Domains
   - Map `api-dev.cc-ems.com` to your service

### Option 4: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean → Apps → Create App
   - Connect GitHub repository
   - Select `backend` directory

2. **Configure Build**
   - Build Command: `npm run build`
   - Run Command: `npm start`

3. **Set Environment Variables**
   - Add all required variables in App Settings

4. **Configure Domain**
   - Add custom domain: `api-dev.cc-ems.com`

## Post-Deployment Steps

### 1. Verify Health Endpoint

```bash
curl https://api-dev.cc-ems.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "EMS Call Centre API is running",
  "timestamp": "2024-01-03T12:00:00.000Z"
}
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

- **Railway**: View logs in Railway dashboard
- **Render**: View logs in Render dashboard
- **Cloud Run**: View logs in Google Cloud Console
- **DigitalOcean**: View logs in App Platform dashboard

## Troubleshooting

### Backend Not Starting
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check logs for specific error messages

### CORS Errors
- Verify `CORS_ORIGIN` includes your frontend domain
- Check backend logs for CORS rejection messages

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes deployment platform IPs
- Check MongoDB connection string format
- Verify database name: `Kweka_Call_Centre`

### Health Check Failing
- Ensure PORT environment variable matches exposed port
- Check if health endpoint is accessible: `/api/health`

## Security Checklist

- [ ] JWT_SECRET is strong (min 32 characters, random)
- [ ] MongoDB connection string uses authentication
- [ ] CORS_ORIGIN is restricted to known domains
- [ ] NODE_ENV is set to `production`
- [ ] HTTPS is enabled (most platforms do this automatically)
- [ ] Environment variables are stored securely (not in code)

## Next Steps

After successful deployment:
1. Update frontend `VITE_API_URL_DEV` to point to your deployed backend
2. Test login functionality
3. Monitor logs for any errors
4. Set up monitoring/alerting (optional)


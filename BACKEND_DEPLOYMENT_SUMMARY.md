# Backend Deployment - Setup Complete ✅

## What's Been Created

I've set up complete deployment configuration for your backend API. Here's what's ready:

### 📦 Deployment Files Created

1. **`backend/Dockerfile`** - Container configuration for deployment
2. **`backend/.dockerignore`** - Files to exclude from Docker build
3. **`backend/DEPLOYMENT.md`** - Comprehensive deployment guide
4. **`backend/QUICK_DEPLOY.md`** - Quick start guide (recommended)
5. **`backend/railway.json`** - Railway platform configuration
6. **`backend/render.yaml`** - Render platform configuration
7. **`backend/.github/workflows/deploy-backend.yml`** - GitHub Actions workflow (optional)

### 🎯 Next Steps

#### Option A: Railway (Fastest - Recommended)

1. **Go to Railway**: https://railway.app
2. **Sign up** with GitHub
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your repository** and set root directory to `backend`
5. **Add Environment Variables**:
   ```
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key-min-32-characters
   NODE_ENV=production
   CORS_ORIGIN=https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com
   ENABLE_CRON=true
   FFA_API_URL=http://localhost:4000/api
   ```
6. **Get Domain**: Railway provides a default domain, or add custom domain `api-dev.cc-ems.com`

#### Option B: Render

1. **Go to Render**: https://render.com
2. **Create Web Service** from GitHub repo
3. **Set root directory** to `backend`
4. **Set environment** to `Docker`
5. **Add same environment variables** as above
6. **Configure custom domain**: `api-dev.cc-ems.com`

### 📋 Required Information

Before deploying, you'll need:

1. **MongoDB Atlas Connection String**
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/Kweka_Call_Centre`
   - Database name: `Kweka_Call_Centre`
   - Make sure IP whitelist allows all IPs (`0.0.0.0/0`) for testing

2. **JWT Secret**
   - Generate a strong random string (minimum 32 characters)
   - Example: Use `openssl rand -base64 32` or any secure random generator

3. **Domain Configuration** (if using custom domain)
   - Domain: `api-dev.cc-ems.com`
   - Update DNS records as instructed by your deployment platform

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
- **Environment Variables**: See `backend/.env.example` (if created)

### 🆘 Troubleshooting

**Backend won't start?**
- Check all environment variables are set correctly
- Verify MongoDB connection string
- Check deployment platform logs

**CORS errors?**
- Verify `CORS_ORIGIN` includes: `https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com`
- Check backend logs for CORS rejection messages

**Database connection failed?**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Verify database name: `Kweka_Call_Centre`

---

## 🎉 Ready to Deploy!

All configuration files are ready. Choose your deployment platform and follow the steps above. Railway is recommended for the fastest setup.


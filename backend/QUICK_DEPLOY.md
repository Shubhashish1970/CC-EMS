# Quick Backend Deployment Guide

## 🚀 Fastest Option: Railway (Recommended)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Deploy
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your repository
3. **Important**: Set root directory to `backend`
4. Railway will auto-detect the Dockerfile

### Step 3: Set Environment Variables
Go to your project → Variables → Add:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
NODE_ENV=production
CORS_ORIGIN=https://cc-ems-dev.web.app,https://cc-ems-dev.firebaseapp.com
ENABLE_CRON=true
FFA_API_URL=http://localhost:4000/api
```

### Step 4: Get Domain
1. Go to Settings → Networking
2. Railway provides: `your-app.railway.app`
3. Or add custom domain: `api-dev.cc-ems.com`

### Step 5: Verify
```bash
curl https://your-domain.railway.app/api/health
```

---

## 🔧 Alternative: Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up

### Step 2: Create Web Service
1. New → Web Service
2. Connect GitHub repo
3. Settings:
   - **Name**: `cc-ems-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Build Command**: (auto-detected)
   - **Start Command**: (auto-detected)

### Step 3: Environment Variables
Add the same variables as Railway (see above)

### Step 4: Custom Domain
1. Settings → Custom Domains
2. Add: `api-dev.cc-ems.com`
3. Update DNS as instructed

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
- Check logs in deployment platform

**CORS errors?**
- Verify `CORS_ORIGIN` includes frontend domain
- Check backend logs for CORS rejections

**Database connection failed?**
- Check MongoDB Atlas IP whitelist (allow all IPs: `0.0.0.0/0` for testing)
- Verify connection string format
- Check database name: `Kweka_Call_Centre`

---

## 📝 Required Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | JWT secret (min 32 chars) |
| `CORS_ORIGIN` | ⚠️ | Frontend domains (comma-separated) |
| `NODE_ENV` | ⚠️ | Set to `production` |
| `ENABLE_CRON` | ⚠️ | Set to `true` for cron jobs |
| `FFA_API_URL` | ⚠️ | FFA API endpoint |
| `PORT` | ❌ | Auto-set by platform |
| `JWT_EXPIRES_IN` | ❌ | Default: `7d` |

---

## 🎯 Next Steps After Deployment

1. **Update Frontend API URL**
   - Update GitHub Secret: `VITE_API_URL_DEV`
   - Set to: `https://api-dev.cc-ems.com/api` (or your Railway domain)
   - Redeploy frontend

2. **Test Login**
   - Go to frontend: `https://cc-ems-dev.web.app`
   - Try logging in with test credentials

3. **Monitor Logs**
   - Check deployment platform logs
   - Look for any errors or warnings


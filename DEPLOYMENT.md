# Render Deployment Guide for Scout Organizer

This guide will help you deploy the Scout Organizer application to Render's free tier.

## Prerequisites

1. GitHub account with your code pushed
2. Render account (free tier)
3. MongoDB Atlas account (free tier)

## Step 1: Set up MongoDB Atlas

Since Render doesn't support MongoDB natively, you'll use MongoDB Atlas:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project
4. Build a free cluster (M0 free tier)
5. Create a database user:
   - Username: Choose a username
   - Password: Generate a strong password
6. Network Access:
   - Add IP address `0.0.0.0/0` (allows all IPs for free tier)
7. Get your connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

## Step 2: Prepare Your Code

1. Copy the render configuration:
   ```bash
   cp render.yaml.example render.yaml
   ```

2. Make sure your code is pushed to GitHub:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

## Step 3: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. Go to [render.com](https://render.com) and log in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and ask to use it
5. Click "Apply existing render.yaml"
6. Review and click "Create Web Service"

This will automatically create both services (API and Web).

### Option B: Manual Setup

If render.yaml doesn't work, create services manually:

**Backend Service:**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `scout-organizer-api`
   - Runtime: `Node`
   - Build Command: `pnpm install --frozen-lockfile && pnpm run build`
   - Start Command: `pnpm --filter @workspace/api-server run start`
   - Plan: Free
4. Add Environment Variables:
   - `PORT`: `5000`
   - `DATABASE_URL`: Your MongoDB Atlas connection string
   - `NODE_ENV`: `production`

**Frontend Service:**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `scout-organizer-web`
   - Runtime: `Node`
   - Build Command: `pnpm install --frozen-lockfile && pnpm --filter @workspace/scouts-web run build`
   - Start Command: `pnpm --filter @workspace/scouts-web run serve`
   - Plan: Free
4. Add Environment Variables:
   - `VITE_PORT`: `3000`
   - `VITE_API_URL`: Your API service URL (from step above)

## Step 4: Configure Environment Variables

After services are created, you need to set the final environment variables:

1. Go to your `scout-organizer-api` service in Render
2. Scroll to "Environment" section
3. Add `DATABASE_URL` with your MongoDB Atlas connection string
4. Save and redeploy the service

5. Go to your `scout-organizer-web` service in Render
6. Add `VITE_API_URL` with your API service URL:
   - Format: `https://scout-organizer-api.onrender.com`
7. Save and redeploy the service

## Step 5: Verify Deployment

1. Wait for both services to finish deploying (green status)
2. Access your frontend: `https://scout-organizer-web.onrender.com`
3. Test the API: `https://scout-organizer-api.onrender.com/api/health`

## Troubleshooting

**Build fails:**
- Check the build logs in Render dashboard
- Ensure `pnpm-lock.yaml` is committed to git
- Verify Node.js version compatibility

**Database connection fails:**
- Verify MongoDB Atlas connection string is correct
- Check network access allows all IPs (0.0.0.0/0)
- Ensure database user has proper permissions

**Frontend can't reach API:**
- Verify `VITE_API_URL` is set correctly
- Check that both services are running
- Ensure CORS is configured in the API

## Free Tier Limitations

Render Free Tier:
- 750 hours/month per service
- Spins down after 15 minutes of inactivity
- Cold start can take 1-2 minutes
- SSL certificates included

MongoDB Atlas Free Tier:
- 512 MB storage
- Shared RAM
- One replica set

## Next Steps

After successful deployment:
- Set up custom domains (optional)
- Configure monitoring and logging
- Set up automatic backups
- Consider upgrading to paid tier for production use
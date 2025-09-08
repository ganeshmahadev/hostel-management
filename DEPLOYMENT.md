# 🚀 Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier available)
- PostgreSQL database (Vercel Postgres, Supabase, or Railway)

## Step 1: Prepare Your Database

### Option A: Vercel Postgres (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new project or go to existing project
3. Go to "Storage" tab
4. Click "Create Database" → "Postgres"
5. Copy the connection string

### Option B: Supabase (Free tier available)
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy the connection string

### Option C: Railway
1. Go to [Railway](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Copy the connection string

## Step 2: Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

```
DATABASE_URL=postgresql://username:password@host:port/database
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
PRISMA_GENERATE_DATAPROXY=true
```

## Step 3: Deploy to Vercel

### Method 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: hostel-management
# - Directory: ./
# - Override settings? No
```

### Method 2: GitHub Integration
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import from GitHub
5. Select your repository
6. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

## Step 4: Database Setup

After deployment, run database migrations:

```bash
# In Vercel CLI or local terminal
vercel env pull .env.local
npx prisma migrate deploy
npx prisma generate
```

## Step 5: Update Clerk Settings

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Update your application settings:
   - Add your Vercel domain to allowed origins
   - Update redirect URLs to use your Vercel domain

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Test user registration/login
3. Test booking functionality
4. Test damage reporting

## Troubleshooting

### Common Issues:
1. **Database connection errors**: Check DATABASE_URL format
2. **Clerk authentication issues**: Verify environment variables
3. **Build failures**: Check for TypeScript errors
4. **API route errors**: Check function timeout settings

### Useful Commands:
```bash
# Check deployment logs
vercel logs

# Redeploy
vercel --prod

# Check environment variables
vercel env ls
```

## Production Checklist

- [ ] Database migrated and seeded
- [ ] Environment variables set
- [ ] Clerk configured for production domain
- [ ] All features tested
- [ ] Error monitoring set up (optional)
- [ ] Custom domain configured (optional)

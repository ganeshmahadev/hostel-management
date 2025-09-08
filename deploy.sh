#!/bin/bash

# 🚀 Hostel Management App Deployment Script

echo "🚀 Starting deployment process..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel:"
    vercel login
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Build the project
echo "🔨 Building project..."
pnpm build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📝 Don't forget to:"
echo "   1. Set up your database (Vercel Postgres, Supabase, or Railway)"
echo "   2. Configure environment variables in Vercel dashboard"
echo "   3. Run database migrations: npx prisma migrate deploy"
echo "   4. Update Clerk settings with your production domain"

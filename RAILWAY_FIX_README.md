# Railway Deployment Fix - AnythingLLM

This directory contains the comprehensive fix for the Railway deployment failure caused by the `yarn: command not found` error.

## Problem

The original Railway deployment failed with:
```
/bin/bash: line 1: yarn: command not found
Exit code: 127
```

This occurred because the original `railway.toml` used a complex build command that installed yarn globally but encountered PATH resolution issues in Railway's Nixpacks environment.

## Solutions

### Solution 1: Docker Builder (Recommended)

The main fix uses Docker instead of Nixpacks to properly handle the build process:

**Files:**
- `Dockerfile` - Railway-optimized Docker build
- `railway.toml` - Updated to use Docker builder
- `railway.json` - Railway-specific configuration
- `.env.railway.example` - Environment variables template

**Implementation:**
1. Railway will use the `Dockerfile` for building
2. Build steps are properly separated to avoid PATH issues
3. Uses Node.js 18 with proper yarn/corepack setup

### Solution 2: Fixed Nixpacks (Alternative)

If you prefer to stick with Nixpacks, use the alternative configuration:

**Files:**
- `railway-nixpacks.toml` - Fixed Nixpacks configuration

**Implementation:**
1. Replace `railway.toml` with contents of `railway-nixpacks.toml`
2. Uses npm instead of yarn to avoid PATH issues
3. Simpler build command that doesn't rely on global yarn installation

## Deployment Steps

### Using Docker Builder (Solution 1):
1. Keep the current `railway.toml` (already updated)
2. Make sure `Dockerfile` is in your root directory
3. Set environment variables in Railway dashboard (see `.env.railway.example`)
4. Deploy

### Using Fixed Nixpacks (Solution 2):
1. Replace contents of `railway.toml` with `railway-nixpacks.toml`
2. Set environment variables in Railway dashboard
3. Deploy

## Environment Variables

Set these in your Railway dashboard:

### Required:
- `NODE_ENV=production`
- `PORT=3001`
- `JWT_SECRET=your-secure-jwt-secret-here`
- `SIG_KEY=your-signature-key-here`  
- `SIG_SALT=your-signature-salt-here`

### Optional (depending on your setup):
- `LLM_PROVIDER=openai`
- `OPENAI_API_KEY=your-api-key`
- `VECTOR_DB=lancedb`
- `STORAGE_DIR=/app/server/storage`

### Database:
- If using Railway Postgres, `DATABASE_URL` will be set automatically

## Health Check

Both solutions include a health check at `/api/ping` that Railway will use to verify the deployment is successful.

## Troubleshooting

If deployment still fails:

1. **Check the build logs** for any remaining yarn/npm errors
2. **Verify environment variables** are set correctly
3. **Check health check endpoint** - make sure `/api/ping` responds with `{"online": true}`
4. **Try the alternative solution** if the first one doesn't work

## Key Changes Made

1. **Separated build steps** - No longer trying to install yarn and use it in a single command
2. **Proper PATH handling** - Docker ensures yarn is available throughout the build
3. **Alternative npm approach** - Provides fallback option using npm instead of yarn
4. **Proper Railway configuration** - Includes health checks and proper deployment settings

This fix resolves the core issue of yarn PATH resolution that was causing the `exit code: 127` error in Railway deployments.
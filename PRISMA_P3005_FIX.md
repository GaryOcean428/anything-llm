# Prisma P3005 Migration Fix

This document provides solutions for the Prisma P3005 error that can occur during Railway deployments.

## Problem Description

The error `P3005 - "The database schema is not empty. Read more about how to baseline an existing production database"` occurs when:

1. Your Railway PostgreSQL database already contains tables (from a previous deployment)
2. The `_prisma_migrations` table is missing or incomplete 
3. Prisma cannot apply migrations because it doesn't know which ones have already been applied

## Automatic Fix (Recommended)

The repository now includes an automatic fix via the `server/scripts/migrate-deploy.js` script that:

1. Attempts normal migration deployment first
2. If P3005 error is detected, automatically baselines existing migrations
3. Retries migration deployment after baselining
4. Provides detailed logging for troubleshooting

This script is automatically used in:
- Docker deployments (via `Dockerfile`)
- Nixpacks deployments (via `nixpacks.toml`)

## Manual Fix Options

If you need to manually resolve the P3005 error:

### Option 1: Baseline Existing Database (Preserves Data)

1. Connect to your Railway database via Railway CLI or directly
2. Run the migration baseline command:

```bash
cd server
npx prisma migrate resolve --applied "00000000000000_init"
```

3. Redeploy your application

### Option 2: Reset Database (Destroys Data)

⚠️ **WARNING: This will delete all existing data**

1. In Railway dashboard, go to your PostgreSQL service
2. Connect to database and run:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

3. Redeploy your application

## Troubleshooting

### Check Migration Status

```bash
cd server
npx prisma migrate status
```

### View Migration History

```bash
cd server
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma
```

### Manual Baseline Command

```bash
cd server
npx prisma migrate resolve --applied "<migration-name>"
```

To find the migration name, check `server/prisma/migrations/` directory.

## Environment Variables

Ensure these are set in Railway:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-set by Railway
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=4096
```

## Prevention

To prevent P3005 errors in future deployments:

1. Always use `npx prisma migrate deploy` (not `migrate dev`) in production
2. Ensure migrations are committed to git before deploying
3. Use the automatic migration script provided in this repository
4. Monitor deployment logs for migration issues

## Recent Updates

- Added automatic P3005 detection and resolution
- Enhanced error logging and troubleshooting guidance
- Updated Dockerfile and Nixpacks configurations
- Added comprehensive migration deployment script
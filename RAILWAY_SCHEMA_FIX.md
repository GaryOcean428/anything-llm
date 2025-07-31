# Railway Prisma Schema Migration Fix

## Problem Overview

The AnythingLLM application was failing on Railway deployment with errors like:
```
Invalid `prisma.workspaces.findFirst()` invocation:
The table `anythingllm.workspaces` does not exist in the current database.
```

## Root Cause

The application uses a multi-schema PostgreSQL setup where tables should be in the `anythingllm` schema, but Railway deployments were creating tables in the default `public` schema. This created a mismatch where:

1. Prisma schema expected tables in `anythingllm` schema
2. Database had tables in `public` schema
3. Application couldn't find the tables

## Solution Components

### 1. Enhanced Migration Scripts

**`server/scripts/migrate-deploy.js`:**
- Automatically adds `search_path=anythingllm,public` to DATABASE_URL
- Ensures `anythingllm` schema exists before migrations
- Verifies tables are accessible after migration
- Includes fallback logic with `db push` if migrations fail

**`server/scripts/db-migrate.js`:**
- Same DATABASE_URL enhancement
- Better error handling for schema issues
- Comprehensive table verification for production deployments

### 2. New Migration File

**`server/prisma/migrations/20250731215000_railway_schema_fix/migration.sql`:**
- Creates `anythingllm` schema if it doesn't exist
- Safely moves existing tables from `public` to `anythingllm` schema
- Creates essential tables (`workspaces`, `system_settings`, `event_logs`) if missing
- Handles both fresh deployments and existing databases

### 3. Railway Configuration Updates

**`railway.json`:**
- Updated to use enhanced migration script instead of direct `prisma migrate deploy`

**`startup-checks.js`:**
- Added DATABASE_URL search_path configuration
- Enhanced error detection for schema issues

## How It Works

1. **Deployment Start**: Railway begins deployment
2. **Database URL Enhancement**: Scripts automatically add search_path to DATABASE_URL
3. **Schema Creation**: Ensure `anythingllm` schema exists
4. **Migration Execution**: Run enhanced migration that handles both scenarios:
   - Fresh deployment: Creates tables in `anythingllm` schema
   - Existing deployment: Moves tables from `public` to `anythingllm` schema
5. **Verification**: Verify critical tables are accessible
6. **Fallback**: If migrations fail, use `db push` to synchronize schema
7. **Application Start**: Application can now find tables in correct schema

## Key Features

- **Idempotent**: Safe to run multiple times
- **Backward Compatible**: Works with existing deployments
- **Error Recovery**: Multiple fallback strategies
- **Comprehensive Logging**: Detailed output for debugging
- **Minimal Changes**: Surgical fixes without breaking existing functionality

## Error Detection

The scripts detect and handle specific errors:
- P3005 migration errors
- Schema isolation problems
- Missing table errors (workspaces, system_settings, event_logs)
- Failed migration baselines

## Testing

All changes have been tested with:
- Syntax validation
- Error detection logic
- Migration file structure
- Railway-specific error scenarios

## Maintenance

- Monitor Railway deployment logs for schema-related messages
- New migrations should continue using `@@schema("anythingllm")` directive
- DATABASE_URL search_path is automatically managed by the scripts
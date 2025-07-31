# AnythingLLM Prisma Multi-Schema Fix - Implementation Summary

## Problem Statement

AnythingLLM was experiencing "table public.workspaces does not exist" errors when deployed on Railway with a shared PostgreSQL database. The issue occurred because:

1. **Schema Mismatch**: Existing migrations created tables in the `public` schema
2. **Multi-Schema Configuration**: Prisma schema expected all tables in the `anythingllm` schema
3. **Missing Schema Isolation**: No proper schema creation and migration process

## Root Cause Analysis

The `server/prisma/migrations/20250720073934_init/migration.sql` file contained SQL statements without schema prefixes:

```sql
-- WRONG: Creates table in default (public) schema
CREATE TABLE "workspaces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    -- ...
);
```

But the `server/prisma/schema.prisma` expected tables in the `anythingllm` schema:

```prisma
model workspaces {
    // ...
    @@schema("anythingllm")  // Expected in anythingllm schema
}
```

This mismatch caused Prisma to look for `anythingllm.workspaces` while the table existed as `public.workspaces`.

## Solution Implemented

### 1. Schema-Aware Migration

Created `20250731054850_schema_aware_migration/migration.sql` that:

- Creates `anythingllm` schema if it doesn't exist
- Moves existing tables from `public` to `anythingllm` schema
- Handles both fresh deployments and existing databases
- Uses PostgreSQL `DO` blocks for conditional logic

### 2. Enhanced Migration Scripts

**Updated `db-migrate.js`**:
- Improved schema creation with search path configuration
- Added specific verification for workspaces table
- Better error handling and diagnostics

**New `schema-migrate.js`**:
- Dedicated script for migrating existing deployments
- Checks table locations and moves them if needed
- Comprehensive table verification

**New `test-schema-setup.js`**:
- Validates entire multi-schema configuration
- Checks all required components are in place
- Provides clear pass/fail status

### 3. Railway Configuration Updates

**Updated `railway.toml`**:
```toml
# Before
DATABASE_URL = "${{Postgres.DATABASE_URL}}"

# After
DATABASE_URL = "${{Postgres.DATABASE_URL}}?search_path=anythingllm,public"
```

The `search_path` parameter ensures Prisma looks in the `anythingllm` schema first.

### 4. Prisma Schema Optimization

**Removed deprecated feature**:
```prisma
# Before
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]  # Deprecated
}

# After
generator client {
  provider = "prisma-client-js"
}
```

Multi-schema support is now native in Prisma, so the preview feature is no longer needed.

### 5. Package.json Script Additions

Added new npm scripts for easier management:

```json
{
  "scripts": {
    "migrate:schema": "node scripts/schema-migrate.js",
    "test:schema": "node scripts/test-schema-setup.js"
  }
}
```

## Deployment Process

### For New Deployments

Railway automatically runs:
```bash
npm run start:migrate
```

Which executes:
1. `node scripts/db-migrate.js` - Creates schema and runs migrations
2. `cross-env NODE_ENV=production node index.js` - Starts the server

### For Existing Deployments

If you encounter the "table public.workspaces does not exist" error, run:

```bash
npm run migrate:schema
```

This will move all tables from `public` to `anythingllm` schema.

## Verification

To verify the fix is working, run:

```bash
npm run test:schema
```

Expected output:
```
[SCHEMA-TEST] Overall Status: ✅ PASS
[SCHEMA-TEST] 🎉 Multi-schema setup is correctly configured!
```

## Files Changed

1. **`server/prisma/schema.prisma`** - Removed deprecated multiSchema preview feature
2. **`server/scripts/db-migrate.js`** - Enhanced schema creation and verification
3. **`server/scripts/schema-migrate.js`** - New dedicated schema migration script
4. **`server/scripts/test-schema-setup.js`** - New configuration validation script
5. **`server/prisma/migrations/20250731054850_schema_aware_migration/migration.sql`** - New schema-aware migration
6. **`railway.toml`** - Added search_path to DATABASE_URL
7. **`server/package.json`** - Added new migration scripts
8. **`MULTI_SCHEMA_SETUP.md`** - Comprehensive documentation

## Testing Results

All tests pass:
- ✅ Prisma client generation successful
- ✅ Multi-schema configuration correct
- ✅ Workspaces model accessible
- ✅ All CRUD operations available
- ✅ Migration scripts functional
- ✅ Railway configuration valid

## Benefits

1. **Schema Isolation**: AnythingLLM tables are isolated from other services
2. **Backward Compatibility**: Existing databases are automatically migrated
3. **Error Prevention**: Prevents "table does not exist" errors
4. **Multi-Service Support**: Enables multiple services on same PostgreSQL instance
5. **Maintainability**: Clear separation of concerns and better documentation

## How This Fixes the Original Issue

The original error:
```
table public.workspaces does not exist
```

Is resolved because:

1. **Tables are moved** from `public` to `anythingllm` schema
2. **Prisma queries** `anythingllm.workspaces` (which now exists)
3. **Search path** ensures proper schema resolution
4. **Migration scripts** handle the transition automatically

The fix ensures that when users create a workspace through the UI, the `prisma.workspaces.create()` call will succeed because the `anythingllm.workspaces` table exists and is accessible.
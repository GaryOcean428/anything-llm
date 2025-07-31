# AnythingLLM Multi-Schema Database Setup for Railway

This document explains how AnythingLLM uses PostgreSQL schema isolation for multi-service deployments on Railway.

## Architecture Overview

AnythingLLM uses a **multi-schema architecture** to isolate its database tables from other services that might share the same PostgreSQL instance:

- **`anythingllm` schema**: Contains all AnythingLLM application tables
- **`public` schema**: Available for other Railway services or shared resources

## Key Components

### 1. Prisma Schema Configuration

The `server/prisma/schema.prisma` file is configured for multi-schema support:

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]  // Note: This is deprecated but still works
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "anythingllm"]  // Both schemas available
}

// All models use anythingllm schema
model workspaces {
  // ... model definition
  @@schema("anythingllm")
}
```

### 2. Migration Scripts

The migration system ensures proper schema isolation:

- **`scripts/db-migrate.js`**: Main migration script that creates the anythingllm schema
- **`scripts/schema-migrate.js`**: Specialized script to migrate existing deployments
- **Migration files**: Located in `prisma/migrations/` with schema-aware SQL

### 3. Railway Configuration

The `railway.toml` file configures the database connection with proper search path:

```toml
DATABASE_URL = "${{Postgres.DATABASE_URL}}?search_path=anythingllm,public"
```

The `search_path` parameter ensures Prisma looks in the `anythingllm` schema first.

## Deployment Process

1. **Fresh Deployment**: 
   - `npm run start:migrate` runs `scripts/db-migrate.js`
   - Creates `anythingllm` schema
   - Runs migrations to create tables in correct schema
   - Generates Prisma client with multi-schema support

2. **Existing Deployment Migration**:
   - Run `npm run migrate:schema` to move existing tables
   - Tables are moved from `public` to `anythingllm` schema
   - Prisma client is regenerated

## Troubleshooting

### "table public.workspaces does not exist" Error

This error occurs when:
1. Tables exist in `public` schema but Prisma expects them in `anythingllm` schema
2. Migration didn't run properly during deployment
3. DATABASE_URL doesn't include the search_path parameter

**Solutions**:

1. **For new deployments**: Ensure `npm run start:migrate` is used in Railway
2. **For existing deployments**: Run `npm run migrate:schema`
3. **Verify DATABASE_URL**: Must include `?search_path=anythingllm,public`

### Manual Migration Commands

```bash
# Generate Prisma client with multi-schema support
npx prisma generate

# Run schema migration script
node scripts/schema-migrate.js

# Deploy migrations
npx prisma migrate deploy

# Alternative: Push schema changes
npx prisma db push --skip-generate
```

### Verification

Check if tables are in the correct schema:

```sql
-- Check if anythingllm schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'anythingllm';

-- List tables in anythingllm schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'anythingllm';

-- Verify workspaces table location
SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'workspaces';
```

## Environment Variables

Required environment variables for Railway deployment:

```bash
DATABASE_URL=postgresql://user:pass@host:port/db?search_path=anythingllm,public
NODE_ENV=production
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1  # For concurrent deployments
```

## Benefits of Multi-Schema Architecture

1. **Isolation**: AnythingLLM tables don't conflict with other services
2. **Security**: Each service can have different access permissions
3. **Maintenance**: Easier to backup/restore specific application data
4. **Multi-tenancy**: Supports multiple services on same PostgreSQL instance

## Migration Script Details

The migration process handles both fresh deployments and existing databases:

1. **Schema Creation**: `CREATE SCHEMA IF NOT EXISTS anythingllm`
2. **Table Migration**: Moves existing tables from `public` to `anythingllm`
3. **Client Generation**: Updates Prisma client with multi-schema support
4. **Verification**: Tests table accessibility through Prisma

This architecture ensures reliable, isolated database operations for AnythingLLM on Railway's multi-service platform.
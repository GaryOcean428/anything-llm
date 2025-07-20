# Migration Recovery System for AnythingLLM

This document provides comprehensive guidance for resolving the failed `20250720073934_init` migration and preventing future migration issues.

## Quick Recovery

For immediate resolution of the failed migration issue:

```bash
cd server
npm run migrate:recovery:quick
```

This will attempt to mark the failed migration as applied and validate the recovery.

## Failed Migration Analysis

**Migration Failure Details:**
- **Failed Migration ID**: `20250720073934_init`
- **State**: Database contains failed migration record, blocking new migrations
- **Context**: Initial migration suggests database setup failure during first deployment

## Available Recovery Commands

### Automated Recovery Scripts

```bash
# Quick recovery (recommended first attempt)
npm run migrate:recovery:quick

# Full interactive recovery with options
npm run migrate:recovery

# Check migration status
npm run migrate:check

# Fix specific failed migration
npm run migrate:fix

# Safe deployment with pre-checks
npm run deploy:safe

# Health checks
npm run health:check
npm run health:startup
```

### Manual Recovery Commands

```bash
# Option A: Mark migration as applied (preserves data)
npx prisma migrate resolve --applied 20250720073934_init
npx prisma migrate status

# Option B: Rollback and retry (safe for development)
npx prisma migrate resolve --rolled-back 20250720073934_init
npx prisma migrate deploy

# Option C: Database baseline strategy
npx prisma db pull
npx prisma format
npx prisma migrate resolve --applied 20250720073934_init
npx prisma migrate deploy
```

## Recovery Strategy Phases

### Phase 1: Migration State Assessment
```bash
npx prisma migrate status
ls -la prisma/migrations/
```

### Phase 2: Failed Migration Investigation
```bash
cat prisma/migrations/20250720073934_init/migration.sql
npx prisma db pull --print
```

### Phase 3: Migration Resolution
Choose one of three options:
- **Option A**: Mark as Applied (recommended, preserves data)
- **Option B**: Rollback and Retry (safe for development)
- **Option C**: Database Baseline (comprehensive approach)

### Phase 4: Validation
```bash
npx prisma migrate status
npx prisma generate
npm run health:check
```

## Startup Health Checks

The system now includes comprehensive startup health checks:

```bash
node startup-checks.js
```

**Health Check Features:**
- ✅ Database connection verification
- ✅ Migration status assessment
- ✅ Database schema validation
- ✅ Helpful error diagnostics and remediation steps

### Integration with Application Startup

Add to your application startup sequence:

```javascript
const { performStartupChecks } = require('./startup-checks');

async function startApplication() {
  const healthChecksPassed = await performStartupChecks();
  
  if (!healthChecksPassed) {
    console.error('Application startup aborted due to failed health checks');
    process.exit(1);
  }
  
  // Continue with normal application startup
  startServer();
}
```

## Prevention Setup

### Automated Migration Health Check

The repository includes a pre-configured migration deployment script (`migrate-deploy.js`) that:

1. Attempts normal migration deployment
2. Detects P3005 and failed migration errors automatically
3. Applies baseline resolution strategies
4. Retries deployment after resolution
5. Provides detailed logging for troubleshooting

### Environment Variables

Ensure these are set in Railway:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-set by Railway
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=4096
```

### Migration Best Practices

1. **Always use** `npx prisma migrate deploy` (not `migrate dev`) in production
2. **Ensure migrations** are committed to git before deploying
3. **Use the automatic** migration script provided in this repository
4. **Monitor deployment** logs for migration issues
5. **Run health checks** before deploying

## Troubleshooting Guide

### Common Error Scenarios

#### P3005 Error
```
Error: P3005 - "The database schema is not empty. Read more about how to baseline an existing production database"
```

**Solution:**
```bash
npm run migrate:fix
npm run migrate:check
```

#### Failed Init Migration
```
Error: Migration 20250720073934_init failed
```

**Solution:**
```bash
npm run migrate:recovery:quick
```

#### Database Connection Issues
```
Error: Can't reach database server
```

**Solutions:**
1. Check DATABASE_URL is correctly set
2. Verify database server is running
3. Check network connectivity to database
4. Validate database credentials

#### Schema Conflicts
```
Error: Database schema conflicts detected
```

**Solution:**
```bash
npm run migrate:recovery  # Choose Option C: Database Baseline
```

### Advanced Recovery Procedures

#### If Database is Empty/Corrupted
```bash
npx prisma migrate reset --force
npx prisma migrate deploy
```

#### If Database Has Production Data
```bash
# Backup first
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Use shadow database for testing
npm run migrate:recovery  # Choose comprehensive option
```

## Migration Health Monitoring

### Continuous Monitoring Setup

Add to your deployment pipeline:

```bash
# Pre-deployment health check
npm run health:check || exit 1

# Deploy with automatic recovery
npm run deploy:safe

# Post-deployment validation
npm run health:check
```

### Logging and Alerting

The migration scripts provide structured logging that can be integrated with monitoring systems:

```bash
[MIGRATION] ✅ Migration deployment successful!
[MIGRATION] ❌ Migration deployment failed: <error>
[MIGRATION] 🔧 P3005 Error detected - attempting baseline
[STARTUP] ✅ Database connection healthy
[STARTUP] ❌ Database connection failed: <error>
```

## Files Added/Modified

### New Files
- `server/startup-checks.js` - Comprehensive startup health checks
- `server/scripts/migration-recovery.js` - Automated recovery workflow
- `server/prisma/migrations/20250720073934_init/migration.sql` - Initial migration file

### Enhanced Files
- `server/scripts/migrate-deploy.js` - Enhanced with failed migration detection
- `server/package.json` - Added new migration and health check commands

## Support

If the automated recovery fails:

1. **Check logs** for specific error messages
2. **Run health checks** to identify the exact issue
3. **Use manual commands** for step-by-step recovery
4. **Backup database** before attempting destructive operations
5. **Contact support** with migration status output and error logs

For immediate assistance:
```bash
npm run migrate:recovery --help
npm run health:check
```
# Railway Multi-Service Deployment - Enhanced Guide

This enhanced guide covers deploying AnythingLLM on Railway with the new multi-service database architecture that prevents P3005 errors.

## What's New

### Multi-Schema Architecture
- **Schema Isolation**: AnythingLLM tables isolated in `anythingllm` schema
- **P3005 Resolution**: Automatic handling of shared database conflicts  
- **Service Coexistence**: Multiple services can share PostgreSQL safely

### Enhanced Migration System
- **Smart Detection**: Recognizes shared database environments
- **Graceful Fallbacks**: Production-safe error handling
- **Conditional Seeding**: Non-blocking database initialization

## Quick Deployment

1. **Setup Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and create project
   railway login
   railway init
   ```

2. **Add PostgreSQL Service**
   ```bash
   railway add postgresql
   ```

3. **Deploy AnythingLLM**
   ```bash
   # Set required environment variables
   railway variables set JWT_SECRET=$(openssl rand -hex 32)
   railway variables set SIG_KEY=$(openssl rand -hex 32)
   railway variables set SIG_SALT=$(openssl rand -hex 16)
   railway variables set ENCRYPTION_KEY=$(openssl rand -hex 32)
   railway variables set OPENAI_API_KEY=your_api_key_here
   
   # Deploy
   railway up
   ```

## Environment Variables

The `railway.toml` automatically configures most variables. You only need to set:

### Required
- `JWT_SECRET` - JWT signing secret (32+ characters)
- `SIG_KEY` - Signature key (32+ characters)
- `SIG_SALT` - Signature salt (16+ characters)
- `ENCRYPTION_KEY` - Data encryption key (32+ characters)

### LLM Provider (choose one)
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GEMINI_API_KEY` - Google Gemini API key

### Optional
- `REDIS_URL` - Caching (recommended for production)
- `SKIP_SEED` - Set to "true" to skip initial seeding

## Validation & Monitoring

After deployment, validate your setup:

```bash
# Validate deployment
railway run npm run deploy:validate

# Monitor logs
railway logs --follow

# Check health
curl https://your-app.railway.app/api/ping
```

## Database Schema Organization

```
Railway PostgreSQL Instance
├── public schema
│   ├── other_service_tables (preserved)
│   └── legacy_tables (preserved)
└── anythingllm schema (isolated)
    ├── system_settings
    ├── workspaces
    ├── users
    ├── workspace_documents
    └── all_anythingllm_tables
```

## Troubleshooting

### P3005 Errors (Now Resolved)
The multi-schema architecture automatically resolves P3005 "database schema is not empty" errors by isolating AnythingLLM tables.

### Migration Issues
```bash
# Check migration status
railway run npx prisma migrate status

# Manual schema verification
railway run node scripts/railway-deployment-validator.js

# View detailed logs
railway logs --filter="DB-MIGRATE"
```

### Seeding Problems
Seeding is now non-blocking in production. If seeds fail, the application continues to start.

## Advanced Features

### Manual Database Setup
```bash
# Setup isolated schema
chmod +x scripts/railway-db-setup.sh
railway run ./scripts/railway-db-setup.sh anythingllm
```

### Development Mode
For development with full error reporting:
```bash
railway variables set NODE_ENV=development
railway variables set SKIP_SEED=false
```

### Production Optimization
```bash
railway variables set NODE_ENV=production
railway variables set SKIP_SEED=true
railway variables set PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1
```

## Migration from Previous Versions

If upgrading from an earlier version:

1. **Backup recommended** (Railway backups available)
2. **Deploy new version** - automatic schema migration
3. **Validate deployment** using included scripts
4. **Test functionality** in staging environment

The migration preserves existing data while adding isolation.

## Configuration Files

### railway.toml
Enhanced with:
- Extended health check timeouts (300s)
- Multi-service environment variables
- Advisory lock configuration
- Retry policies

### Prisma Schema
Updated with:
- `multiSchema` preview feature
- `@@schema("anythingllm")` directives on all models
- PostgreSQL-specific optimizations

### Migration Scripts
- `db-migrate.js` - Schema-aware migration handling
- `railway-db-setup.sh` - Manual schema setup utility
- `railway-deployment-validator.js` - Post-deployment validation

## Support & Documentation

- [Multi-Service Database Architecture](docs/MULTI_SERVICE_DATABASE.md)
- [Original Railway Guide](RAILWAY_DEPLOYMENT_GUIDE.md)
- Railway logs: `railway logs`
- Health endpoint: `/api/ping`

For schema-specific issues, run the validation script and check logs for detailed error information.
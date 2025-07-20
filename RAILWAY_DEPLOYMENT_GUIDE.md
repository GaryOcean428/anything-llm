# Railway Deployment Guide - AnythingLLM with PostgreSQL

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your AnythingLLM code should be in a GitHub repository

## Step 1: Create PostgreSQL Database Service

1. In Railway dashboard, click **"New Project"**
2. Select **"Add Service"** → **"Database"** → **"PostgreSQL"**
3. Note the service name (usually "Postgres")

## Step 2: Deploy AnythingLLM Service

1. Click **"Add Service"** → **"GitHub Repo"**
2. Connect your GitHub repository
3. Railway will automatically detect the `railway.toml` configuration

## Step 3: Set Environment Variables

In the Railway dashboard, go to your AnythingLLM service → **Variables** tab and set:

### Required Variables

```bash
# Security Variables (generate secure random strings)
JWT_SECRET=your-secure-jwt-secret-here-32-chars-min
SIG_KEY=your-signature-key-here-32-chars-min
SIG_SALT=your-signature-salt-here-32-chars-min
ENCRYPTION_KEY=your-encryption-key-here-16-chars-min
```

### Database Configuration

The `DATABASE_URL` is automatically configured in `railway.toml` as:

```toml
DATABASE_URL = "${{Postgres.DATABASE_URL}}"
```

This resolves to the private connection string:

```
postgresql://railway:PASSWORD@postgres.railway.internal:5432/railway
```

## Step 4: Generate Secure Environment Variables

Run these commands locally to generate secure values:

```bash
# JWT_SECRET (32+ characters)
openssl rand -hex 32

# SIG_KEY (32+ characters)  
openssl rand -hex 32

# SIG_SALT (16+ characters)
openssl rand -hex 16

# ENCRYPTION_KEY (16+ characters)
openssl rand -hex 16
```

## Step 5: Deploy and Verify

1. **Deploy**: Railway will automatically build and deploy using the Dockerfile
2. **Monitor Logs**: Check the deployment logs for:

   ```
   [DB-MIGRATE] ✅ Database migration completed successfully!
   [STARTUP] Server listening on port 3001
   ```

3. **Health Check**: Visit your Railway public URL + `/api/ping` - should return 200 OK

## Step 6: Test Key Endpoints

After successful deployment, test these endpoints:

- **Health**: `https://your-app.up.railway.app/api/ping`
- **Logo**: `https://your-app.up.railway.app/api/system/logo`
- **Request Token**: `https://your-app.up.railway.app/api/request-token` (POST)

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. **Check DATABASE_URL**: Ensure it references `${{Postgres.DATABASE_URL}}`
2. **Service Names**: Verify the PostgreSQL service name in Railway dashboard
3. **Network**: Both services should be in the same Railway project

### Migration Failures

If migrations fail:

1. **Check Logs**: Look for specific Prisma error messages
2. **Reset Database**: In extreme cases, delete and recreate the PostgreSQL service
3. **Manual Migration**: Use Railway's database shell to run SQL manually

### Environment Variables

Common issues:

- Missing JWT_SECRET, SIG_KEY, SIG_SALT, or ENCRYPTION_KEY
- Using development values in production
- Incorrect DATABASE_URL format

## Production Checklist

- [ ] PostgreSQL service created and running
- [ ] All environment variables set with secure values
- [ ] DATABASE_URL references PostgreSQL service correctly
- [ ] Deployment logs show successful migration
- [ ] `/api/ping` returns 200 OK
- [ ] Frontend loads without logo fetch errors
- [ ] Authentication endpoints return proper responses

## Railway Configuration Files

The key files for Railway deployment:

- **`railway.toml`**: Deployment configuration with environment variables
- **`Dockerfile`**: Container build instructions with migration step
- **`server/scripts/db-migrate.js`**: Database initialization and migration script
- **`server/prisma/schema.prisma`**: Database schema (PostgreSQL)

## Security Notes

- Never commit real environment variables to Git
- Use Railway's Variables tab for all sensitive configuration
- Ensure DATABASE_URL uses the private internal network (`postgres.railway.internal`)
- Rotate JWT secrets periodically in production

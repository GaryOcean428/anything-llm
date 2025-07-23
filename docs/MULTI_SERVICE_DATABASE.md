# Multi-Service Database Architecture

## Overview

AnythingLLM now supports deployment in multi-service environments (such as Railway) where PostgreSQL databases are shared across multiple services. This architecture prevents P3005 "database schema is not empty" errors by implementing schema isolation.

## Architecture Details

### Schema Organization
- **`public` schema**: Contains tables from other Railway services
- **`anythingllm` schema**: Contains all AnythingLLM-specific tables

### Core Tables in `anythingllm` Schema
- `system_settings` - Application configuration
- `workspaces` - User workspaces and settings
- `workspace_documents` - Document management
- `document_vectors` - Vector storage references
- `users` - User accounts and authentication
- `workspace_chats` - Chat history and sessions
- All related tables with proper foreign key relationships

## Migration Strategy

### Phase 1: Schema Creation
1. Prisma client updated with `multiSchema` preview feature
2. All models updated with `@@schema("anythingllm")` directives
3. Database migration script enhanced for shared environments

### Phase 2: Deployment Process
1. **Schema Creation**: `CREATE SCHEMA IF NOT EXISTS anythingllm;`
2. **Migration Deployment**: Uses `prisma migrate deploy` or `prisma db push`
3. **Conditional Seeding**: Production-safe seeding with error handling
4. **Health Verification**: Post-deployment table access verification

### Phase 3: Production Safety
- Graceful error handling for migration failures
- Non-blocking seeding in production environments
- Enhanced health check timeouts for Railway deployments
- Advisory lock configuration for concurrent deployments

## Benefits

1. **Service Isolation**: No conflicts with other services' database tables
2. **Clean Deployment**: Resolves P3005 errors in shared database environments
3. **Production Ready**: Handles migration failures gracefully
4. **Backward Compatible**: Maintains existing functionality while adding isolation

## Railway Configuration

The `railway.toml` has been updated with:
- Extended health check timeouts (300s)
- Advisory lock configuration
- Environment-specific seeding control
- Enhanced restart policies for migration retries

## Development vs Production

### Development
- Full migration and seeding process
- Error reporting and debugging information
- SQLite support for local development (legacy)

### Production
- Schema-aware migrations with fallback strategies
- Conditional seeding to prevent deployment failures
- Graceful error handling for shared database scenarios
- Enhanced monitoring and logging

## Troubleshooting

### P3005 Error Resolution
If you encounter "database schema is not empty" errors:
1. The new migration script creates an isolated `anythingllm` schema
2. Existing tables in `public` schema are preserved
3. AnythingLLM operates independently within its dedicated schema

### Migration Failures
- Production deployments continue even if migration fails
- Manual schema verification available through health checks
- Rollback strategies maintain service availability

## Future Considerations

1. **Schema Versioning**: Track schema evolution independently
2. **Cross-Service Communication**: Potential for service integration
3. **Data Migration**: Tools for moving between schema configurations
4. **Monitoring**: Enhanced observability for multi-service environments
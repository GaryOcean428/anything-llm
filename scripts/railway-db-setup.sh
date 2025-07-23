#!/bin/bash

# Railway Multi-Service Database Setup Script
# This script helps onboard new services to shared PostgreSQL instances

set -e

SERVICE_NAME=${1:-"anythingllm"}
DATABASE_URL=${DATABASE_URL:-}

echo "🚀 Railway Multi-Service Database Setup"
echo "Service: $SERVICE_NAME"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo "Please set DATABASE_URL to your Railway PostgreSQL connection string"
    exit 1
fi

echo "📡 Connecting to PostgreSQL database..."

# Function to execute SQL commands
execute_sql() {
    local sql="$1"
    echo "Executing: $sql"
    psql "$DATABASE_URL" -c "$sql"
}

# Check database connection
echo "🔍 Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Unable to connect to database. Please check your DATABASE_URL."
    exit 1
fi

echo "✅ Database connection successful"

# Create service-specific schema
echo "🏗️  Creating schema for service: $SERVICE_NAME"
execute_sql "CREATE SCHEMA IF NOT EXISTS $SERVICE_NAME;"
execute_sql "GRANT ALL PRIVILEGES ON SCHEMA $SERVICE_NAME TO current_user;"

echo "✅ Schema '$SERVICE_NAME' created successfully"

# List all schemas for verification
echo "📋 Current database schemas:"
psql "$DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1') ORDER BY schema_name;"

# Display table count per schema
echo "📊 Table distribution by schema:"
psql "$DATABASE_URL" -c "
SELECT 
  schemaname,
  COUNT(*) as table_count,
  pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as total_size
FROM pg_tables 
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
GROUP BY schemaname
ORDER BY schemaname;
"

echo ""
echo "🎉 Multi-service database setup completed!"
echo ""
echo "Next steps:"
echo "1. Update your Prisma schema with: @@schema(\"$SERVICE_NAME\")"
echo "2. Add 'schemas = [\"public\", \"$SERVICE_NAME\"]' to your datasource"
echo "3. Enable multiSchema preview feature in your generator"
echo "4. Run 'npx prisma generate' to update your client"
echo "5. Deploy with your updated schema configuration"
echo ""
echo "Example Prisma configuration:"
echo "generator client {"
echo "  provider = \"prisma-client-js\""
echo "  previewFeatures = [\"multiSchema\"]"
echo "}"
echo ""
echo "datasource db {"
echo "  provider = \"postgresql\""
echo "  url      = env(\"DATABASE_URL\")"
echo "  schemas  = [\"public\", \"$SERVICE_NAME\"]"
echo "}"
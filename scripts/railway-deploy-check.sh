#!/bin/bash

# Railway Deployment Verification Script
# This script checks all the critical configuration before deployment

echo "🚂 Railway AnythingLLM Deployment Checklist"
echo "============================================"

# Step 1: Check if we're in the right directory
if [ ! -f "railway.toml" ]; then
    echo "❌ railway.toml not found. Please run this from the project root."
    exit 1
fi

echo "✅ Found railway.toml"

# Step 2: Check port configuration in server/index.js
if grep -q "process.env.PORT.*process.env.SERVER_PORT.*3001" server/index.js; then
    echo "✅ Port configuration correct in server/index.js"
else
    echo "❌ Port configuration issue in server/index.js"
fi

# Step 3: Check Dockerfile for Railway compatibility
if grep -q "ARG PORT" Dockerfile && grep -q "EXPOSE \${PORT}" Dockerfile; then
    echo "✅ Dockerfile configured for dynamic Railway port"
else
    echo "❌ Dockerfile needs ARG PORT and EXPOSE \${PORT}"
fi

# Step 4: Check CORS configuration
if grep -q "credentials: true" server/index.js; then
    echo "✅ CORS configured with credentials"
else
    echo "❌ CORS needs credentials: true for production"
fi

# Step 5: Check server binding
if grep -q "0.0.0.0" server/utils/boot/index.js; then
    echo "✅ Server binds to 0.0.0.0 (Railway compatible)"
else
    echo "❌ Server must bind to 0.0.0.0 for Railway"
fi

# Step 6: Check environment variables in railway.toml
required_vars=("JWT_SECRET" "SIG_KEY" "SIG_SALT" "ENCRYPTION_KEY")
for var in "${required_vars[@]}"; do
    if grep -q "$var" railway.toml; then
        echo "✅ $var configured in railway.toml"
    else
        echo "❌ Missing $var in railway.toml"
    fi
done

# Step 7: Check healthcheck endpoint
if grep -q "healthcheckPath.*api/ping" railway.toml; then
    echo "✅ Health check configured"
else
    echo "❌ Health check path should be /api/ping"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Set Railway environment variables:"
echo "   railway variables set JWT_SECRET=<your-secret>"
echo "   railway variables set SIG_KEY=<your-key>"
echo "   railway variables set SIG_SALT=<your-salt>"
echo "   railway variables set ENCRYPTION_KEY=<your-key>"
echo ""
echo "2. Deploy with: railway up"
echo ""
echo "3. Check logs with: railway logs"
echo ""
echo "4. Test health endpoint: curl https://your-app.up.railway.app/api/ping"

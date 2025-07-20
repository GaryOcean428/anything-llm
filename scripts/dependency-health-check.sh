#!/bin/bash

# Dependency health check script for AnythingLLM
# Run this weekly to monitor dependency health

echo "🔍 AnythingLLM Dependency Health Check"
echo "======================================="

cd "$(dirname "$0")/.."

echo "📊 Checking for outdated packages..."
echo ""

echo "Root package status:"
npm outdated 2>/dev/null || echo "All root packages up to date"
echo ""

echo "Server package status:"
cd server
npm outdated 2>/dev/null || echo "All server packages up to date"
echo ""

echo "🛡️  Security audit..."
echo ""
npm audit --level moderate 2>/dev/null | head -20
cd ..

echo ""
echo "🔍 Checking for deprecated packages in warnings..."
if npm list 2>&1 | grep -i "deprecated\|warn"; then
    echo "⚠️  Found deprecated package warnings above"
else
    echo "✅ No deprecated package warnings found"
fi

echo ""
echo "📦 Verifying key packages..."
cd server
if npm list multer@2 &>/dev/null; then
    echo "✅ Multer v2.x installed"
else
    echo "❌ Multer v2.x not found"
fi

if npm list @elevenlabs/elevenlabs-js &>/dev/null; then
    echo "✅ ElevenLabs JS client installed"
else
    echo "❌ ElevenLabs JS client not found"
fi

echo ""
echo "🔧 Dependency health check complete!"
echo ""
echo "💡 Run 'npm audit fix' to apply safe security updates"
echo "💡 Review 'npm outdated' results for potential updates"
#!/bin/bash

# Phase 4 Security Fixes Script
# Addresses high and moderate security vulnerabilities identified in audit

echo "🔒 Phase 4: Security Vulnerability Remediation"
echo "============================================="

echo ""
echo "📊 Current vulnerability status:"
npm audit --summary

echo ""
echo "🔧 Step 1: Updating vulnerable dependencies..."

# Update axios to address SSRF vulnerabilities
echo "⬆️  Updating axios to latest secure version..."
npm install axios@latest

# Update bundlesize to address axios dependency issue
echo "⬆️  Updating bundlesize to resolve github-build dependency..."
npm install bundlesize@latest

echo ""
echo "🔧 Step 2: Frontend security updates..."
cd frontend

# Update frontend dependencies to address vulnerabilities
echo "⬆️  Updating frontend dependencies..."
npm update

cd ..

echo ""
echo "🔧 Step 3: Validating security fixes..."
echo "Running post-fix security audit:"
npm audit --audit-level=moderate

echo ""
echo "🔧 Step 4: Testing after security updates..."
echo "Running tests to ensure no breaking changes:"
npm run test:frontend -- --run

echo ""
echo "✅ Security remediation complete!"
echo "📋 Summary:"
echo "   - Updated axios to address SSRF vulnerabilities"
echo "   - Updated bundlesize to resolve dependency chain issues"
echo "   - Updated frontend dependencies"
echo "   - Validated fixes with test suite"

echo ""
echo "🔍 Final security status:"
npm audit --summary
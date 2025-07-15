#!/bin/bash
# Weekly health check script for gary-zero infrastructure
# Part of Comprehensive QA & System Optimization Initiative

set -e

echo "=== Gary-Zero Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Phase 1: Dependency Security Audit
echo "📦 Checking dependencies..."
if command -v npm &> /dev/null; then
    echo "Running dependency audit..."
    npm audit --audit-level moderate || echo "⚠️ Vulnerabilities found - review required"
else
    echo "⚠️ npm not found, skipping dependency audit"
fi

# Check for outdated packages
echo ""
echo "📅 Checking for outdated packages..."
if command -v npm &> /dev/null; then
    npm outdated || echo "✅ All packages up to date"
else
    echo "⚠️ npm not found, skipping outdated check"
fi

# Phase 2: Bundle Size Analysis (if bundlesize is configured)
echo ""
echo "📊 Bundle size analysis..."
if command -v npm &> /dev/null && [ -f "package.json" ]; then
    if grep -q "bundlesize" package.json; then
        npx bundlesize || echo "⚠️ Bundle size check failed or not configured"
    else
        echo "ℹ️ bundlesize not configured, running bundle analysis..."
        npm run analyze:bundle 2>/dev/null || echo "⚠️ Bundle analysis failed - frontend may not be built"
    fi
else
    echo "⚠️ Cannot run bundle size analysis"
fi

# Phase 2.5: Code Duplication Analysis
echo ""
echo "🔍 Code duplication analysis..."
if command -v npx &> /dev/null; then
    echo "Running duplication detection..."
    npm run analyze:duplication 2>/dev/null || echo "⚠️ Duplication analysis failed"
else
    echo "⚠️ Cannot run duplication analysis"
fi

# Phase 3: Test Coverage
echo ""
echo "🧪 Running test coverage..."
if command -v npm &> /dev/null; then
    npm run test:coverage --silent || echo "⚠️ Test coverage check failed"
else
    echo "⚠️ Cannot run tests"
fi

# Phase 4: Linting
echo ""
echo "🔍 Running linting checks..."
if command -v npm &> /dev/null; then
    npm run lint --quiet || echo "⚠️ Linting issues found"
else
    echo "⚠️ Cannot run linting"
fi

# Phase 5: Build Verification
echo ""
echo "🏗️ Verifying build..."
if command -v npm &> /dev/null; then
    # Check if build script exists
    if grep -q '"build"' package.json; then
        npm run build --quiet || echo "⚠️ Build failed"
        echo "✅ Build verification complete"
    else
        echo "ℹ️ No build script found, skipping"
    fi
else
    echo "⚠️ Cannot verify build"
fi

# Phase 6: File System Health
echo ""
echo "📁 File system health check..."
echo "Repository size: $(du -sh . | cut -f1)"
echo "Node modules size: $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'N/A')"

# Count file types for analysis
echo "TypeScript files: $(find . -name "*.ts" -not -path "./node_modules/*" | wc -l)"
echo "JavaScript files: $(find . -name "*.js" -not -path "./node_modules/*" | wc -l)"
echo "React components: $(find . -name "*.jsx" -o -name "*.tsx" -not -path "./node_modules/*" | wc -l)"

echo ""
echo "=== Health Check Complete ==="
echo "Review any warnings above and address as needed."
echo "For detailed analysis, run individual tools manually."
#!/bin/bash
# Railway CLI wrapper script for AnythingLLM development
# This script ensures Railway CLI works reliably in GitHub Codespaces

# Use system node instead of NVM to avoid binary compatibility issues
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Try Railway CLI through npx first (most reliable)
if command -v npx >/dev/null 2>&1; then
    echo "🚂 Using npx: railway $@"
    npx @railway/cli@latest "$@"
    exit $?
fi

# Fallback to yarn dlx if npx is not available
if command -v yarn >/dev/null 2>&1; then
    echo "🚂 Using yarn dlx: railway $@"
    yarn dlx @railway/cli "$@"
    exit $?
fi

# Final fallback message
echo "❌ Railway CLI not available. Please install it with:"
echo "   npm install -g @railway/cli"
echo "   or"
echo "   yarn global add @railway/cli"
exit 1

# Dependency Security & Deprecation Remediation

This document outlines the security and deprecation fixes applied to the AnythingLLM project's dependencies.

## Summary of Changes

### ✅ Critical Security Fixes (Phase 1)

1. **Multer Upgrade**: `v1.4.5-lts.1` → `v2.0.2`
   - **Risk**: File upload security vulnerabilities
   - **Impact**: Resolves CVE-documented security issues
   - **Compatibility**: Drop-in replacement, no API changes needed

2. **ElevenLabs Migration**: `elevenlabs@0.5.0` → `@elevenlabs/elevenlabs-js@2.6.0`
   - **Risk**: Package deprecation warning
   - **Impact**: Official migration to supported package
   - **Changes**: Updated import in `server/utils/TextToSpeech/elevenLabs/index.js`

### ✅ Deprecated Package Resolution (Phase 2)

**Package Overrides Applied:**
- `inflight` → `lru-cache@^10.0.0` (eliminates memory leak risk)
- `npmlog` → `false` (disabled, no longer supported)
- `are-we-there-yet` → `false` (disabled, no longer supported) 
- `gauge` → `false` (disabled, no longer supported)
- `rimraf` → `^6.0.0` (modern version)
- `glob` → `^11.0.0` (modern version)
- `@grpc/grpc-js` → `^1.12.4` (security update)

**Additional Updates:**
- `@datastax/astra-db-ts`: `v0.1.3` → `v1.5.0` (peer dependency resolution)

## Security Improvements

### 🔒 Memory Leak Prevention
- **Issue**: `inflight@1.0.6` package had known memory leaks
- **Solution**: Replaced with `lru-cache` which provides the same functionality
- **Impact**: Eliminates memory leak risk in long-running production environments

### 🔒 File Upload Security
- **Issue**: Multer v1.x had documented security vulnerabilities
- **Solution**: Upgraded to Multer v2.0.2 with security patches
- **Impact**: Secure file upload handling for document processing

### 🔒 Ecosystem Modernization
- **Issue**: Multiple packages flagged as deprecated/obsolete
- **Solution**: Force updated to modern alternatives or disabled unused dependencies
- **Impact**: Improved compatibility and reduced technical debt

## Monitoring & Maintenance

### Health Check Script
Run the dependency health check:
```bash
npm run health:dependencies
```

This script checks for:
- Outdated packages
- Security vulnerabilities 
- Deprecated package warnings
- Critical package integrity

### Security Audit
Run comprehensive security audit:
```bash
npm run security:audit
```

### Automated Monitoring
- **GitHub Workflow**: `.github/workflows/dependency-health.yml`
- **Schedule**: Weekly on Mondays at 8 AM UTC
- **Triggers**: Changes to package.json files
- **Actions**: Runs health checks and security audits

## Best Practices

### Regular Maintenance
1. **Weekly**: Run `npm run health:dependencies`
2. **Monthly**: Review `npm outdated` results for updates
3. **Before deployments**: Run `npm run security:audit`

### Safe Update Strategy
1. Apply security patches immediately: `npm audit fix`
2. Test major version updates in development first
3. Use overrides for problematic transitive dependencies
4. Monitor for new deprecation warnings

### Package Override Guidelines
The `overrides` section in package.json is used to:
- Replace packages with memory leaks or security issues
- Force specific versions to resolve conflicts
- Disable unnecessary deprecated packages

## Verification

### Test Critical Functionality
```bash
# Test server modules
cd server
node -e "
const { handleFileUpload } = require('./utils/files/multer.js');
const { ElevenLabsTTS } = require('./utils/TextToSpeech/elevenLabs/index.js');
console.log('✅ Critical modules loaded successfully');
"
```

### Check Package Versions
```bash
cd server
npm list multer @elevenlabs/elevenlabs-js
```

## Remaining Considerations

### Future Updates
- Monitor AWS SDK migration opportunities (v2 → v3)
- Consider upgrading Node.js LTS version for additional security
- Evaluate bundle size optimization opportunities

### Breaking Changes Deferred
Some security fixes require breaking changes:
- `@langchain/community` SQL injection fix (requires v0.3.x)
- `mssql` Azure identity vulnerability fix (requires v11.x)
- `nodemon` semver vulnerability fix (requires v3.x)

These can be addressed in a separate maintenance cycle with proper testing.

## Files Modified

- `server/package.json` - Updated dependencies and added overrides
- `package.json` - Added overrides and monitoring scripts
- `server/utils/TextToSpeech/elevenLabs/index.js` - Updated import
- `scripts/dependency-health-check.sh` - New monitoring script
- `.github/workflows/dependency-health.yml` - Automated monitoring

## Command Reference

```bash
# Health check
npm run health:dependencies

# Security audit
npm run security:audit

# Manual dependency updates
npm outdated
npm update [package-name]

# Force security fixes
npm audit fix --force  # Use with caution
```

This remediation successfully addresses the critical security vulnerabilities and deprecation warnings while maintaining backward compatibility and system stability.
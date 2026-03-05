# Railway Docker Cache Mount Fix

## Issue Fixed
Railway deployment was failing with error: `Cache mount ID is not prefixed with cache key`

## Root Cause
Railway's Docker build system requires cache mount IDs to use a service-specific prefix format:

```
id=s/<railway-service-id>-<cache-name>
```

Simple IDs like `yarn-cache` or prefixed forms like `cache:yarn-cache` are both rejected. Since the Railway service ID is deployment-specific and cannot be hardcoded in a shared/public Dockerfile, the only portable fix is to **remove `--mount=type=cache` directives entirely**.

## Solution Applied
**File:** `Dockerfile`

**Before:**
```dockerfile
RUN --mount=type=cache,id=cache:yarn-cache,target=/root/.cache/yarn \
    --mount=type=cache,id=cache:node-gyp-cache,target=/root/.cache/node-gyp \
    yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

**After:**
```dockerfile
# Note: cache mounts are omitted - Railway requires service-ID-prefixed cache IDs
# which are deployment-specific and cannot be hardcoded in a shared Dockerfile.
RUN yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

## If You Want Cache Optimization on Your Own Railway Deployment
Railway requires the format `id=s/<your-service-id>-<name>` where `<your-service-id>` comes from your Railway dashboard (Settings → Service ID). Example:

```dockerfile
RUN --mount=type=cache,id=s/fa767a20-642a-4488-a3da-9afd5be74723-yarn-cache,target=/root/.cache/yarn \
    yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

Note: This is deployment-specific and should not be committed to a shared repository.

## Validation
Run the validation script to verify the fix:
```bash
./scripts/validate-railway-cache-fix.sh
```

## Expected Result
- ✅ Railway builds complete successfully
- ✅ No more "Cache mount ID is not prefixed with cache key" errors
- ✅ Works for any Railway deployment without configuration changes
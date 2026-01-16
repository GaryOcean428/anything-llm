# Railway Docker Cache Mount Fix

## Issue Fixed
Railway deployment was failing with error: `Cache mount ID is not prefixed with cache key`

## Root Cause
Railway's Docker infrastructure requires cache mount IDs to be in simple format WITHOUT the `cache:` prefix. The original Dockerfile had IDs like `cache:yarn-cache` and `cache:node-gyp-cache` which Railway's build system rejects.

**Note:** The Railway error message is misleading - "not prefixed with cache key" actually means the ID format is WRONG because it HAS an unwanted prefix.

## Solution Applied
**File:** `Dockerfile` (lines 34-35)

**Before:**
```dockerfile
RUN --mount=type=cache,id=cache:yarn-cache,target=/root/.cache/yarn \
    --mount=type=cache,id=cache:node-gyp-cache,target=/root/.cache/node-gyp \
    yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

**After:**
```dockerfile
RUN --mount=type=cache,id=yarn-cache,target=/root/.cache/yarn \
    --mount=type=cache,id=node-gyp-cache,target=/root/.cache/node-gyp \
    yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

**Change:** Removed `cache:` prefix from the cache mount IDs to match Railway's required format.

## Alternative Solution
If cache mounts continue to cause issues, use `Dockerfile.no-cache` which removes cache mounts entirely:

```bash
# In railway.toml, change:
dockerfilePath = "Dockerfile.no-cache"
```

## Validation
Run the validation script to verify the fix:
```bash
./scripts/validate-railway-cache-fix.sh
```

## Expected Result
- ✅ Railway builds complete successfully
- ✅ Cache optimization still works
- ✅ Deployment time improved vs no-cache approach
- ✅ No more "Cache mount ID is not prefixed with cache key" errors

This fix maintains all performance benefits of cache mounts while ensuring Railway compatibility.
# Railway Docker Cache Mount Fix

## Issue Fixed
Railway deployment was failing with error: `Cache mount ID is not prefixed with cache key`

## Root Cause
Railway's Docker infrastructure requires cache mount IDs to be prefixed with `cache:` but the original Dockerfile used bare IDs like `yarn-cache` and `node-gyp-cache`.

## Solution Applied
**File:** `Dockerfile` (lines 34-35)

**Before:**
```dockerfile
RUN --mount=type=cache,id=yarn-cache,target=/root/.cache/yarn \
    --mount=type=cache,id=node-gyp-cache,target=/root/.cache/node-gyp \
    yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

**After:**
```dockerfile
RUN --mount=type=cache,id=cache:yarn-cache,target=/root/.cache/yarn \
    --mount=type=cache,id=cache:node-gyp-cache,target=/root/.cache/node-gyp \
    yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

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
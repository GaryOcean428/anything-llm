# Railway Docker Cache Mount Fix

## Issue Fixed
Railway deployment was failing with error: `Cache mount ID is not prefixed with cache key`

## Root Cause
Railway's Docker build system requires cache mount IDs to use a service-specific prefix format:

```
id=s/<railway-service-id>-<target-path>
```

Simple IDs like `yarn-cache` or prefixed forms like `cache:yarn-cache` are both rejected.

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
RUN --mount=type=cache,id=s/fa767a20-642a-4488-a3da-9afd5be74723-/root/.cache/yarn,target=/root/.cache/yarn \
    --mount=type=cache,id=s/fa767a20-642a-4488-a3da-9afd5be74723-/root/.cache/node-gyp,target=/root/.cache/node-gyp \
    yarn workspaces focus luffy-frontend --all --immutable --inline-builds
```

**Change:** Updated cache mount IDs to use Railway's required `s/<service-id>-<target-path>` format with the production service ID `fa767a20-642a-4488-a3da-9afd5be74723`.

## For Other Railway Deployments
If you fork this repo and deploy to a different Railway service, update the service ID in the Dockerfile cache mount IDs. Find your service ID in the Railway dashboard under Settings → Service ID. The format is:

```
id=s/<your-service-id>-<target-path>
```

## Validation
Run the validation script to verify the fix:
```bash
./scripts/validate-railway-cache-fix.sh
```

## Expected Result
- ✅ Railway builds complete successfully
- ✅ Cache optimization retained for faster builds
- ✅ No more "Cache mount ID is not prefixed with cache key" errors
# Railway Deployment Notes

This file contains notes for deploying AnythingLLM on Railway.

## Configuration

The `railway.toml` file has been simplified to:

1. Build frontend and server dependencies using standard Node.js/Yarn workflow
2. Deploy from the `server` directory context 
3. Run database migrations during deployment startup
4. Start the server with proper health checks
5. Use automatic Prisma client generation via `postinstall` script

**Key Configuration Details:**
- **Build**: Runs from root directory, installs frontend/server dependencies
- **Deploy**: Runs from `server` directory where Prisma files are located
- **Prisma**: Client generation handled automatically by `postinstall` script in `server/package.json`
- **No Conflicts**: Removed `nixpacks.toml` to prevent configuration conflicts

> **Note**

1. Create a Railway **Volume** named `storage`.
2. Mount the volume to `/workspace/server/storage`.
3. Set the `STORAGE_DIR` variable to `/workspace/server/storage`.
4. Deploy the service; `anythingllm.db` will be created automatically on first run.

The collector can be deployed as a separate Railway service.

1. Create a new service in the Railway dashboard and select "Import from repository".
2. Set the **Root Directory** to `collector`.
3. Use `NODE_ENV=production node index.js` as the start command.
4. Add any required environment variables (e.g. `JWT_SECRET`) the same as the main server.

Example `railway.toml` section:

startCommand = "NODE_ENV=production node index.js"
- `NODE_ENV=production` (set automatically)
- `STORAGE_DIR` - Path for persistent storage (recommend using Railway volumes)
- `JWT_SECRET` - Random string at least 12 chars (for authentication)
- `SIG_KEY` - Random string at least 32 chars (for signatures)
- `SIG_SALT` - Random string at least 32 chars (for signature salt)

### Database
By default, AnythingLLM uses SQLite with file storage. For Railway deployment, consider:

1. **SQLite** (default): Requires persistent volume for the database file at `server/storage/anythingllm.db`
2. **PostgreSQL**: Use Railway's PostgreSQL service (recommended for production)

For PostgreSQL:
- Add a PostgreSQL service in Railway
- Update `server/prisma/schema.prisma` to use PostgreSQL datasource
- Railway will provide `DATABASE_URL` automatically

Note: SQLite requires the `server/storage/` directory to exist and be writable.
When deploying with SQLite:
1. Create a Railway volume and mount it to `server/storage`.
2. Ensure `STORAGE_DIR` is set to `/workspace/server/storage` or your mount path.
3. The database file `anythingllm.db` will be created automatically on first run.

### LLM Provider (choose one)
- OpenAI: `LLM_PROVIDER=openai`, `OPENAI_API_KEY=your-key`
- Anthropic: `LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=your-key`
- Gemini: `LLM_PROVIDER=gemini`, `GEMINI_API_KEY=your-key`
- etc.

## Storage

For persistent storage, add a Railway volume and set `STORAGE_DIR` to the volume mount path.

## Services

Currently, Railway is configured to run only the main server. For full functionality, you may also want to deploy the collector service separately:

- **Server**: Handles API requests and web interface
- **Collector**: Processes document uploads and text extraction

The collector can be deployed as a separate Railway service. Example `railway.toml` section:

```toml
[services.collector]
root = "collector"
preDeployCommand = "yarn install --production"
startCommand = "node index.js"
healthcheckPath = "/"
```

## Health Check

The health check endpoint is `/api/ping` and should respond with `{"online": true}` when the server is ready.

## Troubleshooting

If health checks fail:
1. Check the deploy logs for Prisma generation errors
2. Verify database connection
3. Ensure required environment variables are set
4. Check that STORAGE_DIR path is writable (if set)
5. Verify the server is binding to the correct port ($PORT)

### Common Issues

**Prisma Schema Not Found Error:**
If you see `Error: Could not load --schema from provided path prisma/schema.prisma: file or directory not found`, this typically means:
- The Prisma schema file is not available in the deployment environment
- There are symlink issues (Railway doesn't handle symlinks well)
- The working directory is not set correctly

**Solution:**
- Ensure `server/prisma/schema.prisma` exists and is committed to git
- **IMPORTANT**: Do not create symlinks from `/prisma` that point to `server/prisma` - Railway doesn't handle symlinks well
- Verify `railway.toml` has `root = "server"` and uses simple deployment commands
- The `server/package.json` includes a `postinstall` script that automatically generates the Prisma client
- Ensure no conflicting build configurations (e.g., `nixpacks.toml` vs `railway.toml`)

**Build Configuration Conflicts:**
If deployments fail with `ls: cannot access 'prisma/': No such file or directory`:
- Remove any `nixpacks.toml` file that conflicts with `railway.toml`
- Use simplified build commands in `railway.toml`
- Let Railway's standard Node.js build process handle most of the setup
- The existing `postinstall` script in `server/package.json` will generate the Prisma client automatically

**Note:** As of the fix for issue #70, the repository uses a simplified `railway.toml` configuration without conflicting `nixpacks.toml`. All Prisma files are located in `server/prisma/` and the deployment runs from the server directory where the actual files exist.

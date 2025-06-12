# Railway Deployment Notes

This file contains notes for deploying AnythingLLM on Railway.

## Configuration

The `railway.toml` file has been configured to:

1. Generate Prisma client before starting the server
2. Apply database migrations
3. Install server dependencies during a pre-deploy step
4. Start the server with the correct port mapping

> **Note**
> Dependencies are installed during the pre-deploy step using `npm install --omit=dev --legacy-peer-deps`. Avoid adding `npm install` to the start command to prevent timeouts.

## Required Environment Variables

For Railway deployment, you'll need to set these environment variables in your Railway dashboard:

### Essential Variables
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
- OpenAI: `LLM_PROVIDER=openai`, `OPEN_AI_KEY=your-key`
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
preDeployCommand = "npm install --omit=dev --legacy-peer-deps"
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

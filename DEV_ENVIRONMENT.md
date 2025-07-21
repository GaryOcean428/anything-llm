# AnythingLLM Development Environment

This document describes the complete development environment setup for AnythingLLM in GitHub Codespaces with yarn 4.9.2.

## Quick Start

1. **Install dependencies:**

   ```bash
   yarn install
   ```

2. **Setup environment files:**

   ```bash
   yarn setup:envs
   ```

3. **Start all services:**
   ```bash
   yarn dev:all
   ```

## Development Environment Details

### Package Management

- **Yarn Version**: 4.9.2 (activated via corepack)
- **Node Version**: 22.17.1 LTS
- **Package Manager**: corepack-managed yarn

### Available Services

- **Frontend**: React + Vite (Port 3000)
- **Server**: Express.js API (Port 3001)
- **Collector**: Document processing service (Port 8288)

### Development Commands

#### Core Development

```bash
yarn dev:all          # Start all services concurrently
yarn dev:frontend     # Start only frontend (Port 3000)
yarn dev:server       # Start only server (Port 3001)
yarn dev:collector    # Start only collector (Port 8288)
```

#### Quality Assurance

```bash
yarn lint             # Lint frontend and server
yarn lint:fix         # Fix linting issues
yarn test             # Run all tests
yarn test:coverage    # Run tests with coverage
```

#### Database Management

```bash
yarn prisma:setup     # Generate, migrate, and seed database
yarn prisma:generate  # Generate Prisma client
yarn prisma:migrate   # Run database migrations
yarn prisma:seed      # Seed database with initial data
yarn prisma:reset     # Reset database and re-migrate
```

#### Railway Deployment

```bash
yarn railway:login    # Login to Railway
yarn railway:deploy   # Deploy to Railway
yarn railway:status   # Check deployment status
yarn railway:env      # Manage environment variables
yarn railway:logs     # View deployment logs
```

#### Alternative Railway Access

If the yarn scripts don't work, use the helper script:

```bash
./scripts/railway.sh login
./scripts/railway.sh deploy
./scripts/railway.sh status
```

Or install Railway CLI directly:

```bash
npm install -g @railway/cli
railway login
```

### VS Code Configuration

#### Recommended Extensions

- TypeScript Language Features
- Prettier Code Formatter
- ESLint
- Tailwind CSS IntelliSense
- Prisma
- Docker
- Thunder Client
- Playwright Test

#### Debugging

- Server: F5 or "Debug AnythingLLM Server"
- Frontend: "Debug Frontend (Vite)"
- Collector: "Debug Collector Service"
- Tests: "Debug Tests"

### Environment Files

#### Development (.env.development)

```bash
# Located in: server/.env.development
DATABASE_CONNECTION_STRING="file:./storage/anythingllm.db"
JWT_SECRET="your-development-jwt-secret"
# ... additional dev variables
```

#### Railway Production (.env.railway.example)

```bash
# Template for Railway environment variables
NODE_ENV=production
DATABASE_URL="${{Postgres.DATABASE_URL}}"
JWT_SECRET="your-secure-production-secret"
# ... see .env.railway.example for complete list
```

### Port Configuration

| Service   | Development Port | Production Port |
| --------- | ---------------- | --------------- |
| Frontend  | 3000             | N/A (built)     |
| Server    | 3001             | 3001            |
| Collector | 8288             | 8288            |

All ports are automatically forwarded in GitHub Codespaces.

### Troubleshooting

#### Yarn Command Not Found

```bash
corepack enable
corepack prepare yarn@4.9.2 --activate
```

#### Railway CLI Issues

```bash
# Option 1: Use yarn script
yarn railway:login

# Option 2: Use helper script
./scripts/railway.sh login

# Option 3: Install globally
npm install -g @railway/cli
```

#### Database Issues

```bash
# Reset and recreate database
yarn prisma:reset

# Check migration status
cd server && npx prisma migrate status
```

#### Port Conflicts

```bash
# Kill processes on ports
pkill -f "port 3000"
pkill -f "port 3001"
pkill -f "port 8288"
```

### VS Code Tasks

Use Ctrl+Shift+P and search "Tasks: Run Task":

- Install Dependencies
- Start Development Server
- Start Frontend Development
- Run Database Migration
- Build Production
- Run Tests

### Git Hooks

Pre-commit hooks automatically run:

- Prettier formatting
- ESLint checks
- Conventional commit message validation

## Production Deployment

### Railway Deployment

1. Set environment variables in Railway dashboard
2. Use `yarn railway:deploy` or push to connected branch
3. Monitor logs with `yarn railway:logs`

### Docker Deployment

```bash
docker build -t anythingllm .
docker run -p 3001:3001 anythingllm
```

See `RAILWAY.md` for detailed Railway deployment instructions.

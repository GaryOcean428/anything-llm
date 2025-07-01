# Railway AnythingLLM Dockerfile - Optimized for Railway Deployment
# Resolves yarn command not found issue by using Node.js 18 Alpine with proper PATH configuration

FROM node:18-alpine AS base

# Install system dependencies required for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    bash \
    && ln -sf python3 /usr/bin/python

# Install yarn globally with explicit PATH configuration
RUN npm install -g yarn@1.22.19
ENV PATH="/usr/local/bin:$PATH"

# Verify yarn installation
RUN yarn --version

WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./
COPY frontend/package.json frontend/yarn.lock ./frontend/
COPY server/package.json server/yarn.lock ./server/

# Copy application source
COPY . .

# Build frontend with separated commands (CRITICAL FIX for Railway)
RUN cd frontend && yarn install --frozen-lockfile
RUN cd frontend && yarn build

# Copy built frontend to server public directory
RUN cp -R frontend/dist server/public

# Install server production dependencies
RUN cd server && yarn install --production --frozen-lockfile

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Health check endpoint for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/ping || exit 1

# Expose port
EXPOSE 3001

# Start command
CMD ["node", "server/index.js"]
# Railway AnythingLLM Dockerfile - Optimized for Railway with Python 3.11
# Simplified build process using npm to avoid certificate issues

FROM node:20-slim AS base

# Install Python 3.11 and build dependencies (Debian Bookworm default)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-dev \
    python3-pip \
    make \
    g++ \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

# Copy all source files
COPY . .

# Build frontend with npm
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Setup production server
WORKDIR /app
RUN cp -R frontend/dist server/public

WORKDIR /app/server
RUN npm run install:production

# Set environment
ARG PORT=3001
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096

EXPOSE ${PORT}

# Start server with database migration
CMD ["npm", "run", "start:migrate"]
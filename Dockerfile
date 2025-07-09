# Railway AnythingLLM Dockerfile - Simplified with corepack
# Uses Node.js built-in corepack to manage yarn

FROM node:20-slim AS base

# Install minimal dependencies for building
RUN apt-get update && apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/* && \
    ln -sf python3 /usr/bin/python

# Install yarn globally (avoids corepack certificate issues)
RUN npm install -g yarn

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/yarn.lock ./frontend/
COPY server/package.json server/yarn.lock ./server/

# Copy all source files
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN yarn install --frozen-lockfile
RUN yarn build

# Setup production server
WORKDIR /app
RUN cp -R frontend/dist server/public

WORKDIR /app/server
RUN yarn install --production --frozen-lockfile

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start server
CMD ["node", "index.js"]
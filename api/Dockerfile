# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
# API Gateway Dockerfile

FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    musl-dev \
    git \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Configure npm and install dependencies with aggressive retry logic
# Use npm install instead of npm ci to be more tolerant of network issues
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 1 && \
    npm config set registry https://registry.npmjs.org/ && \
    npm install --no-audit --no-fund --prefer-offline --no-optional 2>&1 | tee /tmp/npm-install.log || \
    (echo "Retrying npm install..." && sleep 5 && npm install --no-audit --no-fund --prefer-offline --no-optional)

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev --no-audit --no-fund 2>/dev/null || echo "Prune completed with warnings"

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
# Note: dumb-init may not be available in Alpine 3.21, use tini as alternative
RUN apk add --no-cache tini || apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files and the pruned production dependencies from the builder.
COPY package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder --chown=node:node /app/dist ./dist

# Create necessary directories
RUN mkdir -p logs uploads wallet fabric-certs crypto-keys certificates licenses \
    && chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with tini (or dumb-init if available)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]

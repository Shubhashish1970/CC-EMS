# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (ensure package-lock.json is included)
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Expose port (Cloud Run uses PORT env var, defaults to 8080)
EXPOSE 8080

# Health check (Cloud Run provides its own health checks)
# HEALTHCHECK removed - Cloud Run handles health checks automatically

# Start the application
CMD ["node", "dist/server.js"]



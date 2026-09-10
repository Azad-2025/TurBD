# -------------------------------------------------------------
# TurfBD Production Container Image
# Multi-stage Docker build for Node.js + Express + Vite SSR/Static
# -------------------------------------------------------------

# Stage 1: Build Phase
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Run production build (Compiles Vite frontend to dist/ and esbuild server to dist/server.cjs)
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies required by sharp/canvas if needed
RUN apk add --no-cache curl tzdata

# Create dedicated non-root application user
RUN addgroup -S turfbd && adduser -S -G turfbd turfbd

# Copy package manifests and production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built distribution assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/scripts ./scripts

# Create persistent uploads directory with proper permissions
RUN mkdir -p /app/public/uploads && chown -R turfbd:turfbd /app

USER turfbd

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Production Start Command
CMD ["node", "dist/server.cjs"]

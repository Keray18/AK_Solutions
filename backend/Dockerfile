# ============================================================
# SkinAI Backend — Multi-stage Production Dockerfile
# Target: Railway, Docker, or self-hosted container environment
# ============================================================

# Stage 1: Build TypeScript source
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies required for building
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source code and build
COPY src/ ./src/
RUN npm run build

# Stage 2: Minimal production runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Copy migrations and schema artifacts for runtime schema migrations
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# Run as non-root user for container security
USER node

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

CMD ["node", "dist/server.js"]

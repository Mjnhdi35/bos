# syntax=docker/dockerfile:1.8

# ---- Build stage ----
# Compiles TypeScript to dist/ with full devDependencies.
FROM node:24-alpine AS builder
WORKDIR /app

# Install all dependencies (dev + runtime) needed to build.
COPY package.json package-lock.json ./
RUN npm ci

# Copy only what tsc needs to produce dist/.
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
# Production-only: runtime deps + dist/ artifacts. No AGENTS.md, no tests,
# no coverage, no dev tooling. Runs as non-root `node` user.
FROM node:24-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Install runtime dependencies only; Husky is development-only.
COPY package.json package-lock.json ./
RUN npm pkg delete scripts.prepare \
    && npm ci --omit=dev \
    && npm cache clean --force

# Copy compiled artifacts from the builder stage.
COPY --from=builder /app/dist ./dist

# node:alpine ships a non-root `node` user (uid 1000).
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]

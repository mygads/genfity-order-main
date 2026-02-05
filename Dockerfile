# ============================================
# GENFITY ONLINE ORDERING - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Builder (combined deps + build)
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and prisma schema
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install dependencies (allow build scripts for prisma)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client (force regenerate)
RUN pnpm exec prisma generate

# Copy source code
COPY . .

# Build the application (with dummy env vars for build time only)
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_ORDER_API_BASE_URL=https://api-order.genfity.com
ARG NEXT_PUBLIC_ORDER_WS_URL=wss://api-order.genfity.com
ARG NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE=all
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
ENV JWT_SECRET="build-time-dummy-jwt-secret-not-used-in-production"
ENV JWT_REFRESH_SECRET="build-time-dummy-refresh-secret-not-used-in-production"
ENV NEXT_PUBLIC_APP_URL="https://order.genfity.com"
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
ENV NEXT_PUBLIC_ORDER_API_BASE_URL=${NEXT_PUBLIC_ORDER_API_BASE_URL}
ENV NEXT_PUBLIC_ORDER_WS_URL=${NEXT_PUBLIC_ORDER_WS_URL}
ENV NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE=${NEXT_PUBLIC_ORDER_API_ROUTE_SCOPE}
RUN pnpm build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy entire node_modules from builder (includes pnpm structure with prisma)
COPY --from=builder /app/node_modules ./node_modules

# Copy healthcheck script
COPY healthcheck.js ./healthcheck.js

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]

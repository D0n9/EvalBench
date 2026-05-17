# ==========================================
# Stage 1: Development Environment (Base)
# ==========================================
FROM node:20-alpine AS dev

WORKDIR /app

# Install pnpm with fixed version
ARG PNPM_VERSION=10.5.2
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy dependency files first (better layer caching)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (install all including devDependencies for dev stage)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Default command for development
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]

# ==========================================
# Stage 2: Builder
# ==========================================
FROM dev AS builder

# Build application with optimizations
# We can use NODE_ENV=production here to ensure production build optimizations
ENV NODE_ENV=production
RUN pnpm build

# ==========================================
# Stage 3: Production (Nginx)
# ==========================================
FROM nginx:alpine AS prod

# Install curl for health check
RUN apk add --no-cache curl

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Runtime: inject product landing toggle (see docker-compose ENABLE_LANDING_PAGE)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]

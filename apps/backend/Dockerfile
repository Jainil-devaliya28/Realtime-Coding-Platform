# ============================================================
# BACKEND DOCKERFILE - Multi-stage build
# ============================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/backend --workspace=packages/shared

# Build shared package
FROM deps AS builder
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

COPY apps/backend ./apps/backend
RUN npm run build --workspace=apps/backend

# Production image
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend

USER backend

EXPOSE 4000

CMD ["node", "dist/index.js"]

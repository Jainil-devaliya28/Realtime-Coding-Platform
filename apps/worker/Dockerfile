FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat docker-cli
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/worker --workspace=packages/shared

FROM deps AS builder
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared
COPY apps/worker ./apps/worker
RUN npm run build --workspace=apps/worker

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
WORKDIR /app/apps/worker
USER worker
CMD ["node", "dist/index.js"]

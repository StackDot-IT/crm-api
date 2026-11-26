# syntax=docker/dockerfile:1

# ── Stage 1: install production dependencies + generate Prisma client ──
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma's query/schema engines need OpenSSL on Alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
 && npx prisma generate \
 && npm cache clean --force

# ── Stage 2: runtime image ──
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache openssl tini

ENV NODE_ENV=production \
    PORT=5000 \
    RUN_MIGRATIONS=true

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" > /dev/null || exit 1

# tini forwards SIGTERM so `docker stop` shuts Node down cleanly.
# On start: apply pending Prisma migrations (set RUN_MIGRATIONS=false to skip), then start the API.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then ./node_modules/.bin/prisma migrate deploy; fi && exec node src/index.js"]

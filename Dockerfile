FROM node:22-alpine AS dependencies

WORKDIR /app

# Prisma requires OpenSSL at installation and runtime.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4000

RUN apk add --no-cache openssl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 api

# Prisma CLI and tsx are retained because migrations and the seed run when the
# container starts. The seed is idempotent, so restarting does not duplicate data.
COPY --from=dependencies --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/package.json ./package.json
COPY --from=builder --chown=api:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=api:nodejs /app/dist ./dist
COPY --from=builder --chown=api:nodejs /app/prisma ./prisma

USER api

EXPOSE 4000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && exec node dist/server.js"]

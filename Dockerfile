FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
    else npm install; fi

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl

COPY package.json package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev && npm install drizzle-kit dotenv; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --prod --frozen-lockfile && pnpm add drizzle-kit dotenv; \
    else npm install --omit=dev && npm install drizzle-kit dotenv; fi

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/db ./db
COPY --from=builder /app/assets ./assets
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p uploads order-files order-pdfs logs

EXPOSE 4002
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]

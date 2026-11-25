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
# dl-cdn.alpinelinux.org times out from this network; use a reachable mirror.
RUN sed -i 's#https://dl-cdn.alpinelinux.org#https://mirror.arvancloud.ir#g' /etc/apk/repositories \
 && apk add --no-cache curl

# Reuse the install from the builder stage. A second npm install here
# times out against registry.npmjs.org on this network, and drizzle-kit
# (needed for migrations) is already in that node_modules tree.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
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

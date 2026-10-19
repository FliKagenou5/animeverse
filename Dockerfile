# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

FROM deps AS build
COPY client ./client
COPY server ./server
RUN npm run build

FROM node:24-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
RUN apk add --no-cache su-exec
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_PATH=/data/animeverse.db

COPY package.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/client/dist ./client/dist
COPY server/package.json ./server/package.json
COPY server/src ./server/src
COPY docker/entrypoint.sh /usr/local/bin/animeverse-entrypoint

RUN chmod +x /usr/local/bin/animeverse-entrypoint \
    && mkdir -p /data \
    && chown -R node:node /data

EXPOSE 4000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["animeverse-entrypoint"]
CMD ["node", "server/src/server.js"]

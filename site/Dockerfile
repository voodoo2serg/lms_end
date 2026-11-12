FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY . .
RUN npm run build:vps
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data COOKIE_SECURE=true HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/scripts/admin.mjs ./scripts/admin.mjs
COPY --from=build /app/scripts/link-oidc.mjs ./scripts/link-oidc.mjs
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node","server.js"]

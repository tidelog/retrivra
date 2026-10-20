FROM node:24-bookworm-slim AS build
WORKDIR /app
# Install OpenSSL before npm dependencies so Prisma detects the correct
# Linux OpenSSL runtime and selects compatible engines.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --ignore-scripts \
    --fetch-retries=2 \
    --fetch-timeout=120000 \
    --fetch-retry-mintimeout=1000 \
    --fetch-retry-maxtimeout=10000
COPY . .
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts
RUN mkdir -p /app/var/storage && chown -R node:node /app/var
USER node
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]

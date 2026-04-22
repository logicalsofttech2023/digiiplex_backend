FROM node:20

WORKDIR /workspace

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

# Copy root + workspace packages
COPY package*.json ./
COPY services/subscriptionService/package.json ./services/subscriptionService/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/dist ./packages/db/dist

# Install dependencies (IMPORTANT)
RUN npm ci --workspace subscriptionservice --include=dev --no-audit

# Copy actual source
COPY services/subscriptionService ./services/subscriptionService

# Build
WORKDIR /workspace/services/subscriptionService
RUN npm run build

EXPOSE 3003

CMD ["node", "dist/index.js"]
FROM node:20

WORKDIR /workspace

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

# Copy root + workspace packages
COPY package*.json ./
COPY services/videoService/package.json ./services/videoService/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/dist ./packages/db/dist

# Install dependencies (IMPORTANT)
RUN npm ci --workspace videoservice --include=dev --no-audit

# Copy actual source
COPY services/videoService ./services/videoService

# Build
WORKDIR /workspace/services/videoService
RUN npm run build

EXPOSE 3004

CMD ["node", "dist/index.js"]
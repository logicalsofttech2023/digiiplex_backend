# Base image
FROM node:20

WORKDIR /workspace

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

# Root + workspace package files
COPY package*.json ./
COPY services/uploadService/package.json ./services/uploadService/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/dist ./packages/db/dist

# Install only upload service deps (workspace)
RUN npm ci --workspace uploadservice --no-audit

# Copy source code
COPY services/uploadService ./services/uploadService
COPY packages/proto ./packages/proto

# Install ffmpeg (since you need it)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Build
WORKDIR /workspace/services/uploadService
RUN npm run build

EXPOSE 3006

CMD ["node", "dist/index.js"]
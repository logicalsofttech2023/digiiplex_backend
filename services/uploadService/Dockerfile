# Stage 1 - Build
FROM node:20 AS builder

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

COPY package*.json ./
RUN npm ci --no-audit --prefer-offline

COPY . .
RUN npm run build


# Stage 2 - Production
FROM node:20-slim

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --prefer-offline

COPY --from=builder /app/dist ./dist

EXPOSE 3006

CMD ["node", "dist/index.js"]

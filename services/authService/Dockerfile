FROM node:20

WORKDIR /workspace

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

# Preserve the repo layout so file:../../packages/db resolves inside the image.
COPY package*.json ./
COPY services/authService/package.json ./services/authService/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/dist ./packages/db/dist

RUN npm ci --workspace authservice --no-audit

COPY services/authService ./services/authService
COPY packages/proto ./packages/proto

WORKDIR /workspace/services/authService
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]

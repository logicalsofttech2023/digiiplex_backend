FROM node:20

WORKDIR /workspace

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

COPY package*.json ./
COPY services/adminService/package.json ./services/adminService/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/dist ./packages/db/dist

RUN npm ci --workspace adminservice --no-audit

COPY services/adminService ./services/adminService
COPY packages/proto ./packages/proto

WORKDIR /workspace/services/adminService
RUN npm run build

EXPOSE 3007

CMD ["node", "dist/index.js"]

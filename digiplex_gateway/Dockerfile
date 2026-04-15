FROM node:20

WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

COPY package*.json ./

RUN npm ci --omit=dev --no-audit --prefer-offline

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]

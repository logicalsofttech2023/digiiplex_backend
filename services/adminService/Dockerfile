# Stage 1 - Build
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build


# Stage 2 - Production
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY --from=builder /app/dist ./dist
RUN npx prisma generate

EXPOSE 3007

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

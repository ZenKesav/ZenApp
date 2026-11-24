# Multi-stage production container build for Zenmeter Enterprise MES Backend
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5555

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY uploads ./uploads
COPY logs ./logs

EXPOSE 5555

CMD ["node", "src/server.js"]

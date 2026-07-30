# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm run prisma:generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV MCPORTER_CONFIG=/app/config/mcporter.json
ENV PATH=/usr/local/bin:${PATH}

WORKDIR /app

RUN npm install --global mcporter@0.12.3 exa-mcp-server@3.2.1 prisma@6.7.0 \
    && node --version \
    && command -v mcporter \
    && mcporter --version \
    && command -v exa-mcp-server \
    && command -v prisma \
    && prisma --version

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY config ./config

USER node

EXPOSE 8787

CMD ["sh", "-c", "prisma migrate deploy && npm run start"]

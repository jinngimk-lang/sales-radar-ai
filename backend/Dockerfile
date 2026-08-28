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

RUN npm install --global mcporter@0.12.3 prisma@6.7.0 \
    && mkdir -p /opt/exa-mcp-runtime \
    && printf '%s\n' '{"private":true,"dependencies":{"exa-mcp-server":"3.2.1"},"overrides":{"shelljs":"0.8.5"}}' > /opt/exa-mcp-runtime/package.json \
    && npm install --prefix /opt/exa-mcp-runtime --omit=dev \
    && ln -s /opt/exa-mcp-runtime/node_modules/.bin/exa-mcp-server /usr/local/bin/exa-mcp-server \
    && npm ls --prefix /opt/exa-mcp-runtime shelljs --all | grep -q 'shelljs@0.8.5' \
    && ! npm ls --prefix /opt/exa-mcp-runtime shelljs --all | grep -q 'shelljs@0.3.0' \
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

CMD ["node", "dist/server.js"]

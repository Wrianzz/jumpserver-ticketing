# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS backend
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY server ./server

EXPOSE 3001

USER node
CMD ["npm", "run", "server"]

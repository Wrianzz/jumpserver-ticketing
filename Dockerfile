# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS frontend-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS frontend
COPY --from=frontend-build /app/dist /usr/share/nginx/html
RUN rm /docker-entrypoint.d/20-envsubst-on-templates.sh
COPY docker/20-envsubst-on-templates.sh /docker-entrypoint.d/20-envsubst-on-templates.sh
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
RUN chmod +x /docker-entrypoint.d/20-envsubst-on-templates.sh
EXPOSE 80

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

# syntax=docker/dockerfile:1
# Testes primeiro: a imagem só é gerada se eles passarem.
FROM node:22.23.4-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx vitest run && npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html/elocampo

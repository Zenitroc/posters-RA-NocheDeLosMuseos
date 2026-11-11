# --- 1. Build del sitio estático ---
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# URL pública que se usa en los QR (se fija en el build porque Vite la incrusta).
ARG VITE_SITIO_URL=""
ENV VITE_SITIO_URL=${VITE_SITIO_URL}
RUN npm run build

# --- 2. Servidor: Caddy (HTTPS automático, Range para videos, compresión) ---
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443

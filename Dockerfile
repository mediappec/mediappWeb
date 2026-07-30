# Build: Astro static site
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# PUBLIC_* se embebe en el HTML en build time (sitio estático)
ARG PUBLIC_GTM_ID=
ENV PUBLIC_GTM_ID=$PUBLIC_GTM_ID

RUN npm run build

# Run: nginx sirve /dist (Caddy en el VPS termina TLS y hace reverse_proxy)
FROM nginx:1.27-alpine AS runner

RUN apk add --no-cache wget

COPY docker/nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

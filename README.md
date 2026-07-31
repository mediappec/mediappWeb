# MediApp Landing

Landing page comercial del SaaS **MediApp**, construida con [Astro](https://astro.build) y Tailwind CSS.

Dirigida a medicos independientes y consultorios privados.

## Docker (produccion en VPS)

La landing se sirve con **nginx** dentro del contenedor. **Caddy** (contenedor aparte en el VPS) gestiona SSL para `mediappec.com`.

```bash
cp .env.example .env
docker compose --env-file .env up -d --build
```

Guia completa: [`DEPLOY.md`](./DEPLOY.md). Bloque Caddy de ejemplo: [`proxy/caddy/Caddyfile.example`](./proxy/caddy/Caddyfile.example).

## Desarrollo

```bash
npm install
npm --prefix server install
npm run dev:api   # terminal 1 — API SMTP en :3001
npm run dev       # terminal 2 — Astro en :4321 (proxy /api → :3001)
```

Abra [http://localhost:4321](http://localhost:4321) en el navegador.

Configure `SMTP_*` en un `.env` en la raiz o exporte las variables antes de `dev:api` (vea `.env.example`).

Con Laragon, puede servir el build estatico desde `dist/` o usar el servidor de desarrollo.

## Build para produccion

```bash
npm run build
npm run preview
```

Los archivos estaticos quedan en `dist/`.

## Reemplazar placeholders de imagenes

Los componentes `ImagePlaceholder` marcan donde insertar capturas reales:

1. Tome screenshots de la app MediApp (dashboard, pacientes, citas, recetas).
2. Guarde las imagenes en `public/images/`.
3. Sustituya `<ImagePlaceholder ... />` por `<img src="/images/nombre.png" alt="..." />` en los componentes correspondientes.

Archivos con placeholders:

- `src/components/Hero.astro`
- `src/components/Features.astro`
- `src/components/HowItWorks.astro`
- `src/components/Screenshots.astro`

## Formulario de contacto

El formulario en `CTA.astro` envia `POST /api/contact` al servicio `contact-api` (nodemailer + PrivateEmail). En Docker, nginx hace proxy de `/api/` hacia ese servicio. Configure `SMTP_PASS` en `.env` antes de desplegar.

## Estructura

```
src/
  components/   # Secciones de la landing
  layouts/      # Layout base HTML
  pages/        # Rutas (index.astro)
  styles/       # Tailwind y estilos globales
public/         # Assets estaticos (favicon, imagenes)
```

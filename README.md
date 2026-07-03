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
npm run dev
```

Abra [http://localhost:4321](http://localhost:4321) en el navegador.

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

El formulario en `CTA.astro` es visual. Conectelo a su backend, servicio de email o herramienta (Formspree, Netlify Forms, etc.) segun su despliegue.

## Estructura

```
src/
  components/   # Secciones de la landing
  layouts/      # Layout base HTML
  pages/        # Rutas (index.astro)
  styles/       # Tailwind y estilos globales
public/         # Assets estaticos (favicon, imagenes)
```

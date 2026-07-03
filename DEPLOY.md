# Despliegue Docker — Landing MediApp (mediappec.com)

La landing es un sitio **estatico** (Astro → `dist/`). El contenedor expone **nginx en el puerto 80**; **TLS y SSL los gestiona Caddy** en el VPS (patron igual al de las instancias MediApp en `DEPLOY_CONTABO.md`).

## Arquitectura

```text
Internet → Caddy (443, Let's Encrypt) → host.docker.internal:13080 → nginx (landing)
```

- **Dominio produccion:** `https://mediappec.com`
- **Puerto loopback recomendado:** `127.0.0.1:13080` (no expuesto al mundo; solo Caddy accede)

## 1) Build y levantar en el VPS

```bash
cd /opt/mediapp-landing
cp .env.example .env

docker compose --env-file .env build
docker compose --env-file .env up -d
docker compose --env-file .env ps
```

Comprobar en el servidor (sin Caddy):

```bash
curl -I http://127.0.0.1:13080/
```

## 2) Configurar Caddy (proxy existente)

En el **mismo** contenedor Caddy que ya usa para las instancias MediApp, anada los bloques de `proxy/caddy/Caddyfile.example`:

```caddyfile
mediappec.com {
    reverse_proxy host.docker.internal:13080
}

www.mediappec.com {
    redir https://mediappec.com{uri} permanent
}
```

Recargar:

```bash
cd /opt/mediapp/proxy
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

**Orden:** primero `docker compose up` de la landing y verifique el puerto loopback; despues recargue Caddy para que Let's Encrypt complete el desafio HTTP-01.

## 3) DNS

| Host | Tipo | Valor |
|------|------|-------|
| `mediappec.com` | A | IP del VPS |
| `www` | A o CNAME | IP del VPS o `mediappec.com` |

## 4) Publicar imagen en Docker Hub (opcional)

```bash
docker build -t TU_USUARIO/mediapp-landing:latest .
docker push TU_USUARIO/mediapp-landing:latest
```

En `.env`:

```env
LANDING_IMAGE=TU_USUARIO/mediapp-landing:latest
```

En el VPS:

```bash
docker compose --env-file .env pull
docker compose --env-file .env up -d --force-recreate
```

## 5) Actualizar contenido

```bash
docker compose --env-file .env build --no-cache
docker compose --env-file .env up -d --force-recreate
```

## 6) Logs y salud

```bash
docker compose --env-file .env logs -f landing
docker compose --env-file .env ps
```

## Notas

- **No** configure Certbot ni TLS en este contenedor; Caddy ya termina HTTPS.
- Si `13080` choca con otra instancia, cambie `LANDING_PORT` en `.env` y el puerto en el bloque Caddy.
- Las instancias de consultorio siguen en subdominios (`{slug}.mediappec.com`); la raiz queda para esta landing comercial.

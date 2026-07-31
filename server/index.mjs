import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';

// Carga opcional de .env en la raiz del repo (solo local; Docker inyecta env)
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(import.meta.dirname, '../.env'));
loadEnvFile(resolve(import.meta.dirname, '.env'));

const PORT = Number(process.env.PORT || 13081);
const SMTP_HOST = process.env.SMTP_HOST || 'mail.privateemail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = (process.env.SMTP_SECURE ?? 'true') === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const CONTACT_TO = process.env.CONTACT_TO || 'contact@mediappec.com';
const CONTACT_FROM = process.env.CONTACT_FROM || SMTP_USER || CONTACT_TO;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
/** @type {Map<string, { count: number, resetAt: number }>} */
const rateLimitStore = new Map();

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(c) {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return c.req.header('x-real-ip') || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

app.get('/health', (c) => c.json({ ok: true }));

app.post('/api/contact', async (c) => {
  const ip = getClientIp(c);

  if (!checkRateLimit(ip)) {
    return c.json({ ok: false, error: 'Demasiadas solicitudes. Intente mas tarde.' }, 429);
  }

  if (!SMTP_USER || !SMTP_PASS) {
    console.error('SMTP_USER / SMTP_PASS no configurados');
    return c.json({ ok: false, error: 'El servicio de correo no esta configurado.' }, 503);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'Solicitud invalida.' }, 400);
  }

  const website = typeof body.website === 'string' ? body.website.trim() : '';
  if (website) {
    // Honeypot: parecer exito sin enviar
    return c.json({ ok: true });
  }

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const telefono = typeof body.telefono === 'string' ? body.telefono.trim() : '';

  if (!nombre || !email || !telefono) {
    return c.json({ ok: false, error: 'Complete todos los campos.' }, 400);
  }

  if (!emailRe.test(email)) {
    return c.json({ ok: false, error: 'Correo electronico invalido.' }, 400);
  }

  if (nombre.length > 200 || email.length > 254 || telefono.length > 50) {
    return c.json({ ok: false, error: 'Datos demasiado largos.' }, 400);
  }

  const transporter = createTransporter();

  try {
    await transporter.sendMail({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: `Solicitud de piloto MediApp — ${nombre}`,
      text: [
        'Nueva solicitud de piloto desde mediappec.com',
        '',
        `Nombre: ${nombre}`,
        `Correo: ${email}`,
        `Telefono / WhatsApp: ${telefono}`,
        '',
        `IP: ${ip}`,
      ].join('\n'),
      html: `
        <h2>Nueva solicitud de piloto</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telefono / WhatsApp:</strong> ${escapeHtml(telefono)}</p>
        <p style="color:#64748b;font-size:12px;">IP: ${escapeHtml(ip)}</p>
      `,
    });
  } catch (err) {
    console.error('Error SMTP:', err);
    return c.json({ ok: false, error: 'No se pudo enviar el mensaje. Intente mas tarde.' }, 502);
  }

  return c.json({ ok: true });
});

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`contact-api listening on 0.0.0.0:${info.port}`);
});

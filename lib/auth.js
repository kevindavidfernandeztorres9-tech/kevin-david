export const AUTH_COOKIE = 'dwell_auth';

// El valor de la cookie es el SHA-256 de la contrasena: nunca se guarda la contrasena.
export async function passwordToken(password) {
  const data = new TextEncoder().encode(`dwell:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isAuthorized(cookieValue) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password || !cookieValue) return false;
  return cookieValue === (await passwordToken(password));
}

// Token corto para ver el mapa de calor sobre la tienda real (sin cookie).
// Formato: "<expira en ms>.<firma HMAC>"
const OVERLAY_TTL_MS = 2 * 60 * 60 * 1000;

async function hmac(message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`overlay:${process.env.DASHBOARD_PASSWORD}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createOverlayToken() {
  const exp = Date.now() + OVERLAY_TTL_MS;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function isValidOverlayToken(token) {
  if (!process.env.DASHBOARD_PASSWORD || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sig === (await hmac(exp));
}

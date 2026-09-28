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

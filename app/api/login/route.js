import { AUTH_COOKIE, passwordToken } from '@/lib/auth';

export async function POST(request) {
  const form = await request.formData();
  const password = String(form.get('password') || '');
  const expected = process.env.DASHBOARD_PASSWORD;
  const url = new URL(request.url);

  if (!expected || password !== expected) {
    return Response.redirect(new URL('/login?error=1', url), 303);
  }

  const res = Response.redirect(new URL('/', url), 303);
  const headers = new Headers(res.headers);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE}=${await passwordToken(expected)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`,
  );
  return new Response(null, { status: 303, headers });
}

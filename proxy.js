import { NextResponse } from 'next/server';
import { AUTH_COOKIE, isAuthorized } from '@/lib/auth';

// Protege el panel. El script (dwell.js) y /api/collect quedan publicos.
export async function proxy(request) {
  if (await isAuthorized(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = { matcher: ['/'] };

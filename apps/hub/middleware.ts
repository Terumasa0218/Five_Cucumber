import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOW = [
  /^\/setup/,
  /^\/_next\//,
  /^\/assets\//,
  /^\/favicon/,
  /^\/api\//,
  /^\/(robots\.txt|sitemap\.xml)$/,
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ALLOW.some((r) => r.test(pathname))) {
    const res = NextResponse.next();
    res.headers.set('x-profile-gate', 'allow');
    return res;
  }

  const res = NextResponse.next();
  res.headers.set('x-profile-gate', 'disabled');
  return res;
}

export const config = {
  matcher: ['/:path*'],
};

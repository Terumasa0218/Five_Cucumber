import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOW = [
  /^\/home(?:\/|$)/,
  /^\/setup/,
  /^\/_next\//,
  /^\/assets\//,
  /^\/favicon/,
  /^\/api\//,
  /^\/(robots\.txt|sitemap\.xml)$/,
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = NextResponse.next();

  if (process.env.NODE_ENV === 'development') {
    res.headers.set('x-profile-gate', ALLOW.some((r) => r.test(pathname)) ? 'allow' : 'disabled');
  }

  return res;
}

export const config = {
  matcher: ['/:path*'],
};

import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  
  // 公開パス（認証不要）
  const publicPaths = [
    '/_next',
    '/assets',
    '/favicon',
    '/auth',
    '/rules'
  ];
  
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = req.cookies.get('fc_session')?.value ?? null; // 'user' | 'guest' | null

  // 保護パス（認証必須）
  const protectedPaths = ['/home', '/play', '/lobby'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('returnTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // フレンド対戦は user セッション必須
  if (pathname.startsWith('/lobby') && searchParams.get('mode') === 'friends' && session !== 'user') {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('returnTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // フレンド対戦は user セッション必須（/play/friend パターンも対応）
  if (pathname.startsWith('/play') && searchParams.get('mode') === 'friend' && session !== 'user') {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('returnTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};

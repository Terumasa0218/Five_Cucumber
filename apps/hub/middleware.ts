import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  
  // デバッグ用バイパス
  if (request.nextUrl.searchParams.get('devBypass') === '1') {
    return NextResponse.next();
  }
  
  // 許可パス（/setup 以外の全ページをブロック）
  const allowedPaths = [
    '^/setup',
    '^/_next/',
    '^/assets/',
    '^/favicon',
    '^/robots\\.txt',
    '^/sitemap\\.xml',
    '^/api/.*'
  ];
  
  // 許可パスかチェック
  const isAllowed = allowedPaths.some(pattern => {
    const regex = new RegExp(pattern);
    return regex.test(pathname);
  });
  
  if (isAllowed) {
    return NextResponse.next();
  }
  
  // hasProfile Cookieをチェック
  const hasProfile = request.cookies.get('hasProfile')?.value === '1';
  
  if (!hasProfile) {
    // /setup へリダイレクト（returnTo付き）
    const fullURL = request.url;
    const setupURL = new URL('/setup', origin);
    setupURL.searchParams.set('returnTo', fullURL);
    
    return NextResponse.redirect(setupURL);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
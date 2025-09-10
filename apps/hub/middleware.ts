import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  
  // 認証関連ページは通す
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }
  
  // 静的ファイルは通す
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/api/') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // セッション情報を取得（クライアントサイドで判定するため、ここでは基本的なリダイレクトのみ）
  const sessionCookie = request.cookies.get('five-cucumber-session');
  const guestCookie = request.cookies.get('five-cucumber-guest');
  
  // フレンド対戦ページへのアクセス制御
  if (pathname.includes('/lobby/') && search.includes('mode=friends')) {
    // セッション情報がない場合はログインページへリダイレクト
    if (!sessionCookie && !guestCookie) {
      const redirectUrl = `/auth/login?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url), { status: 307 });
    }
  }
  
  // その他のページは通す（クライアントサイドでセッション判定）
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

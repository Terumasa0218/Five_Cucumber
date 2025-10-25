import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOW = [
  /^\/api\/friend\/create$/,
  /^\/setup/,
  /^\/_next\//,
  /^\/assets\//,
  /^\/favicon/,
  /^\/api\//,
  /^\/(robots\.txt|sitemap\.xml)$/
];

export function middleware(req: NextRequest) {
  const { pathname, href } = req.nextUrl;
  
  // 許可パスは素通し（診断ヘッダだけ付与）
  if (ALLOW.some(r => r.test(pathname))) {
    const res = NextResponse.next();
    res.headers.set("x-profile-gate", "allow");
    return res;
  }
  
  const has = req.cookies.get("hasProfile")?.value === "1";

  if (!has) {
    const to = new URL(`/setup?returnTo=${encodeURIComponent(href)}`, req.url);
    const res = NextResponse.redirect(to, 302);
    res.headers.set("x-profile-gate", "required");
    return res;
  }
  
  const res = NextResponse.next();
  res.headers.set("x-profile-gate", "passed");
  return res;
}

export const config = {
  // すべてのパスに適用（/api などは上のALLOWで弾く）
  matcher: ["/:path*"],
};
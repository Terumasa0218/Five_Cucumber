import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function mask(s?: string | null) {
  if (!s) return null;
  if (s.length <= 12) return s;
  return `${s.slice(0, 18)}…${s.slice(-6)}`;
}

export async function GET() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    '';
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    '';
  const host = (() => {
    if (!url) return null;
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();

  let setStatus: number | null = null;
  let getStatus: number | null = null;
  let getBody: unknown = null;
  let error: { msg: string } | null = null;

  if (!url || !token) {
    error = { msg: 'Missing KV REST URL or token in environment' };
  } else {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const r1 = await fetch(`${url}/set/diag:ping/ok`, { headers, cache: 'no-store' });
      setStatus = r1.status;

      const r2 = await fetch(`${url}/get/diag:ping`, { headers, cache: 'no-store' });
      getStatus = r2.status;
      try {
        getBody = await r2.json();
      } catch {
        getBody = await r2.text();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error = { msg };
    }
  }

  return NextResponse.json({
    runtime,
    host,
    urlPreview: mask(url),
    hasToken: Boolean(token),
    setStatus,
    getStatus,
    getBody,
    error,
  });
}



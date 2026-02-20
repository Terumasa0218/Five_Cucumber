import { apiRequest, ApiRequestError } from '@/lib/api';
import type { ApiResponse } from '@/lib/api';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

function mask(s?: string | null) {
  if (!s) return null;
  if (s.length <= 12) return s;
  return `${s.slice(0, 18)}…${s.slice(-6)}`;
}

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };

      const setResponse: ApiResponse<{ result: unknown }> = await apiRequest(`${url}/set/diag:ping/ok`, {
        headers,
      });
      setStatus = setResponse.status;

      const getResponse = await apiRequest<unknown | string>(`${url}/get/diag:ping`, {
        headers,
        parseAs: 'auto',
      });
      getStatus = getResponse.status;
      getBody = getResponse.data;
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setStatus = e.response.status;
        getStatus = e.response.status;
        getBody = e.response.data;
        error = { msg: e.message };
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        error = { msg };
      }
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



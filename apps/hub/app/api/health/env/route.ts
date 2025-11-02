export const runtime = 'nodejs';

type GlobalWithEdgeRuntime = typeof globalThis & { EdgeRuntime?: unknown };

function getRuntime() {
  const edgeAwareGlobal = globalThis as GlobalWithEdgeRuntime;
  return typeof edgeAwareGlobal.EdgeRuntime !== 'undefined' ? 'edge' : 'node';
}

export async function GET(req: Request) {
  const expose = process.env.EXPOSE_ENV_HEALTH === '1';
  const token = process.env.HEALTH_TOKEN || '';
  if (!expose) return new Response('Not found', { status: 404 });
  const auth = req.headers.get('authorization') || '';
  if (token && auth !== `Bearer ${token}`) return new Response('Not found', { status: 404 });

  const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasVercelRedis = !!process.env.REDIS_URL;
  const hasSharedStore = hasKV || hasUpstash || hasVercelRedis;

  const hasAbly = typeof process.env.ABLY_API_KEY === 'string' && process.env.ABLY_API_KEY.length > 10;
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  const branch = process.env.VERCEL_GIT_COMMIT_REF || null;

  return Response.json(
    { hasSharedStore, hasKV, hasUpstash, hasVercelRedis, hasAbly, env, runtime: getRuntime(), branch },
    { status: 200 }
  );
}



export const runtime = 'nodejs';

function getRuntime() {
  // @ts-ignore
  return typeof (globalThis as any).EdgeRuntime !== 'undefined' ? 'edge' : 'node';
}

export async function GET() {
  const hasAbly =
    typeof process.env.ABLY_API_KEY === 'string' &&
    process.env.ABLY_API_KEY.length > 10;

  const hasSharedStore =
    process.env.NEXT_PUBLIC_HAS_SHARED_STORE === '1' ||
    process.env.NEXT_PUBLIC_HAS_SHARED_STORE === 'true';

  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  const branch = process.env.VERCEL_GIT_COMMIT_REF || null;

  return Response.json(
    { hasAbly, hasSharedStore, env, runtime: getRuntime(), branch },
    { status: 200 }
  );
}



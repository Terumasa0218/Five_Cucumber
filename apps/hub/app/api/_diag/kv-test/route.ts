export const runtime = 'nodejs';

import { kvGetJSON, kvSaveJSON } from '@/lib/kv';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const key = `diag:${Date.now()}`;
  await kvSaveJSON(key, { ok: true }, 60);
  const back = await kvGetJSON(key);
  return Response.json({ wrote: !!back, back });
}



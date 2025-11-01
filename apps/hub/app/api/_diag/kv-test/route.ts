export const runtime = 'nodejs';

import { kvGetJSON, kvSaveJSON } from '@/lib/kv';

export async function GET() {
  const key = `diag:${Date.now()}`;
  await kvSaveJSON(key, { ok: true }, 60);
  const back = await kvGetJSON(key);
  return Response.json({ wrote: !!back, back });
}



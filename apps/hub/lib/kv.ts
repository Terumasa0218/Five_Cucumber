// Server-side KV wrapper for Vercel
// Uses @vercel/kv if KV envs are available; otherwise returns null

let kvClient: any = null;

const hasKvEnv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

try {
  if (hasKvEnv) {
    // Lazy require to avoid bundling on client
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@vercel/kv');
    kvClient = mod.kv;
  }
} catch (e) {
  kvClient = null;
}

export const kv = kvClient as {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<any>;
} | null;



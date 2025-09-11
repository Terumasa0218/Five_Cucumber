export interface UsernameStore {
  exists(name: string): Promise<boolean>;
  save(name: string): Promise<void>;
}

class MockStore implements UsernameStore {
  private s = new Set<string>();
  async exists(n: string) { return this.s.has(n); }
  async save(n: string) { this.s.add(n); }
}

class KvStore implements UsernameStore {
  private url = process.env.UPSTASH_REDIS_REST_URL;
  private token = process.env.UPSTASH_REDIS_REST_TOKEN;
  private key = "fc:usernames";
  ok() { return !!(this.url && this.token); }
  async exists(n: string) {
    const r = await fetch(`${this.url}/get/${this.key}:${encodeURIComponent(n)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });
    const j = await r.json();
    return j?.result != null;
  }
  async save(n: string) {
    await fetch(`${this.url}/set/${this.key}:${encodeURIComponent(n)}/${Date.now()}`, {
      headers: { Authorization: `Bearer ${this.token}` },
      cache: "no-store",
    });
  }
}

export function getStore(): UsernameStore & { __type: "mock"|"kv" } {
  const use = process.env.STORE ?? "mock";
  if (use === "kv") {
    const kv = new KvStore();
    if ((kv as any).ok && (kv as any).ok()) return Object.assign(kv, { __type: "kv" as const });
    console.warn("[STORE] kv selected but env missing → fallback to mock");
  }
  return Object.assign(new MockStore(), { __type: "mock" as const });
}

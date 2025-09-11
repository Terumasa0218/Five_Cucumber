/**
 * ユーザー名ストアのインターフェース
 */
export interface UsernameStore {
  exists(name: string): Promise<boolean>;
  save(name: string): Promise<void>;
}

/**
 * Mock実装（プロセス内メモリ）
 */
class MockUsernameStore implements UsernameStore {
  private names = new Set<string>();

  async exists(name: string): Promise<boolean> {
    return this.names.has(name);
  }

  async save(name: string): Promise<void> {
    this.names.add(name);
  }
}

/**
 * Upstash/Vercel KV実装
 */
class KVUsernameStore implements UsernameStore {
  private url: string;
  private token: string;

  constructor() {
    this.url = process.env.UPSTASH_REDIS_REST_URL!;
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    
    if (!this.url || !this.token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
    }
  }

  async exists(name: string): Promise<boolean> {
    const response = await fetch(`${this.url}/get/username:${name}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`KV exists check failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.result !== null;
  }

  async save(name: string): Promise<void> {
    const response = await fetch(`${this.url}/set/username:${name}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: '1',
        ex: 60 * 60 * 24 * 365, // 1年
      }),
    });
    
    if (!response.ok) {
      throw new Error(`KV save failed: ${response.statusText}`);
    }
  }
}

/**
 * Supabase実装
 */
class SupabaseUsernameStore implements UsernameStore {
  private url: string;
  private key: string;

  constructor() {
    this.url = process.env.SUPABASE_URL!;
    this.key = process.env.SUPABASE_ANON_KEY!;
    
    if (!this.url || !this.key) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }
  }

  async exists(name: string): Promise<boolean> {
    const response = await fetch(`${this.url}/rest/v1/usernames?name=eq.${encodeURIComponent(name)}&select=name`, {
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Supabase exists check failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.length > 0;
  }

  async save(name: string): Promise<void> {
    const response = await fetch(`${this.url}/rest/v1/usernames`, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      throw new Error(`Supabase save failed: ${response.statusText}`);
    }
  }
}

/**
 * ストアを取得（環境変数に基づいて選択）
 */
export function getStore(): UsernameStore {
  const storeType = process.env.STORE || 'mock';
  
  switch (storeType) {
    case 'kv':
      return new KVUsernameStore();
    case 'supabase':
      return new SupabaseUsernameStore();
    case 'mock':
    default:
      return new MockUsernameStore();
  }
}

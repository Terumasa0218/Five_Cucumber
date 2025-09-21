export function apiUrl(path: string): string {
  // TEST: force absolute API path
  if (!path) return '/api/ping';
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.startsWith('/api/')) path = '/api' + (path.startsWith('//') ? path.slice(1) : path);
  return path;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const url = apiUrl(path);
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[API ${init?.method ?? 'GET'} ${url}] ${res.status} ${res.statusText} :: ${text}`);
  }
  return (await res.json()) as T;
}



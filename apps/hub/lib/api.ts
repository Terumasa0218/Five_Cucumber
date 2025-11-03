export type ApiParseMode = 'json' | 'text' | 'auto' | 'none';

export type ApiRequestInit = RequestInit & { json?: unknown; parseAs?: ApiParseMode };

export interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
  headers: Headers;
}

export class ApiRequestError<T = unknown> extends Error {
  constructor(
    message: string,
    public readonly response: ApiResponse<T>,
    public readonly method: string,
    public readonly url: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function apiUrl(path: string): string {
  if (!path) return '/api/ping';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.startsWith('/api/')) path = '/api' + (path.startsWith('//') ? path.slice(1) : path);
  return path;
}

export async function apiRequest<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<ApiResponse<T>> {
  const { json, parseAs = 'json', cache, ...rest } = init;
  const url = apiUrl(path);
  const headers = new Headers(rest.headers);
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await globalThis.fetch(url, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: cache ?? 'no-store',
  });
  const method = rest.method ?? 'GET';

  const parseJson = async () => response.clone().json().catch(() => undefined);
  const parseText = async () => response.clone().text().catch(() => '');

  let data: unknown;
  switch (parseAs) {
    case 'none':
      data = undefined;
      break;
    case 'text':
      data = await parseText();
      break;
    case 'auto': {
      const parsedJson = await parseJson();
      data = parsedJson !== undefined ? parsedJson : await parseText();
      break;
    }
    case 'json':
    default:
      data = await parseJson();
      break;
  }

  const result: ApiResponse<T> = {
    data: data as T,
    status: response.status,
    ok: response.ok,
    headers: response.headers,
  };

  if (!response.ok) {
    const message = `[API ${method} ${url}] ${response.status} ${response.statusText}`;
    throw new ApiRequestError<T>(message, result, method, url);
  }

  return result;
}

export async function apiJson<T = unknown>(path: string, init?: ApiRequestInit): Promise<T> {
  const { data } = await apiRequest<T>(path, init ?? {});
  return data;
}



export type ApiParseMode = 'json' | 'text' | 'auto' | 'none';

export type ClientAuthRequestFailure = {
  reason: 'missing-client-token';
  code?: string;
  message?: string;
  detail?: unknown;
};

export type ApiRequestInit = RequestInit & {
  json?: unknown;
  parseAs?: ApiParseMode;
  authRequired?: boolean;
};

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

export class ApiClientAuthError extends Error {
  constructor(
    message: string,
    public readonly failure: ClientAuthRequestFailure,
    public readonly method: string,
    public readonly url: string
  ) {
    super(message);
    this.name = 'ApiClientAuthError';
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

function isProtectedApiPath(url: string): boolean {
  return url.startsWith('/api/friend/');
}

function summarizeClientAuthError(error: unknown): ClientAuthRequestFailure {
  const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const detail = record.detail;
  const detailRecord = detail && typeof detail === 'object' ? (detail as Record<string, unknown>) : {};
  const code =
    typeof detailRecord.code === 'string'
      ? detailRecord.code
      : typeof record.code === 'string'
        ? record.code
        : undefined;
  const message =
    typeof detailRecord.message === 'string'
      ? detailRecord.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : undefined;

  return {
    reason: 'missing-client-token',
    code,
    message,
    detail,
  };
}

export async function apiRequest<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<ApiResponse<T>> {
  const { json, parseAs = 'json', cache, authRequired, ...rest } = init;
  const url = apiUrl(path);
  const method = rest.method ?? 'GET';
  const requiresAuth = authRequired ?? isProtectedApiPath(url);
  const headers = new Headers(rest.headers);
  let clientAuthError: unknown = null;
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    try {
      const { getClientAuthToken } = await import('@/lib/clientAuth');
      const token = await getClientAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (error) {
      clientAuthError = error;
    }
  }
  if (requiresAuth && typeof window !== 'undefined' && !headers.has('Authorization')) {
    const failure = summarizeClientAuthError(clientAuthError);
    throw new ApiClientAuthError(
      `[API ${method} ${url}] Firebase client authentication failed`,
      failure,
      method,
      url
    );
  }
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await globalThis.fetch(url, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: cache ?? 'no-store',
  });

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


export async function fetchJSON(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  
  try {
    const res = await fetch(input, { 
      ...rest, 
      signal: ctrl.signal, 
      cache: "no-store" 
    });
    
    const text = await res.text(); // JSONでない場合に備える
    let json: any = null;
    try { 
      json = text ? JSON.parse(text) : null; 
    } catch {
      // JSON解析失敗時はjson=nullのまま
    }
    
    return { 
      ok: res.ok, 
      status: res.status, 
      json, 
      text,
      headers: Object.fromEntries(res.headers.entries())
    };
  } catch (error) {
    // ネットワークエラーやタイムアウト
    return { 
      ok: false, 
      status: 0, 
      json: null, 
      text: null,
      headers: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    clearTimeout(t);
  }
}

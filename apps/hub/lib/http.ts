export async function fetchJSON(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  
  try {
    console.log('[fetchJSON] Making request to:', input);
    const res = await fetch(input, { 
      ...rest, 
      signal: ctrl.signal, 
      cache: "no-store" 
    });
    console.log('[fetchJSON] Response status:', res.status, 'ok:', res.ok);
    
    const text = await res.text(); // JSONでない場合に備える
    console.log('[fetchJSON] Response text:', text);
    let json: any = null;
    try { 
      json = text ? JSON.parse(text) : null; 
      console.log('[fetchJSON] Parsed JSON:', json);
    } catch (parseError) {
      console.log('[fetchJSON] JSON parse error:', parseError);
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
    console.error('[fetchJSON] Request error:', error);
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

export function getUid(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = localStorage.getItem('uid');
  if (existing) return existing;
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  const generated = typeof cryptoObj?.randomUUID === 'function'
    ? cryptoObj.randomUUID()
    : Math.random().toString(36).slice(2);
  localStorage.setItem('uid', generated);
  return generated;
}



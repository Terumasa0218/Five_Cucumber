export function getUid(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = localStorage.getItem('uid');
  if (existing) return existing;
  const generated: string = (globalThis.crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2);
  localStorage.setItem('uid', generated);
  return generated;
}



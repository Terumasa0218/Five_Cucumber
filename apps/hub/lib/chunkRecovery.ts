export function isChunkLoadError(error: unknown): boolean {
  const text =
    error instanceof Error ? `${error.name} ${error.message} ${error.stack ?? ''}` : String(error);

  return /ChunkLoadError|Loading chunk \d+ failed|CSS_CHUNK_LOAD_FAILED|ERR_CACHE_READ_FAILURE|failed to fetch dynamically imported module|Importing a module script failed/i.test(
    text
  );
}

function getRecoveryKey(scope: string): string {
  return `five-cucumber:chunk-recovery:${scope}`;
}

export function clearChunkLoadRecovery(scope: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(getRecoveryKey(scope));
}

export function recoverChunkLoadErrorOnce(scope: string): boolean {
  if (typeof window === 'undefined') return false;

  const key = getRecoveryKey(scope);
  const attemptId = `${window.location.pathname}${window.location.search}`;
  if (window.sessionStorage.getItem(key) === attemptId) {
    return false;
  }

  window.sessionStorage.setItem(key, attemptId);
  window.setTimeout(() => {
    window.location.reload();
  }, 0);
  return true;
}

export function openCpuPlayClassicView(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('view', 'classic');
  url.searchParams.set('chunkFallback', String(Date.now()));
  window.location.assign(url.toString());
}

// Usage: BASE_URL=https://your-domain node scripts/check-store.mjs
const base = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!base) { console.error('Set BASE_URL'); process.exit(2); }

(async () => {
  try {
    const diagResp = await fetch(base + '/api/diag/shared-store', { cache: 'no-store' });
    if (diagResp.ok) {
      const diag = await diagResp.json();
      console.log('ℹ️  shared-store diag:', {
        hasKV: !!diag.hasKV,
        hasUpstash: !!diag.hasUpstash,
        hasVercelRedisRest: !!diag.hasVercelRedisRest,
        hasRedisTcp: !!diag.hasRedisTcp
      });
    } else {
      console.log('⚠️  shared-store diag failed', diagResp.status);
    }
  } catch (err) {
    console.log('⚠️  shared-store diag request error', err);
  }

  const r = await fetch(base + '/api/friend/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ roomSize: 2, nickname: 'diag', turnSeconds: 15, maxCucumbers: 5 })
  });
  const txt = await r.text();
  if (r.status === 200 || r.status === 201) {
    console.log('✅ friend/create: success', r.status);
    process.exit(0);
  }
  if (r.status === 503 && /no-shared-store/i.test(txt)) {
    console.log('❌ 503 no-shared-store (shared store env not detected at runtime)');
  } else if (r.status === 400) {
    console.log('⚠️ 400 bad request — shared store likely visible');
  } else {
    console.log(`❌ ${r.status}: ${txt.slice(0,200)}`);
  }
  process.exit(1);
})();



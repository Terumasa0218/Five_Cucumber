// Usage: BASE_URL=https://your-domain node scripts/check-ably.mjs
const base = process.env.BASE_URL;
if (!base) {
  console.error('Set BASE_URL, e.g. BASE_URL=https://example.com');
  process.exit(2);
}

function brief(text, max = 180) {
  if (!text) return '';
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  const raw = await res.text();
  let body = raw;
  try { body = JSON.parse(raw); } catch {}
  return { res, body, raw };
}

function diagnoseToken(res, body, raw) {
  const status = res.status;
  const rawStr = typeof body === 'string' ? body : JSON.stringify(body);
  const hasNoAblyKey = /no-ably-key/i.test(rawStr);

  if (status === 200) {
    return [
      '✅ /api/ably/token: 200 OK (token issued)',
      'Server can read ABLY_API_KEY. If client still fails, check NEXT_PUBLIC_HAS_SHARED_STORE=1 and any middleware/auth.'
    ];
  }
  if (status === 401) {
    return [
      '❌ 401 Unauthorized',
      'Likely invalid/rotated Ably key or app mismatch. Verify Key ID in Vercel matches Ably Dashboard.'
    ];
  }
  if (status === 403) {
    return [
      '❌ 403 Forbidden',
      'Ably key capabilities insufficient. Use a key with required capabilities (publish/subscribe/history).'
    ];
  }
  if (status === 429 || status === 402) {
    return [
      `❌ ${status} Rate/Plan limit`,
      'Ably usage limits hit. Check Usage/Quota or plan.'
    ];
  }
  if (status === 500 && hasNoAblyKey) {
    return [
      '❌ 500 with "no-ably-key"',
      'Runtime cannot see ABLY_API_KEY. Set in Vercel Production and redeploy.'
    ];
  }
  return [
    `❌ Unexpected status ${status}`,
    `Body: ${brief(raw)}`
  ];
}

(async () => {
  const norm = base.replace(/\/$/, '');
  const tokenUrl = `${norm}/api/ably/token`;
  console.log(`→ Checking ${tokenUrl}`);
  const { res, body, raw } = await fetchJson(tokenUrl);
  diagnoseToken(res, body, raw).forEach((l) => console.log(l));

  const healthUrl = `${norm}/api/health/env`;
  try {
    const h = await fetchJson(healthUrl);
    const b = typeof h.body === 'string' ? {} : h.body;
    console.log('\n→ Health:', healthUrl);
    console.log(`hasAbly=${b.hasAbly} hasSharedStore=${b.hasSharedStore} env=${b.env} runtime=${b.runtime} branch=${b.branch || 'n/a'}`);
  } catch {
    console.log('\n(health endpoint not found)');
  }

  process.exit(res.status === 200 ? 0 : 1);
})();



// Shared helpers for the /api functions. The underscore prefix keeps Vercel from
// exposing this file as a route.

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dbConfigured = () => Boolean(SB_URL && SB_KEY);

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

// Per-instance, so best-effort — same trade-off as /api/ai.
export function rateLimiter(perMinute) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
    list.push(now);
    hits.set(key, list);
    if (hits.size > 10_000) hits.clear();
    return list.length > perMinute;
  };
}

export function allowlist(envValue) {
  return String(envValue || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function sendJson(res, status, obj) {
  res.status(status);
  res.setHeader('content-type', 'application/json');
  res.send(JSON.stringify(obj));
}

export const iso = (ms) => new Date(ms).toISOString();

// Supabase REST (PostgREST). The apikey header alone works for both the new
// sb_secret_ keys and the legacy service_role JWT.
function sbHeaders(extra = {}) {
  const h = { apikey: SB_KEY, 'content-type': 'application/json', ...extra };
  if (!SB_KEY.startsWith('sb_')) h.authorization = `Bearer ${SB_KEY}`;
  return h;
}

export async function dbSelect(table, params) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${new URLSearchParams(params)}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`select ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function dbInsert(table, row) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ prefer: 'return=minimal' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`insert ${table}: ${r.status} ${await r.text()}`);
}

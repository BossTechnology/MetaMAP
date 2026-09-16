// Proxies BOBee's requests to BOb's existing public AI endpoint
// (BossTechnology/Bob-New: app/api/ai/route.ts). That route is an
// intentionally unauthenticated Claude proxy hardened with a model
// allowlist + its own per-IP rate limit — built for reuse like this.
// It expects { model, messages, max_tokens } and returns the raw
// Anthropic Messages response, which engine.html's adapter already
// understands (content: [{ type: 'text', text }]).

const UPSTREAM = process.env.BOB_AI_UPSTREAM_URL || 'https://bob.bzzzbx.com/api/ai';
const MODEL = process.env.BOB_AI_MODEL || 'claude-haiku-4-5-20251001'; // must be in Bob-New's ALLOWED_MODELS

const PER_MINUTE = 12;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > PER_MINUTE;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) {
    res.status(429).send('Too many requests');
    return;
  }

  const messages = Array.isArray(req.body?.messages) && req.body.messages.length
    ? req.body.messages
    : [{ role: 'user', content: String(req.body?.prompt || req.body?.message || '') }];

  const payload = {
    model: MODEL,
    messages,
    max_tokens: Math.min(Number(req.body?.max_tokens) || 900, 2048),
  };

  let upstreamRes;
  try {
    upstreamRes = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': ip,
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    res.status(502).send('AI endpoint unreachable');
    return;
  }

  const contentType = upstreamRes.headers.get('content-type') || 'application/json';
  const text = await upstreamRes.text();
  res.status(upstreamRes.status);
  res.setHeader('content-type', contentType);
  res.send(text);
}

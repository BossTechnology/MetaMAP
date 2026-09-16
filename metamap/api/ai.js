// Proxies BOBee's requests to BOb's existing AI service.
// BOB_AI_UPSTREAM_URL is a Vercel project env var — until it's set, this
// responds 503 so the front-end shows "AI service is not connected yet"
// and still serves its locally generated insights (see README-deploy.md).

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

  const upstream = process.env.BOB_AI_UPSTREAM_URL;
  if (!upstream) {
    res.status(503).send('AI not configured');
    return;
  }

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) {
    res.status(429).send('Too many requests');
    return;
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstream, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': ip,
        'x-forwarded-for': ip,
        'x-engine': 'metamap',
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    res.status(502).send('AI endpoint unreachable');
    return;
  }

  const contentType = upstreamRes.headers.get('content-type') || 'text/plain';
  const text = await upstreamRes.text();
  res.status(upstreamRes.status);
  res.setHeader('content-type', contentType);
  res.send(text);
}

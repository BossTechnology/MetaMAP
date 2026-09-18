// National-emergency SMS via Twilio — same contract as the vendor's metamap-sms
// Edge Function (server/COMMUNICATIONS-IMPLEMENTATION.md §3), served same-origin.
//
//   POST { op: "send", to, body, kind, emergencyId }  → { ok, sid, status } | { error }
//   POST { op: "replies", emergencyId }               → { replies: [{ from, body, at }] }

import { allowlist, clientIp, dbConfigured, dbInsert, dbSelect, iso, rateLimiter, sendJson } from './_lib.js';

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM;
const ALLOWED = allowlist(process.env.SMS_ALLOWED_NUMBERS);
const DAILY_LIMIT = Number(process.env.SMS_DAILY_LIMIT) || 200;

const KINDS = new Set(['alert', 'welfare', 'remind', 'ack']);
const DELIVERED = 'not.in.(failed,suppressed)';
const COOLDOWN_MS = 10 * 60_000;
const ANCHOR_WINDOW_MS = 24 * 3600_000;
const limited = rateLimiter(120);

// Entries are full E.164 numbers or prefixes ending in "*", e.g. "+51*" for all of Peru.
const allowed = (n) => ALLOWED.some((e) => (e.endsWith('*') ? n.startsWith(e.slice(0, -1)) : n === e));

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
  if (!SID || !TOKEN || !FROM || !dbConfigured()) return sendJson(res, 503, { error: 'SMS is not configured on this server' });
  if (limited(clientIp(req))) return sendJson(res, 429, { error: 'too many requests' });

  const p = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    if (p.op === 'replies') return sendJson(res, 200, { replies: await repliesFor(String(p.emergencyId || '')) });
    return await send(p, res);
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: 'SMS service error' });
  }
}

async function send(p, res) {
  const to = String(p.to || '');
  const body = String(p.body || '');
  const kind = KINDS.has(p.kind) ? p.kind : 'alert';
  const eid = String(p.emergencyId || '').slice(0, 64);

  if (!/^\+[1-9]\d{6,15}$/.test(to)) return sendJson(res, 400, { error: 'recipient must be E.164, e.g. +51987654321' });
  if (!body || body.length > 480) return sendJson(res, 400, { error: 'body missing or too long' });
  // Every message is a drill. Refuse anything that does not say so.
  if (!/SIMULACRO|DRILL/i.test(body)) return sendJson(res, 400, { error: 'body must be marked as a drill' });
  if (!allowed(to)) return sendJson(res, 403, { error: 'recipient is not allowed by SMS_ALLOWED_NUMBERS' });

  const row = { emergency_id: eid, to_number: to, kind, body };
  if (await isRepeat(to, kind)) {
    await dbInsert('metamap_sms_sent', { ...row, status: 'suppressed' });
    return sendJson(res, 200, { ok: true, suppressed: true });
  }
  // Recipients are open to whole countries, so a hard daily ceiling bounds the cost of abuse.
  const today = await dbSelect('metamap_sms_sent', [
    ['select', 'id'], ['status', DELIVERED], ['created_at', `gt.${iso(Date.now() - 86_400_000)}`], ['limit', String(DAILY_LIMIT)],
  ]);
  if (today.length >= DAILY_LIMIT) return sendJson(res, 429, { error: 'daily SMS limit reached' });

  const tw = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64'),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: FROM, Body: body }),
  });
  const result = await tw.json().catch(() => ({}));
  await dbInsert('metamap_sms_sent', {
    ...row,
    twilio_sid: result.sid ?? null,
    status: tw.ok ? (result.status ?? 'queued') : 'failed',
    error: tw.ok ? null : JSON.stringify(result).slice(0, 500),
  });
  if (!tw.ok) return sendJson(res, 502, { error: result.message || 'Twilio rejected the message' });
  return sendJson(res, 200, { ok: true, sid: result.sid, status: result.status });
}

// engine.html resends in two situations: every Apply Config re-fires an armed alert, and
// an unclear reply is re-processed on each 15 s poll, which re-asks the welfare question.
// So a number gets each kind at most once per cooldown and, except the alert itself, at
// most once per reply it sends back.
async function isRepeat(to, kind) {
  let since = Date.now() - COOLDOWN_MS;
  if (kind !== 'alert') {
    const [last] = await dbSelect('metamap_sms_replies', {
      select: 'received_at', from_number: `eq.${to}`, order: 'received_at.desc', limit: '1',
    });
    if (last) since = Math.max(since, Date.parse(last.received_at));
  }
  const prior = await dbSelect('metamap_sms_sent', [
    ['select', 'id'], ['to_number', `eq.${to}`], ['kind', `eq.${kind}`],
    ['status', DELIVERED], ['created_at', `gt.${iso(since)}`], ['limit', '1'],
  ]);
  return prior.length > 0;
}

// Emergency ids restart at NE-001 on every page load, so matching on the id alone would
// return replies from earlier drills. Each number is anchored to the last alert it
// actually received; only replies after that count.
async function repliesFor(eid) {
  if (!eid) return [];
  const windowStart = iso(Date.now() - ANCHOR_WINDOW_MS);
  const rows = await dbSelect('metamap_sms_sent', [
    ['select', 'to_number'], ['emergency_id', `eq.${eid}`], ['created_at', `gt.${windowStart}`],
  ]);
  const numbers = [...new Set(rows.map((r) => r.to_number))];
  if (!numbers.length) return [];
  const inNumbers = `in.(${numbers.map((n) => `"${n}"`).join(',')})`;

  const alerts = await dbSelect('metamap_sms_sent', [
    ['select', 'to_number,created_at'], ['to_number', inNumbers], ['kind', 'eq.alert'],
    ['status', DELIVERED], ['created_at', `gt.${windowStart}`], ['order', 'created_at.desc'],
  ]);
  const anchor = new Map();
  for (const a of alerts) if (!anchor.has(a.to_number)) anchor.set(a.to_number, Date.parse(a.created_at));
  if (!anchor.size) return [];

  const replies = await dbSelect('metamap_sms_replies', [
    ['select', 'from_number,body,received_at'], ['from_number', inNumbers],
    ['received_at', `gt.${iso(Math.min(...anchor.values()))}`], ['order', 'received_at.asc'],
  ]);
  return replies
    .filter((r) => anchor.has(r.from_number) && Date.parse(r.received_at) > anchor.get(r.from_number))
    .map((r) => ({ from: r.from_number, body: r.body, at: r.received_at }));
}

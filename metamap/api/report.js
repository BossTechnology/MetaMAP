// Daily report by email via Resend — same contract as the vendor's metamap-report Edge
// Function (server/COMMUNICATIONS-IMPLEMENTATION.md §3), served same-origin.
//
//   POST { op: "send", to: string[], subject, message, filename, pdfBase64 } → { ok, id } | { error }
//
// REPORT_FROM must be on a domain verified in Resend, or ministry mail servers silently
// drop the message.

import { allowlist, clientIp, dbConfigured, dbInsert, dbSelect, iso, rateLimiter, sendJson } from './_lib.js';

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.REPORT_FROM;
const ALLOWED = allowlist(process.env.REPORT_ALLOWED_RECIPIENTS);
const DAILY_LIMIT = Number(process.env.REPORT_DAILY_LIMIT) || 50;

const COOLDOWN_MS = 10 * 60_000;
const MAX_B64 = 12_000_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const limited = rateLimiter(10);

// Entries are full addresses or "@domain" for a whole domain.
const allowed = (addr) => ALLOWED.some((e) => (e.startsWith('@') ? addr.endsWith(e) : addr === e));

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
  if (!KEY || !FROM || !dbConfigured()) return sendJson(res, 503, { error: 'email is not configured on this server' });
  if (limited(clientIp(req))) return sendJson(res, 429, { error: 'too many requests' });

  const p = req.body && typeof req.body === 'object' ? req.body : {};
  const to = Array.isArray(p.to) ? [...new Set(p.to.map((a) => String(a).trim().toLowerCase()).filter(Boolean))] : [];
  const subject = String(p.subject ?? '').trim().slice(0, 200);
  const message = String(p.message ?? '').trim().slice(0, 5000);
  const filename = String(p.filename || 'resumen-diario.pdf').replace(/[^\w.\-]/g, '_').slice(0, 120);
  const b64 = String(p.pdfBase64 ?? '');

  if (!to.length) return sendJson(res, 400, { error: 'no recipients' });
  if (to.length > 20) return sendJson(res, 400, { error: 'too many recipients' });
  if (to.some((a) => !EMAIL.test(a))) return sendJson(res, 400, { error: 'a recipient address is not valid' });
  if (to.some((a) => !allowed(a))) return sendJson(res, 403, { error: 'a recipient is not in REPORT_ALLOWED_RECIPIENTS' });
  if (!subject) return sendJson(res, 400, { error: 'subject missing' });
  if (!b64) return sendJson(res, 400, { error: 'pdf missing' });
  if (b64.length > MAX_B64) return sendJson(res, 413, { error: 'pdf too large' });
  // Only the report PDF goes out — not an arbitrary attachment.
  if (Buffer.from(b64.slice(0, 16), 'base64').toString('latin1').slice(0, 5) !== '%PDF-') {
    return sendJson(res, 400, { error: 'attachment is not a PDF' });
  }

  const recipients = [...to].sort().join(',');
  try {
    // Every Apply Config in engine.html re-sends an armed report; send it once per cooldown.
    const prior = await dbSelect('metamap_report_sent', [
      ['select', 'id'], ['recipients', `eq.${recipients}`], ['subject', `eq.${subject}`],
      ['status', 'eq.sent'], ['created_at', `gt.${iso(Date.now() - COOLDOWN_MS)}`], ['limit', '1'],
    ]);
    if (prior.length) {
      await dbInsert('metamap_report_sent', { recipients, subject, status: 'suppressed' });
      return sendJson(res, 200, { ok: true, suppressed: true });
    }
    // Recipients are open to whole domains, so a hard daily ceiling bounds abuse.
    const today = await dbSelect('metamap_report_sent', [
      ['select', 'id'], ['status', 'eq.sent'], ['created_at', `gt.${iso(Date.now() - 86_400_000)}`], ['limit', String(DAILY_LIMIT)],
    ]);
    if (today.length >= DAILY_LIMIT) return sendJson(res, 429, { error: 'daily report limit reached' });

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to, subject,
        text: message, html: toHtml(message),
        attachments: [{ filename, content: b64 }],
      }),
    });
    const out = await r.json().catch(() => ({}));
    await dbInsert('metamap_report_sent', {
      recipients, subject,
      resend_id: out.id ?? null,
      status: r.ok ? 'sent' : 'failed',
      error: r.ok ? null : JSON.stringify(out).slice(0, 500),
    });
    if (!r.ok) return sendJson(res, 502, { error: out.message || 'Resend rejected the message' });
    return sendJson(res, 200, { ok: true, id: out.id });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: 'email service error' });
  }
}

function toHtml(message) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<div style="font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">
      ${message.split('\n').map((l) => `<p style="margin:0 0 10px">${esc(l)}</p>`).join('')}
      <p style="margin:18px 0 0;font-size:12px;color:#6b6b6b">MetaMAP · Boss.Technology</p>
    </div>`;
}

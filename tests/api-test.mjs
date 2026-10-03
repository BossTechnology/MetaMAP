// Tests for metamap/api/*. Supabase, Twilio and Resend are replaced by in-memory fakes,
// so nothing is sent and no key is needed. Run: node tests/api-test.mjs

import crypto from 'node:crypto';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x',
  TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'tok123', TWILIO_FROM: '+15550001111',
  SMS_ALLOWED_NUMBERS: '+51900000001,+57*',
  TWILIO_WEBHOOK_URL: 'https://metamap.bzzzbx.com/api/sms-inbound',
  TWILIO_STATUS_CALLBACK_URL: 'https://metamap.bzzzbx.com/api/sms-status',
  RESEND_API_KEY: 're_test', REPORT_FROM: 'COES <coes@bzzzbx.com>',
  REPORT_ALLOWED_RECIPIENTS: '@mimp.gob.pe',
});

// ── in-memory PostgREST ────────────────────────────────────────────────────
const DB = { metamap_sms_sent: [], metamap_sms_replies: [], metamap_report_sent: [] };
let seq = 0; const twilioCalls = []; const resendCalls = []; let twilioFail = false;
const tsCol = (t) => (t === 'metamap_sms_replies' ? 'received_at' : 'created_at');
const parseList = (v) => v.slice(v.indexOf('(') + 1, -1).split(',').map((x) => x.replace(/^"|"$/g, ''));
function match(row, col, f) {
  const v = row[col];
  if (f.startsWith('eq.')) return String(v) === f.slice(3);
  if (f.startsWith('gt.')) return Date.parse(v) > Date.parse(f.slice(3));
  if (f.startsWith('in.')) return parseList(f).includes(v);
  if (f.startsWith('not.in.')) return !parseList(f.slice(4)).includes(v);
  throw new Error('unsupported filter ' + f);
}
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  const ok = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
  if (u.host === 'sb.test') {
    const table = u.pathname.split('/').pop();
    const filters = [...u.searchParams].filter(([k]) => !['order', 'limit', 'select'].includes(k));
    if (init.method === 'POST') {
      DB[table].push({ id: ++seq, [tsCol(table)]: new Date().toISOString(), ...JSON.parse(init.body) });
      return new Response(null, { status: 201 });
    }
    if (init.method === 'PATCH') {
      const patch = JSON.parse(init.body);
      DB[table].filter((r) => filters.every(([k, v]) => match(r, k, v))).forEach((r) => Object.assign(r, patch));
      return new Response(null, { status: 204 });
    }
    let rows = DB[table].filter((r) => filters.every(([k, v]) => match(r, k, v)));
    const order = u.searchParams.get('order'); const limit = u.searchParams.get('limit');
    const select = (u.searchParams.get('select') || '').split(',');
    if (order) { const [c, d] = order.split('.'); rows = [...rows].sort((a, b) => (a[c] < b[c] ? -1 : 1) * (d === 'desc' ? -1 : 1)); }
    if (limit) rows = rows.slice(0, +limit);
    return ok(rows.map((r) => Object.fromEntries(select.map((c) => [c, r[c]]))));
  }
  if (u.host === 'api.twilio.com') {
    const f = Object.fromEntries(new URLSearchParams(init.body)); twilioCalls.push(f);
    return twilioFail ? ok({ message: 'The number is unverified' }, 400) : ok({ sid: 'SM' + twilioCalls.length, status: 'queued' });
  }
  if (u.host === 'api.resend.com') { resendCalls.push(JSON.parse(init.body)); return ok({ id: 're_' + (resendCalls.length) }); }
  throw new Error('unexpected fetch ' + url);
};

const sms = (await import('../metamap/api/sms.js')).default;
const inbound = (await import('../metamap/api/sms-inbound.js')).default;
const status = (await import('../metamap/api/sms-status.js')).default;
const report = (await import('../metamap/api/report.js')).default;

let ipn = 0;
async function call(handler, body, { headers = {}, method = 'POST', url = '/api/x' } = {}) {
  await new Promise((z) => setTimeout(z, 3)); // distinct timestamps per request
  const res = { code: 0, out: '', status(c) { this.code = c; return this; }, setHeader() {}, send(b) { this.out = b ?? ''; return this; } };
  await handler({ method, body, url, headers: { 'x-forwarded-for': `10.0.0.${++ipn % 250}`, ...headers }, socket: {} }, res);
  let json; try { json = JSON.parse(res.out); } catch {}
  return { code: res.code, json, out: res.out };
}
function signed(handler, params, url, sig) {
  const data = Object.keys(params).sort().reduce((a, k) => a + k + params[k], url);
  const good = crypto.createHmac('sha1', 'tok123').update(data).digest('base64');
  return call(handler, params, { headers: { 'x-twilio-signature': sig ?? good } });
}
const GSM7 = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€';
const isGsm7 = (s) => [...s].every((c) => GSM7.includes(c));
const drill = 'SIMULACRO MetaMAP. Prueba.';
const A = '+51900000001';
const STATUS_URL = process.env.TWILIO_STATUS_CALLBACK_URL;
let n = 0; const ok = (m) => console.log(`  ✓ ${++n}. ${m}`);

console.log('Sending');
let r = await call(sms, { op: 'send', to: A, body: drill, kind: 'alert', emergencyId: 'NE-001' });
assert.deepEqual([r.code, r.json.sid], [200, 'SM1']); ok('alert sent');
assert.equal(twilioCalls[0].StatusCallback, STATUS_URL); ok('the Twilio request carries the StatusCallback URL');
assert.equal(DB.metamap_sms_sent[0].status, 'queued'); ok('the row starts as queued');
assert.equal((await call(sms, { op: 'send', to: '+584121112233', body: drill })).code, 403); ok('a country outside the allowlist is refused');
assert.equal((await call(sms, { op: 'send', to: A, body: 'sin marca', kind: 'alert' })).code, 400); ok('a message without SIMULACRO is refused');
assert.equal((await call(sms, { op: 'send', to: A, body: drill, kind: 'alert', emergencyId: 'NE-002' })).json.suppressed, true); ok('an alert re-fired by Apply Config is suppressed');

console.log('GSM-7 encoding');
await call(sms, { op: 'send', to: '+573001112233', body: 'SIMULACRO MetaMAP — ¿Estás bien? Año, café, Ñuñoa.', kind: 'alert', emergencyId: 'NE-enc' });
const sentBody = twilioCalls.at(-1).Body;
// é, ñ and ¿ are part of GSM-7, so they survive; á, í, ó, ú are not and fold to ASCII.
assert.equal(sentBody, 'SIMULACRO MetaMAP - ¿Estas bien? Año, café, Ñuñoa.');
assert.ok(isGsm7(sentBody) && sentBody.length <= 160); ok('á folded, ñ/é/¿ kept, one GSM-7 segment');
assert.equal(twilioCalls.at(-1).SmartEncoded, 'true'); ok('SmartEncoded asked of Twilio as well');
assert.equal(DB.metamap_sms_sent.at(-1).body, sentBody); ok('the stored body is what was actually sent');

console.log('Delivery receipts');
assert.equal((await call(status, {}, { method: 'GET' })).code, 405); ok('GET refused');
assert.equal((await signed(status, { MessageSid: 'SM1', MessageStatus: 'delivered' }, STATUS_URL, 'bogus')).code, 403); ok('an unsigned receipt is refused');
assert.equal((await signed(status, { MessageSid: 'SM1', MessageStatus: 'delivered' }, STATUS_URL)).code, 204);
assert.equal(DB.metamap_sms_sent[0].status, 'delivered'); ok('a delivered receipt updates the row');
await signed(status, { MessageSid: 'SM1', MessageStatus: 'undelivered', ErrorCode: '30007' }, STATUS_URL);
assert.deepEqual([DB.metamap_sms_sent[0].status, DB.metamap_sms_sent[0].error], ['undelivered', 'Twilio 30007']); ok('a carrier rejection is recorded with its code');

console.log('Inbound replies');
assert.equal((await signed(inbound, { From: A, Body: 'SI' }, process.env.TWILIO_WEBHOOK_URL, 'bogus')).code, 403); ok('an unsigned reply is refused');
r = await signed(inbound, { From: A, Body: 'SI', MessageSid: 'SMin' }, process.env.TWILIO_WEBHOOK_URL);
assert.equal(r.code, 200); assert.match(r.out, /<Response\/>/); ok('a signed reply is accepted with empty TwiML');
assert.deepEqual((await call(sms, { op: 'replies', emergencyId: 'NE-001' })).json.replies.map((x) => x.body), ['SI']);
ok('replies are anchored to the alert the number actually received');

console.log('Twilio failure');
twilioFail = true;
r = await call(sms, { op: 'send', to: '+573001112299', body: drill, kind: 'alert', emergencyId: 'NE-003' });
assert.deepEqual([r.code, r.json.error], [502, 'The number is unverified']); ok('a Twilio rejection surfaces as 502');
twilioFail = false;

console.log('Report');
const pdf = Buffer.from('%PDF-1.3\n' + 'x'.repeat(200)).toString('base64');
const rep = { op: 'send', to: ['coes@mimp.gob.pe'], subject: 'Resumen Diario', message: 'Datos simulados.', filename: 'r.pdf', pdfBase64: pdf };
assert.equal((await call(report, { ...rep, to: ['x@gmail.com'] })).code, 403); ok('a recipient outside the allowlist is refused');
assert.equal((await call(report, { ...rep, pdfBase64: Buffer.from('MZ not a pdf').toString('base64') })).code, 400); ok('a non-PDF attachment is refused');
assert.equal((await call(report, rep)).json.id, 're_1'); ok('the report goes out through Resend');
assert.equal((await call(report, rep)).json.suppressed, true); ok('the same report re-sent by Apply Config is suppressed');

console.log(`\nAll ${n} checks passed.`);

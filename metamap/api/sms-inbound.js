// Twilio → MetaMAP. Set as the "A MESSAGE COMES IN" webhook (HTTP POST) on the Twilio
// number: https://metamap.bzzzbx.com/api/sms-inbound
// Twilio signs every request; unsigned or mis-signed posts are refused so nobody can
// fake a "SI" on someone's behalf.

import crypto from 'node:crypto';
import { dbConfigured, dbInsert, dbSelect } from './_lib.js';

const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('method not allowed');
  if (!TOKEN || !dbConfigured()) return res.status(503).send('not configured');

  const params = req.body && typeof req.body === 'object' ? req.body : {};
  if (!validSignature(req, params)) return res.status(403).send('invalid signature');

  const from = String(params.From || '');
  const body = String(params.Body || '').trim().slice(0, 480);
  if (from) {
    const [last] = await dbSelect('metamap_sms_sent', {
      select: 'emergency_id', to_number: `eq.${from}`, order: 'created_at.desc', limit: '1',
    });
    await dbInsert('metamap_sms_replies', { emergency_id: last?.emergency_id ?? '', from_number: from, body });
  }

  // MetaMAP sends the acknowledgement itself, so stay quiet here.
  res.setHeader('content-type', 'text/xml');
  return res.status(200).send(EMPTY_TWIML);
}

// https://www.twilio.com/docs/usage/webhooks/webhooks-security — HMAC-SHA1 over the full
// webhook URL followed by every POST parameter name+value, sorted by name.
function validSignature(req, params) {
  const url = process.env.TWILIO_WEBHOOK_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}${req.url}`;
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  const expected = Buffer.from(crypto.createHmac('sha1', TOKEN).update(data, 'utf8').digest('base64'));
  const given = Buffer.from(String(req.headers['x-twilio-signature'] || ''));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

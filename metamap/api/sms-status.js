// Twilio delivery receipts. /api/sms passes this URL as StatusCallback, so Twilio reports
// each message's fate here and metamap_sms_sent stops saying "queued" forever.
// COMMUNICATIONS-IMPLEMENTATION.md §5 lists this as the missing piece.
//
// Twilio posts MessageSid, MessageStatus (queued · sent · delivered · undelivered · failed)
// and, when it failed, ErrorCode — e.g. 30007 carrier filtering, 30008 unknown error,
// 21408 the destination country is not enabled in Geo permissions.

import { dbConfigured, dbUpdate, twilioSignatureValid } from './_lib.js';

const URL_FOR_SIGNATURE = process.env.TWILIO_STATUS_CALLBACK_URL || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('method not allowed');
  if (!dbConfigured() || !URL_FOR_SIGNATURE) return res.status(503).send('not configured');

  const params = req.body && typeof req.body === 'object' ? req.body : {};
  if (!twilioSignatureValid(req, params, URL_FOR_SIGNATURE)) return res.status(403).send('invalid signature');

  const sid = String(params.MessageSid || params.SmsSid || '');
  const status = String(params.MessageStatus || params.SmsStatus || '').slice(0, 40);
  const code = String(params.ErrorCode || '').slice(0, 20);
  if (sid && status) {
    // Logged so the outcome is readable in `vercel logs` too, not only in the table.
    // The recipient's number is deliberately not logged.
    console.log(`sms-status ${sid} ${status}${code ? ' error ' + code : ''}`);
    await dbUpdate('metamap_sms_sent', { twilio_sid: `eq.${sid}` }, {
      status,
      error: code ? `Twilio ${code}` : null,
    });
  }
  return res.status(204).send('');
}

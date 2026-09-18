# MetaMAP communications — implementation guide

Two outbound channels, one Supabase project:

| Channel | Function | Provider | What it sends |
|---|---|---|---|
| National-emergency alert | `metamap-sms` + `metamap-sms-inbound` | Twilio | Alert, welfare check, reminder, acknowledgement — and records replies |
| Daily report | `metamap-report` | Resend | The Resumen Diario as a PDF attachment |

MetaMAP works without either. With no endpoint configured it simulates: messages are faked with
realistic replies, and the report downloads locally while the panel shows who it would have gone
to. That is how demos run on a laptop. Follow this guide when you want real delivery.

---

## 1. What the operator sees

Both live in the sidebar (hamburger menu) and both arm on **Apply Config**.

### National emergency alert

| Control | Meaning |
|---|---|
| Scenario | which emergency is declared |
| Off · On · Repeat | On arms the alert |
| Start now … in 10 min | delay before it fires, in real minutes |
| Country + phone number + Add | recipients, stored as E.164 (`+51987654321`) |
| SMS endpoint URL | your deployed `metamap-sms`; blank means simulate |

Nothing appears on screen while the timer runs — deliberately, so a demo stays a surprise.
Cancel from the same menu. When it fires:

| When | Message | Kind |
|---|---|---|
| T+0 | the emergency has been declared | `alert` |
| T+1 min | are you safe — reply `SI` / `Y`, or `NO` / `N` | `welfare` |
| T+3 min | to anyone who has not answered | `remind` |
| on reply | recorded as safe, or a coordinator notified | `ack` |

`SI`, `SÍ`, `S`, `Y`, `YES`, `OK`, `BIEN`, `ESTOY BIEN` count as safe; `NO`, `N`, `AYUDA`, `HELP`
as needing help; anything else is treated as unclear and the question is repeated. Who was
messaged, who replied and who never answered appears under **Response → Confirmations** in the
national emergency panel, and on the last page of the daily report.

**Every SMS is marked as a drill** — `SIMULACRO MetaMAP — no es una emergencia real`. The send
function rejects any message that is not. Do not remove this: a phone alert that reads like a
real ministry emergency, delivered by a countdown timer during a demo, is the one part of this
system that can do real harm. Use your own team's numbers; Twilio requires consent and an
opt-out path for anything beyond that.

### Daily report by email

| Control | Meaning |
|---|---|
| Off · On | On arms the send |
| Start now … in 10 min | delay after Apply Config |
| Subject | defaults to `Resumen Diario — COES MIMP — 18 de setiembre de 2026` |
| Message | short covering note, first line marks it as MetaMAP-generated simulated data |
| Email address + Add | recipients |
| Report endpoint URL | your deployed `metamap-report`; blank means simulate |

The PDF is the eight-page Resumen Diario built from the current timeframe and filters, in the
profile's language. The covering message carries the simulation notice; the PDF itself stays
clean so it looks like their own boletín.

### Branding

Under **Branding** in the same menu you can upload the crest, the cover photograph, the COES
lockup and a source logo. They are stored with the profile, so they travel with the downloaded
profile JSON and appear in every future report. Uploads are re-encoded to bounded JPEG through
a canvas before storage — jsPDF's PNG decoder is slow and rejects some valid files.

---

## 2. Deploy

### 2.1 Database (SMS only)

Run `supabase/schema.sql`. It creates `metamap_sms_sent` and `metamap_sms_replies`, both with
RLS on and no policies, so only the service role can touch them. The report function stores
nothing.

### 2.2 Secrets

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxxxxxx \
  TWILIO_AUTH_TOKEN=xxxxxxxx \
  TWILIO_FROM=+15550001111 \
  RESEND_API_KEY=re_xxxxxxxx \
  REPORT_FROM="COES MetaMAP <coes@your-verified-domain.pe>" \
  ALLOWED_ORIGIN=https://metamap.bzzzbx.com
```

`ALLOWED_ORIGIN` is the origin MetaMAP is served from — set it exactly; a wildcard would let any
page in the world spend your Twilio and Resend balances. `REPORT_FROM` **must** be on a domain
verified in Resend, otherwise ministry inboxes will silently discard the mail.

### 2.3 Functions

```bash
supabase functions deploy metamap-sms
supabase functions deploy metamap-sms-inbound --no-verify-jwt
supabase functions deploy metamap-report
```

`metamap-sms-inbound` must skip JWT verification; Twilio cannot present one.

### 2.4 Twilio number

Console → your number → **A MESSAGE COMES IN** → HTTP POST to:

```
https://<project-ref>.functions.supabase.co/metamap-sms-inbound
```

### 2.5 Point MetaMAP at both

```
SMS endpoint     https://<project-ref>.functions.supabase.co/metamap-sms
Report endpoint  https://<project-ref>.functions.supabase.co/metamap-report
```

---

## 3. The contracts

MetaMAP only ever POSTs JSON.

### metamap-sms

```json
{ "op": "send", "to": "+51987654321", "body": "SIMULACRO MetaMAP — …",
  "kind": "alert", "emergencyId": "NE-001" }
```
→ `200 {"ok":true,"sid":"SM…","status":"queued"}` or non-2xx `{"error":"…"}`.

Replies are polled every 15 s while an alert is live:

```json
{ "op": "replies", "emergencyId": "NE-001" }
```
→ `{ "replies": [ { "from": "+51987654321", "body": "SI", "at": "2026-09-17T23:05:11Z" } ] }`

Returning a reply twice is harmless; MetaMAP ignores repeats from someone who already answered.

### metamap-report

```json
{ "op": "send", "to": ["coes@mimp.gob.pe"],
  "subject": "Resumen Diario — COES MIMP — 18 de setiembre de 2026",
  "message": "Generado por MetaMAP — datos simulados.\n\nSe adjunta…",
  "filename": "Resumen_Diario_COES_MIMP_2026-09-18.pdf",
  "pdfBase64": "JVBERi0xLjMK…" }
```
→ `200 {"ok":true,"id":"…"}` or non-2xx `{"error":"…"}`.

A typical deck is around 500 KB, roughly 680 KB base64 — well inside the 12 MB the function
accepts and Resend's own 40 MB limit.

Whatever error text you return is shown to the operator, so return something a person can read.

---

## 4. Checking it works

**SMS**

1. Leave the endpoint blank, add a number, **On** + **Start now**, Apply Config. The panel should
   fill with simulated sends and replies within a minute.
2. Add the endpoint and one of your own numbers. You should get the alert, then the welfare check
   a minute later. Reply `SI`; the acknowledgement should arrive and the panel should show
   **Safe**.
3. Leave a second number unanswered and confirm it turns to **No answer — escalated**.

**Report**

1. Endpoint blank, **On** + **Start now** → the PDF downloads locally and the state line reads
   "simulated".
2. Add the endpoint and your own address. The mail should arrive with the PDF attached and the
   state line should show the time and recipients.
3. Wrong `REPORT_FROM` domain is the usual failure: check the function logs and the Resend
   dashboard before suspecting MetaMAP.

A wrong `ALLOWED_ORIGIN` shows up as a CORS error in the browser console for either channel.

---

## 5. Notes for later

- The welfare-check timings (1 minute, 3 minutes) and the reply polling interval are constants in
  `national.js` (`neRunAlert`).
- Delivery receipts are not wired up. For SMS, add a status callback URL to the Twilio request and
  write to `metamap_sms_sent.status`; for email, add a Resend webhook.
- The report currently draws pages 4 to 7 from MetaMAP's simulated feeds, each marked in its
  source line. Connecting SENAMHI, IGP, MTC and El Peruano is separate work.
- Both functions would serve everyday confirmation tracking and scheduled reporting, not only
  national emergencies — the larger gap COES described.

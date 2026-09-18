# MetaMAP — developer handoff

Everything needed to take MetaMAP from the demo package to a working deployment on your own
infrastructure. Follow the steps in order; each one can be verified before moving on.

Contact for questions about the engine itself: Boss.Technology.

---

## 0. What you have been given

```
metamap/
  engine.html          the whole application — one self-contained file, ~2 MB
  index.html           redirect to engine.html (only if your server cannot redirect)
  vendor/
    leaflet/           Leaflet 1.9.4
    jspdf/             jsPDF 2.5.1
    fonts/             DM Sans (woff2) + dm-sans.css
  server/
    COMMUNICATIONS-IMPLEMENTATION.md   reference for both channels (contracts, limits)
    DEVELOPER-HANDOFF.md               this document
    supabase/
      schema.sql                       two tables for SMS
      functions/metamap-sms/           Twilio send + reply lookup
      functions/metamap-sms-inbound/   Twilio inbound webhook
      functions/metamap-report/        Resend send with PDF attachment
  README.txt           short summary and change log
```

`engine.html` and `vendor/` go on the web server. `server/` is source for you — it does not
belong on the web root.

## 1. What you need to provide

| Item | Why | Who |
|---|---|---|
| A web host for the static file | serve `engine.html` | you |
| `/api/ai` on the same host | BOBee's answers (the service BOb already uses) | you |
| A Supabase project | holds the three Edge Functions | you |
| Twilio account, auth token, and a number | SMS alerts and replies | you |
| Resend account and a **verified sending domain** | emails the daily report | you |
| MIMP artwork: crest, cover photograph, COES lockup, source logos | so the report looks like their boletín | MIMP |
| The real location list (code, name, type, coordinates) | replaces the simulated 819 | MIMP / COES |
| Feed access: SENAMHI, IGP, MTC, El Peruano | makes report pages 4–7 real rather than simulated | MIMP / COES |

The last three are not needed to deploy. The engine runs fully without them.

---

## 2. Serve the engine

```bash
# copy to the web root
rsync -av engine.html index.html vendor/ user@server:/var/www/metamap/
```

Keep `vendor/` beside `engine.html`. The page loads nothing from the internet, so it works on a
closed network.

**Verify:** open `https://metamap.bzzzbx.com/engine.html`. The map should draw, 819 locations
should appear in the left column, and cards should start arriving within a minute.

## 3. Connect the AI

BOBee posts to `/api/ai` on the same host — the endpoint BOb already uses. No configuration
inside MetaMAP; it is a relative path.

**Verify:** open BOBee (the bee, bottom left) and ask a question. If the route is missing the
page still works and BOBee says the AI service is not connected, falling back to locally
generated insights.

## 4. Supabase: database, secrets, functions

### 4.1 Tables (SMS only — the report function stores nothing)

```bash
psql "$SUPABASE_DB_URL" -f server/supabase/schema.sql
```

Creates `metamap_sms_sent` and `metamap_sms_replies`, both with RLS on and no policies, so only
the service role can read or write them.

### 4.2 Secrets

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxxxxxx \
  TWILIO_AUTH_TOKEN=xxxxxxxx \
  TWILIO_FROM=+15550001111 \
  RESEND_API_KEY=re_xxxxxxxx \
  REPORT_FROM="COES MetaMAP <coes@your-verified-domain.pe>" \
  ALLOWED_ORIGIN=https://metamap.bzzzbx.com
```

Two things that will waste a day if you get them wrong:

- `ALLOWED_ORIGIN` must be the exact origin serving MetaMAP. A wildcard lets any page on the
  internet spend your Twilio and Resend balance.
- `REPORT_FROM` must be on a domain **verified in Resend**. An unverified domain is silently
  discarded by government mail servers.

### 4.3 Deploy the functions

```bash
supabase functions deploy metamap-sms
supabase functions deploy metamap-sms-inbound --no-verify-jwt
supabase functions deploy metamap-report
```

`metamap-sms-inbound` must skip JWT verification — Twilio cannot present one.

### 4.4 Twilio inbound webhook

Twilio console → your number → **A MESSAGE COMES IN** → HTTP POST:

```
https://<project-ref>.functions.supabase.co/metamap-sms-inbound
```

**Verify:** send a text to that number from your phone, then check
`select * from metamap_sms_replies order by id desc limit 5;` — your message should be there.

---

## 5. Configure inside MetaMAP

Open the hamburger menu (top left). Everything below is entered there.

### 5.1 Branding

**Branding** section → upload:

| Slot | Used on | Suggested |
|---|---|---|
| Crest | header of every report page | PNG/JPEG, ~900 px wide |
| Cover photograph | report cover, left panel | JPEG, ~1400 px wide |
| COES lockup | report footer | PNG/JPEG, ~900 px wide |
| Source logo | source lines | PNG/JPEG, ~600 px wide |

Images are re-encoded to bounded JPEG on upload (jsPDF's PNG decoder is slow and rejects some
valid files). They are stored per profile in the browser and included when you download the
profile JSON, so they can be moved between machines. Keep the cover photograph modest — the
profile upload limit is 2 MB for the whole JSON.

### 5.2 National emergency alert (Twilio)

- Scenario, then **On**
- **Start now** or in 1–10 minutes
- Country + phone number + **Add**, for each recipient (stored as `+51987654321`)
- **SMS endpoint URL**: `https://<project-ref>.functions.supabase.co/metamap-sms`

### 5.3 Daily report by email (Resend)

- **On**, and **Start now** or in 1–10 minutes
- Subject (defaults to `Resumen Diario — COES MIMP — <date>`)
- Covering message (first line marks it as MetaMAP-generated simulated data)
- Email address + **Add**, for each recipient
- **Report endpoint URL**: `https://<project-ref>.functions.supabase.co/metamap-report`

### 5.4 Apply

Press **Apply Config**. Both timers arm silently — nothing appears on screen, so a demo stays a
surprise. To call either off, reopen the menu and press its Cancel button.

---

## 6. Making settings permanent (do this for production)

**Branding persists. Recipients, endpoints, subject and message do not** — they live for the
browser session, and a page reload clears them. That is right for a demo and wrong for a
production deployment. Three options:

1. **Re-enter each session.** Fine for demos. Nothing to do.
2. **Bake in defaults** (recommended, ~5 minutes): open `engine.html`, find these two lines and
   set your own values:

   ```js
   const NECFG={scenario:'quake',mode:'off',…,numbers:[],smsEndpoint:'',…};
   const RPCFG={mode:'off',delayMin:0,subject:'',message:'',emails:[],endpoint:'',armed:false};
   ```

   For example `numbers:['+51987654321']`, `smsEndpoint:'https://….functions.supabase.co/metamap-sms'`,
   `emails:['coes@mimp.gob.pe']`, `endpoint:'https://….functions.supabase.co/metamap-report'`.
   They then appear pre-filled every time the page loads.
3. **Ask us to add persistence.** Storing both blocks in `localStorage` alongside the branding is
   a small change; say the word and it comes in the next build.

Note that baking in endpoints puts them in a file any visitor can read. That is acceptable —
neither endpoint carries a secret, both are origin-locked by `ALLOWED_ORIGIN`, and the Twilio and
Resend keys stay in Supabase.

---

## 7. Test plan

Run each in order; each proves one layer.

**Engine**
1. Page loads, map draws, cards arrive. → the static deployment works.

**SMS, simulated**
2. Leave the SMS endpoint blank, add a number, **On** + **Start now**, Apply Config. Within a
   minute the national emergency panel (**Response → Confirmations**) fills with simulated sends
   and replies. → the engine side works, nothing spent.

**SMS, real**
3. Add the endpoint and your own number. Expect the alert, then the welfare check one minute
   later. Reply `SI`. The acknowledgement should arrive and the panel should show **Safe**.
4. Leave a second number unanswered. After the three-minute reminder it should read
   **No answer — escalated**.

**Report, simulated**
5. Leave the report endpoint blank, **On** + **Start now**. The PDF downloads locally and the
   state line reads "simulated".

**Report, real**
6. Add the endpoint and your own address. The mail should arrive with the PDF attached and the
   state line should show the time and recipients.

**Failure modes you will actually hit**
- CORS error in the browser console → `ALLOWED_ORIGIN` does not match the serving origin.
- Mail sends but never arrives → `REPORT_FROM` domain is not verified in Resend.
- Twilio rejects → the error text appears in the Confirmations list; read it there first.

---

## 8. Safety rules that must not be removed

- **Every SMS is prefixed as a drill** (`SIMULACRO MetaMAP — no es una emergencia real`), and
  `metamap-sms` rejects any message that is not. A phone alert that reads like a real ministry
  emergency, sent by a countdown timer during a demo, is the one part of this system that can
  cause real harm.
- The covering email carries the same notice on its first line. The PDF itself stays clean so it
  looks like their own boletín.
- Use your own and your team's numbers. Twilio requires consent and an opt-out path for anything
  wider.
- Service-role keys stay in Supabase secrets. Nothing secret belongs in `engine.html`.

---

## 9. What is real and what is simulated

| Part | Today |
|---|---|
| Locations (819), status, staffing, occupancy, tasks | simulated, from the profile |
| Incidents, weather, traffic, basic services | simulated |
| Report pages 1–3 and 8 | built from the above |
| Report pages 4–7 (roads, seismic, meteorological, services) | simulated, each marked in its source line |
| SMS and email delivery | **real**, once the functions are deployed |
| Confirmation tracking (who replied, who did not) | **real** logic, on simulated or real messages |

Making pages 4–7 real means connecting SENAMHI, IGP, MTC and El Peruano. Replacing the simulated
819 means loading MIMP's own list. Both are separate pieces of work, not blockers.

---

## 10. Where things live inside engine.html

It is one file, but the sections are clearly marked. Search for these comments:

| Looking for | Search for |
|---|---|
| Simulation entities, status model | `PERU GEOGRAPHY` / `const RULES=` |
| Incident families and colours | `Incident family: basic services` |
| Notification cards and the voice | `Narration controller` |
| Region circles on the map | `fitCircle` |
| National emergency + SMS | `Alert run (Twilio via the configured endpoint` |
| The daily report | `DAILY REPORT — COES-style 16:9 deck` |
| Branding | `BRANDING (customer artwork` |
| Report email | `SCHEDULED REPORT BY EMAIL` |

The profile — location types, counts, programs, escalation chain, thresholds — is data, not
code: download it from the menu, edit the JSON, upload it back.

# MetaMAP — acceptance checklist (completed)

Deployed by: **Boss.Technology / bzzzbx.com team** · Date: **25 September 2026** · Version: **v0.55.2**
Host: **https://metamap.bzzzbx.com** (Vercel, project `bosstechnology/metamap`)

> **Two things to read before the lines below.**
>
> 1. **Production was on v0.44 — it was on v0.35.1.** v0.44 was never delivered to us, so this was a
>    v0.35.1 → v0.55.2 jump. It made no difference: files replaced, nothing to migrate.
> 2. **The server side is not Supabase Edge Functions here.** The site is hosted on Vercel, so the
>    three functions were ported to Vercel Functions on the same origin — `/api/sms`,
>    `/api/sms-inbound`, `/api/report` — keeping your JSON contracts byte for byte. Supabase is used
>    only as the database. `server/supabase/**` in v0.55.2 is identical to v0.35.1, so nothing there
>    needed redeploying. Details in §5 and §7.

---

## 1. The engine is served

- [x] `https://metamap.bzzzbx.com/engine.html` loads and opens on the **industry menu**; nothing is
      preloaded. The menu cannot be dismissed: the close button is hidden, and neither the overlay
      nor Escape closes it.
- [x] Public services: region circles at the opening view — **25** (expected 25)
- [x] Locations listed — **819** (expected 819)
- [x] National retail: Colombia, **90** NAF NAF stores (map centred 4.62 N, 74.30 W)
- [x] Restaurant chains: Peru, **476** Delosi venues; clicking a card icon opens its tab (verified on
      "KFC 28 Royal Plaza" → Equipment: fryers and cold storage with temperatures)
- [x] `?industry=public`, `?industry=retail`, `?industry=restaurants` each skip the menu
- [x] `vendor/` sits beside `engine.html`; the page loads nothing from the public internet.
      Every resource request came from a single origin — see `network-origins.txt`. Note that
      jsPDF's CDN fallback would be blocked by our Content-Security-Policy; it is never reached
      because the local `vendor/jspdf` copy loads first (confirmed in the resource list).
- [x] Incident cards appear bottom right within a minute

Also served, unchanged from before: `/` → 307 → `/engine` (clean URL; `/engine.html` still works).

## 2. The AI (BOBee)

- [x] `/api/ai` responds on the same host (1.4 s round trip). It proxies BOb's public Claude
      endpoint, as agreed.
- [x] Opening BOBee shows "Analysing…" then a real answer
- [x] No "Local summary — the AI did not answer" fallback
- [x] Situation / Recommendation / Prediction each produce a distinct answer
- **Recommendation answer, verbatim:** *"1 · PRIORIDAD — Priorizar suministros en 5 ubicaciones
  críticas con menos de 2 días stock."*

## 3. Interaction mode (microphone)

Not completed here — **needs a person at a real machine.**

- [x] The microphone button is enabled (not greyed)
- [x] Preconditions verified in the browser: `isSecureContext: true`, top-level tab, SpeechRecognition
      available
- [ ] **Check the microphone** reported: **`Permiso del micrófono: denied`** — our test browser is
      automated and has no microphone device, so it cannot grant permission. Calibration, the wake
      word and the fifteen-second follow-up are therefore **untested**.
- Note: the button label reads "Check the microphone" in English while the rest of that sidebar is in
  Spanish (see §9).

## 4. The daily report

- [x] Eight-page PDF — **attached** (`MetaMAP_Resumen_Diario_v0.55.2.pdf`, 383 KB)
- [x] Maps are vectors: the file contains **0 image objects** and ~7,400 vector path operations
- [x] The report is in Spanish for the MIMP profile, including when the interface is in English

## 5. SMS alerts (Twilio)

- [x] Schema applied. `metamap_sms_sent` and `metamap_sms_replies` exist, plus `metamap_report_sent`
      (ours, for duplicate suppression and an audit trail of the report).
- [x] Equivalent functions deployed — **as Vercel Functions, not Supabase ones**: `/api/sms` and
      `/api/sms-inbound`. There is no JWT gateway in front of them, so the `--no-verify-jwt`
      instruction does not apply. `/api/sms-inbound` validates the `X-Twilio-Signature` HMAC and
      refuses anything unsigned.
- [x] Twilio number `+1 518 656 0966` → "A message comes in" → `https://metamap.bzzzbx.com/api/sms-inbound`, HTTP POST
- [x] **Simulated run** (endpoint blank) on v0.55.2: the panel fills with simulated sends and replies
- [ ] **Real run: partially verified, and this is our one open item.** On 18 September, on v0.35.1,
      the three messages were accepted by Twilio — alert `SMd289bb1f…`, welfare `SMf0a522aa…`,
      reminder `SM9e6909e4…`, all `queued` — but **the handset in Colombia never received them**, so
      we have no screenshot of a received message. Sender is a US long code; A2P 10DLC registration
      is in review, and we have not yet confirmed whether Colombian carriers deliver from it.
      Question for you: do you have delivery experience for Peru and Colombia from a US number, or
      should we move to a local sender?
- [x] **Delivery receipts are now wired up** — the item COMMUNICATIONS-IMPLEMENTATION.md §5 lists as
      missing. `/api/sms` sends a `StatusCallback`, and `/api/sms-status` (Twilio signature checked)
      writes the real outcome into `metamap_sms_sent.status`, with the carrier code in `error`
      (30007 filtering, 30008 unknown, 21408 country not enabled). Messages no longer sit at
      "queued", so the next real drill will say plainly whether Colombia delivered.
- [x] The message is prefixed `SIMULACRO MetaMAP — no es una emergencia real` (enforced server side:
      `/api/sms` rejects any body without SIMULACRO/DRILL, exactly as your function does)
- [ ] Reply `SI` → acknowledgement → panel shows **Safe**: untested, because nothing was delivered
- [x] A number that does not reply turns to **No answer — escalated** after the reminder (observed)

## 6. Daily report by email (Resend)

- [x] Sending domain verified in Resend — **bzzzbx.com**
- [x] `/api/report` deployed; `REPORT_FROM` = `COES MetaMAP <notifications@bzzzbx.com>`, on that domain
- [x] **Simulated run** (endpoint blank) on v0.55.2: PDF builds locally and the panel reads "simulado"
- [x] **Real run**: received on 18 September with the eight-page PDF attached (Resend id
      `01a0b466-5733-…`). SPF, DKIM and DMARC all **PASS**. It landed in the Gmail spam folder on
      first contact — a new-sender reputation issue, not authentication.
- [x] The covering message's first line marks it as MetaMAP-generated simulated data

## 7. Security

- [ ] `ALLOWED_ORIGIN` — **not applicable in this deployment.** The browser calls `/api/sms` and
      `/api/report` on its own origin, so there is no CORS step and no `Access-Control-Allow-Origin`
      to widen. The equivalent guarantee is that the endpoints only accept the recipients configured
      server side, plus per-IP rate limits (120/min SMS, 10/min report) and daily ceilings.
- [x] No key in `engine.html`. `grep -i -e twilio -e resend -e service_role engine.html` returns one
      line, a source comment, and no credential:
      `// ─ Alert run (Twilio via the configured endpoint, or simulated when none is set) ─`
      A search for real key shapes (`sb_secret_…`, `re_…`, `AC…`) returns nothing.
- [x] The drill prefix check is intact
- [ ] **Recipient lists are wider than "your own team", by the customer's decision.** SMS accepts any
      Peruvian (`+51*`) or Colombian (`+57*`) number; email accepts `@boss.technology` and
      `@mimp.gob.pe`. Adding each participant one by one blocked the operators during the first
      rehearsals. The cost of that opening is bounded by daily ceilings — **200 SMS and 50 emails per
      24 h** — and consent is now the coordinator's responsibility rather than something the system
      enforces per number.

## 8. Production configuration

- [x] Settings persistence: **defaults baked into `engine.html`** (handoff §6, option 2). Two lines:
      `NECFG.smsEndpoint = '/api/sms'` and `RPCFG.endpoint = '/api/report'`.
      **This is the customisation you asked about in step 3 of the upgrade instructions, and we
      re-applied it to v0.55.2.** Recipients are deliberately *not* baked in — they are typed per
      session. Please consider shipping the endpoints as configurable defaults, or the `localStorage`
      persistence you offered, so this edit does not have to be redone on every build.
- [x] Profile downloaded as backup — **attached** (`MetaMAP_Profile_social-protection-mimp.json`)
- [ ] Branding not uploaded: MIMP has not sent the crest, cover photograph, COES lockup or source
      logo, so the report still shows the reserved spaces.

## 9. Things that did not work, or need your attention

**The three engine defects we reported for v0.35.1 are still present in v0.55.2.** We verified each in
this build. Our backend contains them, so they are not blocking, but they are real:

1. **Apply Config re-fires an armed alert and report.** `fire()` does not return `NECFG.mode` to
   `'off'`, and `applyConfig()` calls `applyNationalConfig()` whenever the mode is not `'off'`. Any
   later Apply Config — to change the language, say — declares a new emergency and texts everyone
   again. `RPCFG` behaves the same way. *Our mitigation: each message kind goes to a number at most
   once per 10 minutes, and the same report to the same recipients at most once per 10 minutes.*
2. **Emergency ids restart at `NE-001` on every page load** (`NATIONAL.seq`). Against a real endpoint,
   `{op:"replies", emergencyId:"NE-001"}` also matches replies from earlier drills, so people would
   show as Safe from old answers. *Our mitigation: replies are anchored to the last alert each number
   actually received, ignoring the id.*
3. **An unclear reply triggers a welfare SMS every 15 seconds.** `nePollReplies` re-processes every
   reply on each poll and `neReply` only ignores contacts already `confirmed`/`help`, so an `unclear`
   contact is re-asked forever. *Our mitigation: at most one outbound message per kind per reply
   received.*

Also:

4. **The operator never sees your error text.** `neSend` and `sendReportEmail` throw `'HTTP ' + status`
   without reading the `{error}` body, contrary to COMMUNICATIONS-IMPLEMENTATION.md §3.
5. **Mixed language in the sidebar.** With the interface in Spanish, "Check the microphone",
   "Daily report by email", "Send now" and the BOBee tab "Situation" stay in English; with the
   interface in English, the report panel's status line is Spanish ("Sin envíos en esta sesión",
   "simulado"). In the Spanish report itself, the cover subtitle is in English ("Peru's Ministry of
   Women and Vulnerable Populations — Sector Emergency Operations Center").
6. **Stale references in the docs:** `README.txt` points to `server/SMS-ALERT-IMPLEMENTATION.md`,
   which does not exist (it is now COMMUNICATIONS-IMPLEMENTATION.md), and
   COMMUNICATIONS-IMPLEMENTATION.md §5 refers to `national.js`, which is not in the package.
7. **A note on the deploy instructions:** step 3 asks us to diff `server/` before redeploying. We did:
   `server/supabase/**` and COMMUNICATIONS-IMPLEMENTATION.md are identical to v0.35.1, so the
   Supabase sources were left untouched.

## Attachments

1. This checklist
2. `MetaMAP_Resumen_Diario_v0.55.2.pdf` — the eight-page report
3. `MetaMAP_Profile_social-protection-mimp.json` — the active profile (no branding yet)
4. `network-origins.txt` — every resource request the page made, with its origin
5. Screenshot of a received SMS: **not available** (see §5)
6. Screenshot of the received email: with the customer (received 18 September)

## The four values you asked for

| | |
|---|---|
| Region circles at the opening view | **25** |
| Locations | **819** |
| `ALLOWED_ORIGIN` | **not applicable** — same-origin endpoints, no CORS (see §7) |
| Sending domain | **bzzzbx.com** (`notifications@bzzzbx.com`) |

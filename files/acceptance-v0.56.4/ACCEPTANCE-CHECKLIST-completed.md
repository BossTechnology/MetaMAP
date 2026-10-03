# MetaMAP — acceptance checklist (completed)

Deployed by: **Boss.Technology / bzzzbx.com team** · Date: **3 October 2026** · Version: **v0.56.4**
Host: **https://metamap.bzzzbx.com** (Vercel, project `bosstechnology/metamap`)

> **Two standing notes, unchanged since the v0.55.2 checklist.**
>
> 1. **The server side is not Supabase Edge Functions here.** The site runs on Vercel, so the three
>    functions are Vercel Functions on the same origin — `/api/sms`, `/api/sms-inbound`,
>    `/api/report` — keeping your JSON contracts exactly. Supabase is the database only. We diffed
>    `server/supabase/**` against v0.55.2: identical, so nothing was redeployed, as you said.
> 2. **Your two endpoint fields ship blank, which means "simulate".** We set them again in
>    `engine.html` (§8). This is the third release in a row where the edit has to be redone; please
>    consider shipping them as configurable defaults.

---

## 1. The engine is served

- [x] `https://metamap.bzzzbx.com/engine.html` opens on the **industry menu** with four tiles
      (Public services · National retail · Restaurant chains · Financial services); nothing is
      preloaded, and the menu cannot be dismissed until a choice is made
- [x] Public services: numbered circles at the opening view — **32** (expected 32)
- [x] Locations listed — **819** (expected 819)
- [x] National retail: Colombia, **90** stores
- [x] Restaurant chains: Peru, **476** venues; a card icon opens its tab
- [x] Financial services: Colombia, **10K** points in the left column (10,000 entities)
- [x] `?industry=public`, `?industry=retail`, `?industry=restaurants` and `?industry=financial`
      each skip the menu
- [x] `vendor/` sits beside `engine.html`; the page loads nothing from the public internet — with
      10,000 SuRed points loaded, every request came from one origin. Full list in
      `network-origins.txt` (attached), captured from the browser's Performance API.
- [x] Incident cards appear bottom right within a minute

Also served, unchanged: `/` → 307 → `/engine`; `/engine.html` still works.

## 1b. Financial services (SuRed)

- [x] Opening view: numbered circles only — **40** (expected 40)
- [x] A point card shows five slots (Cashier · Systems · Equipment · Cash · Communications), then
      TXNS, the commission in pesos, the volume meter and the volume. Example card:
      `0/1 · 5/6 · 2/3 · 75% · 23`, then `2 TXNS · $ 1k · $ 190k`.
- [x] Some cards show the blue calendar above the volume — **9 of the 40** cards in the opening view
- [x] Opening a point: the tab row reads Overview · Communications · Cash · Cashier · Systems ·
      Equipment · **TXNS** · Signals · **Compliance** · Configuration, each with content
      (verified in Spanish: Resumen · Comunicaciones · Efectivo · Cajero · Sistemas · Equipos ·
      Transacciones · Señales · Cumplimiento · Configuración)
- [x] The **Cash** tab shows the cash line between its two limits: "EFECTIVO DURANTE EL DÍA, ENTRE
      SUS DOS LÍMITES — bajo 20% … sobre 85% …", with the point at `$ 16,4 M · 79% de su máximo`
- [x] Zooming into Bogotá: at national zoom 40 circles and no incident zones; at zoom 11 the
      circles split into 49 and 25 incident zones appear; at zoom 16 the circles are gone and only
      pins remain
- [x] Highlighting a point keeps it as a pin while the rest stay numbered circles (40 circles
      unchanged, pins 48 → 50)
- [x] Spanish: menus, cards and the ten tabs read in Spanish, with no English leftovers
- [x] A point's Overview states its provenance — either its source ID
      (`Punto de venta del operador · Apuestas Cúcuta 75 · C75-NSA-0079`) or, for a generated one,
      "generado para la simulación — … aún no está en el maestro del equipo de datos · ubicado a
      nivel de municipio"

## 1c. On a phone (375 × 812 emulated)

- [x] `?industry=financial` on a phone: the map shows **4 large circles** instead of 40
- [x] Typing two letters shows suggestions. Geo, with "me": Medellín (Antioquia · 261 puntos),
      Mercaderes, Medina, Medio Atrato, Medio Baudó, the department Meta, plus a matching point —
      i.e. **Colombian** municipalities, so the geo-search fix is in. Incidents, with "ca": open
      incidents and incident types. Observe, with "me": four suggestions.
- [ ] Green orb on a resolved incident — **not observed in a 40-second window.** Resolutions are
      periodic; this needs a longer session to catch. Nothing suggests it is broken; the orb is
      still in the code and worked in v0.55.2.

## 2. The AI (BOBee)

- [x] `/api/ai` responds on the same host (proxies BOb's public Claude endpoint, as agreed)
- [x] BOBee shows "Analysing…" and then a real answer
- [x] No "Local summary — the AI did not answer" fallback
- [x] Situation / Recommendation / Prediction each produce a distinct answer
- **Recommendation answer, verbatim:** *"1 · PRIORIDAD — Activar suministros de emergencia en 51
  locaciones: 1.3-1.9 días disponibles."*
  (Situation: *"Arequipa crítica: 35 ubicaciones en estado crítico por sismo activo de severidad 3."*
  Prediction: *"Crisis en Arequipa: 35 ubicaciones críticas por sismo 3.0 y apagón activo."*)

## 3. Interaction mode (microphone)

Not completed here — **needs a person at a real machine**, same as for v0.55.2.

- [x] The microphone button is enabled
- [x] Preconditions verified: `isSecureContext: true`, top-level tab, SpeechRecognition available
- [ ] **Check the microphone** reports **`Permiso del micrófono: denied`** — our test browser is
      automated and has no microphone device, so it cannot grant permission. Calibration, the wake
      word and the fifteen-second follow-up remain **untested**.
- Note: the button is still labelled "Check the microphone" in English inside an otherwise Spanish
  sidebar (see §9).

## 4. The daily report

- [x] Eight-page PDF — **attached** (`MetaMAP_Resumen_Diario_v0.56.4.pdf`, 384 KB)
- [x] Maps are vectors: **0 image objects**, ~7,400 vector path operations in the file
- [x] In Spanish for the MIMP profile, including when the interface is in English

## 5. SMS alerts (Twilio)

**This is the one section that is not green, and it is not about v0.56.4.**

- [x] Schema applied: `metamap_sms_sent`, `metamap_sms_replies`, plus our `metamap_report_sent`
- [x] Equivalent functions deployed as Vercel Functions: `/api/sms`, `/api/sms-inbound` and
      `/api/sms-status`. There is no JWT gateway in front of them, so `--no-verify-jwt` does not
      apply; both webhooks validate the `X-Twilio-Signature` HMAC and refuse anything unsigned.
- [x] Twilio number `+1 518 656 0966` → "A message comes in" → `/api/sms-inbound`, HTTP POST
- [x] **Delivery receipts are wired up** (your COMMUNICATIONS-IMPLEMENTATION.md §5 "notes for
      later"): `/api/sms` sends a `StatusCallback` and `/api/sms-status` writes the real outcome,
      with the carrier's code, into `metamap_sms_sent`.
- [x] Messages now leave as **one GSM-7 segment** instead of two UCS-2 ones. The engine's em dash
      and accents forced UCS-2, doubling both the segments and the price; we fold what GSM-7 lacks
      and keep what it has (é, ñ, ¿).
- [x] **Simulated run** (endpoint blank) on v0.56.4: the panel fills with simulated sends and replies
- [ ] **Real run: the messages never reach the handset.** Five messages to a Colombian mobile
      (+57…), across two days, were accepted, **billed** and reported `delivered` by Twilio in 1–2
      seconds each, with no error code — and none arrived. One of them was sent straight from the
      REST API with plain ASCII, with MetaMAP entirely out of the path, with the same result. A
      support ticket with the five SIDs is with Twilio.
- [x] The drill prefix `SIMULACRO MetaMAP - no es una emergencia real` is enforced server side
- [ ] Reply `SI` → acknowledgement → **Safe**: untested, because nothing is delivered
- [x] A number that does not reply turns to **No answer — escalated** after the reminder

**A finding you should know about, from your own country guidelines.** Even with delivery fixed,
the welfare reply cannot work over SMS in these two markets: Peru has **no two-way SMS** at all,
and in Colombia an international long code **has its sender ID replaced by a shared short code**,
so the recipient's "SI" cannot come back to us. Twilio also does not offer domestic long codes in
either country, Colombian alphanumeric sender IDs are unsupported, and a Colombian short code is a
4–10 week provisioning. If the confirmation loop is part of what MetaMAP promises in Peru and
Colombia, SMS cannot deliver it; WhatsApp can. The customer has chosen to stay on SMS for now.

## 6. Daily report by email (Resend)

- [x] Sending domain verified in Resend — **bzzzbx.com**
- [x] `/api/report` deployed; `REPORT_FROM` = `COES MetaMAP <notifications@bzzzbx.com>`
- [x] **Simulated run** (endpoint blank): the PDF builds and the panel reads "simulado"
- [x] **Real run**: received on 18 September with the eight-page PDF attached (Resend id
      `01a0b466-5733-…`); SPF, DKIM and DMARC all **PASS**. It landed in Gmail's spam folder on
      first contact — new-sender reputation, not authentication.
- [x] The covering message's first line marks it as MetaMAP-generated simulated data

## 7. Security

- [ ] `ALLOWED_ORIGIN` — **not applicable in this deployment.** The browser calls the API on its own
      origin, so there is no CORS step and no header to widen. The equivalent guarantees are:
      recipients restricted server side, per-IP rate limits (120/min SMS, 10/min report) and daily
      ceilings (200 SMS, 50 emails per 24 h).
- [x] No key in `engine.html`. `grep -i -e twilio -e resend -e service_role engine.html` returns one
      line, a source comment, and no credential:
      `// ─ Alert run (Twilio via the configured endpoint, or simulated when none is set) ─`
      A search for real key shapes (`sb_secret_…`, `re_…`, `AC…`) returns nothing.
- [x] The drill prefix check is intact
- [ ] **Recipient lists are wider than "your own team", by the customer's decision.** SMS accepts any
      Peruvian (`+51*`) or Colombian (`+57*`) number; email accepts `@boss.technology` and
      `@mimp.gob.pe`. Listing each participant blocked the operators during rehearsals. The cost of
      that opening is bounded by the daily ceilings above, and consent is now the coordinator's
      responsibility rather than something the system enforces per number.

## 8. Production configuration

- [x] Settings persistence: **defaults baked into `engine.html`** — `NECFG.smsEndpoint = '/api/sms'`
      and `RPCFG.endpoint = '/api/report'`, re-applied to v0.56.4 and verified live. Recipients are
      deliberately not baked in; they are typed per session.
- [x] Profile downloaded as backup — **attached** (`MetaMAP_Profile_social-protection-mimp.json`)
- [ ] Branding not uploaded: MIMP has not sent the crest, cover photograph, COES lockup or source
      logo, so the report still shows the reserved spaces.

## 9. Still open from the v0.55.2 checklist

Re-verified against this build; all four are unchanged in v0.56.4.

1. **Apply Config re-fires an armed alert and report.** `fire()` does not return `NECFG.mode` to
   `'off'`, so any later Apply Config — to change the language, say — declares a new emergency and
   texts everyone again. `RPCFG` behaves the same. *Contained: each kind goes to a number at most
   once per 10 minutes, and the same report at most once per 10 minutes.*
2. **Emergency ids restart at `NE-001` on every page load.** Against a real endpoint,
   `{op:"replies", emergencyId:"NE-001"}` also matches earlier drills. *Contained: replies are
   anchored to the last alert each number actually received.*
3. **An unclear reply triggers a welfare SMS every 15 seconds**, because `nePollReplies`
   re-processes every reply on each poll. *Contained: at most one outbound message per kind per
   reply received.*
4. **The operator never sees your error text.** `neSend` and `sendReportEmail` throw
   `'HTTP ' + status` without reading the `{error}` body, contrary to
   COMMUNICATIONS-IMPLEMENTATION.md §3.
5. **Mixed language.** With the interface in Spanish, "Check the microphone", "Daily report by
   email" and "Send now" stay in English; with it in English, the report panel's status line is in
   Spanish. The Spanish report's cover subtitle is in English.

## Attachments

1. This checklist
2. `MetaMAP_Resumen_Diario_v0.56.4.pdf` — the eight-page report
3. `MetaMAP_Profile_social-protection-mimp.json` — the active profile (no branding yet)
4. `network-origins.txt` — every request the page made, with 10,000 SuRed points loaded
5. Screenshot of a received SMS: **not available** (see §5)
6. Screenshot of the received email: with the customer (received 18 September)

## The values you asked for

| | |
|---|---|
| Circles, public services | **32** |
| Circles, financial services | **40** (4 on a phone) |
| Locations, public services | **819** |
| `ALLOWED_ORIGIN` | **not applicable** — same-origin endpoints, no CORS (§7) |
| Sending domain | **bzzzbx.com** (`notifications@bzzzbx.com`) |

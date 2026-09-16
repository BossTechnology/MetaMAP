# MetaMAP simulation — deployment guide
**Target:** `https://metamap.bzzzbx.com/engine.html` (same pattern as `https://bob.bzzzbx.com/dashboard.html`)
**Version:** v0.21 (industry profiles · Social Protection Services / MIMP)

The simulation is **one static page** (`engine.html`) plus a few local library files. It runs entirely in the browser.
No build step, no database, and no Supabase setup are required. The only server-side piece is the **AI endpoint** used by BOBee.

---

## 1. Package contents

| Path | Purpose |
|---|---|
| `metamap/engine.html` | The simulation (single file, ~1.9 MB; data, map layers, icons and siren embedded) |
| `metamap/index.html` | Fallback redirect to `engine.html` (only needed if the web server can't redirect `/`) |
| `metamap/vendor/leaflet/` | Leaflet 1.9.4 (map engine), BSD-2 licence |
| `metamap/vendor/jspdf/` | jsPDF 2.5.1 (PDF report), MIT licence |
| `metamap/vendor/fonts/` | DM Sans (woff2) + `dm-sans.css`, OFL licence |
| `server/nginx-metamap.conf` | Example nginx server block (subdomain, redirect, `/api/ai` forwarding, caching, gzip) |
| `server/metamap-headers.conf` | Security headers snippet (tested with the page) |
| `server/Caddyfile.example` | Same setup for Caddy |
| `server/engine-ai-adapter.js` | Copy of the AI adapter embedded at the top of `engine.html` (for reference) |
| `optional/ai-endpoint-reference/index.ts` | Supabase Edge Function — **only** if BOb's AI endpoint can't be reused |
| `MetaMAP_Profile_social-protection-mimp.json` | Built-in MIMP profile, as an example for editing and uploading |

The page makes **no requests to outside sites** (verified with all external traffic blocked).

---

## 2. Steps

1. **DNS:** `metamap.bzzzbx.com` → the VPS (same as `bob.bzzzbx.com`).
2. **TLS certificate** for the subdomain (HTTPS is required for voice, microphone and downloads).
3. **Copy** the `metamap/` folder to the web root, e.g. `/var/www/metamap/`.
4. **Web server:** add a server block like `server/nginx-metamap.conf` (or the Caddy example):
   - `/` → `302` to `/engine.html`
   - `engine.html` with `Cache-Control: no-cache`; `vendor/` cached long-term
   - security headers from `server/metamap-headers.conf`
   - `/api/ai` forwarded to **BOb's AI service** (see §3)
5. **Reload** the web server and run the checklist in §6.

**Updating later:** replace `engine.html` only. `vendor/` changes only if the libraries change.

---

## 3. AI endpoint (BOBee)

`engine.html` calls **`POST /api/ai`** on its own domain. The web server forwards that path to the service that already powers BOb's AI.

**What the page sends** (several common field names at once, so an existing endpoint can read the one it expects):
```json
{
  "prompt": "<full instruction + data snapshot + question>",
  "message": "<same as prompt>",
  "messages": [{ "role": "user", "content": "<same as prompt>" }],
  "max_tokens": 900,
  "source": "metamap",
  "tier": "quick"
}
```
**What it accepts back** (any of these):
- plain text, or
- JSON with `text`, `reply`, `response`, `completion`, `output`, `answer`, `result`, `content` (string), `message`,
- Anthropic format `{ "content": [{ "type": "text", "text": "…" }] }`, or OpenAI-style `choices[0].message.content`.

**Status codes the page understands**
| Code | What the user sees |
|---|---|
| 200 | The answer |
| 429 | "BOBee is receiving too many requests. Wait a moment, then ask again." |
| 404 / 405 / 501 / 502 / 503 / network error | "BOBee's AI service is not connected on this server yet." BOBee's three insights still appear (generated locally from the simulation data) |
| other errors | "BOBee could not reach Claude. Try again in a moment." |

**If BOb's endpoint uses a different format:** edit only the adapter block at the top of `engine.html` (`buildBody` / `extractText`), or set overrides before it loads:
```html
<script>window.METAMAP_AI = { endpoint: '/api/ai', headers: { 'x-engine': 'metamap' } };</script>
```

**If BOb's endpoint can't be reused:** deploy `optional/ai-endpoint-reference/index.ts` as the Supabase Edge Function `metamap-ai`, set the `ANTHROPIC_API_KEY` secret (and optionally `ANTHROPIC_MODEL`), and point `/api/ai` at it. It includes a per-IP limit (12/min), a prompt-size cap and an answer-length cap.

**The API key never reaches the browser.**

### Cost protection (the page is public)
- nginx `limit_req` on `/api/ai` (example: 12 requests per minute per IP, burst 10) — see the config comment for the `http {}` line.
- The page itself spaces requests at least 1.5 s apart and caps answers at 900 tokens.
- AI is used when a visitor opens BOBee (3 short insights), chats, or opens a location's Communications tab (one summary per location per 30 simulated minutes).

---

## 4. What does **not** need a server
- **Simulation data:** generated in the browser on every visit.
- **Saved settings:** stored in the visitor's browser (`localStorage`):
  `metamap-lang` · `metamap-voice` · `metamap-profile` · `metamap-profiles` (uploaded profiles).
- **Downloads** (PDF report, profile JSON): normal browser downloads.
- **Voice** (announcements, BOBee speech, dictation): the browser's built-in speech. Microsoft Edge offers the most natural voices (e.g. Camila for Spanish, Jenny/Aria for English).
- **Supabase:** not used by this version. Later options: shared profiles for all users, login, or storing real location lists.

---

## 5. Profiles
- Hamburger menu → **Industry & Profile**. The built-in *Social Protection Services (MIMP)* profile works by default.
- **Download** exports the active profile (types, programs, population groups, escalation chain, thresholds, anomaly rules, AutoComm, AutoBotz).
- **Upload** checks the file and lists any problems in plain words before applying; valid files appear in the list and are used with **Apply Config**.
- **Reset to built-in** removes uploaded profiles from that browser.
- To ship an extra profile for everyone, send it to Boss.Technology to include as a built-in profile in `engine.html`.

---

## 6. Test checklist (after deploying)

| # | Check | Expected |
|---|---|---|
| 1 | Open `https://metamap.bzzzbx.com` | Redirects to `/engine.html`; map of Peru with 96 locations |
| 2 | Browser dev tools → Network | No requests to other domains; no failed files |
| 3 | Dev tools → Console | No errors; no Content-Security-Policy violations |
| 4 | Open BOBee (bee, top right) and ask a question | An AI answer (not "not connected") |
| 5 | Call `/api/ai` 30 times quickly (e.g. with `curl`) | Some calls return **429** |
| 6 | Time menu → *This Week* → download icon | A PDF downloads |
| 7 | Map → speaker button, then hamburger → Simulation → National emergency → *Once* → Apply Config | Siren plays, then the voice announcement |
| 8 | Hamburger → Language → Español → Apply Config; reload | Interface stays in Spanish |
| 9 | Hamburger → Download profile, then Upload it | "loaded — press Apply Config" message |
| 10 | Mobile phone | Rail becomes a bottom bar; flyouts open as sheets |

---

## 7. Notes
- Location names, codes, coordinators and all activity are **simulated**. Temporary Shelter Homes (HRT) are shown only at province level and marked confidential.
- Map data credits (shown on the map): roads © TravelMapping; Lima avenues © OpenStreetMap contributors (ODbL); places © GeoNames (CC BY 4.0); boundaries from public Peru GeoJSON datasets.
- Browser support: current Chrome, Edge, Safari and Firefox.

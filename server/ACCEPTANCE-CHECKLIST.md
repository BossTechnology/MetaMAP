# MetaMAP — acceptance checklist

Fill this in and send it back. Each line is something you can observe, not something you have to
take on trust. Where a line asks for a value, paste the value; where it asks for a screenshot,
one image is enough.

Deployed by: ______________________  Date: ____________  Version: v0.56.4

---

## 1. The engine is served

- [ ] `https://metamap.bzzzbx.com/engine.html` loads in a normal browser tab and opens on the
      **industry menu** (Public services · National retail · Restaurant chains · Financial services);
      nothing is preloaded
- [ ] Choosing **Public services**: the map draws Peru with numbered circles — **how many circles at the opening view?** ______
      (expected on a desktop: 32 — one per region plus one per major metropolitan area)
- [ ] The left column lists locations — **how many?** ______ (expected: 819)
- [ ] Choosing **National retail** (sidebar menu): Colombia with **90** stores
- [ ] Choosing **Restaurant chains**: Peru with **476** venues; clicking an icon on a venue card opens its tab
- [ ] Choosing **Financial services**: Colombia with **10K** points in the left column
- [ ] `engine.html?industry=public`, `?industry=retail`, `?industry=restaurants` and `?industry=financial` each skip the menu
- [ ] `vendor/` sits beside `engine.html`; the page loads nothing from the public internet
      (open DevTools → Network, reload, confirm no third-party requests) — **screenshot**
- [ ] Incident cards appear at the bottom right within a minute of loading

## 1b. Financial services (SuRed)

- [ ] Opening view: numbered circles only — **how many?** ______ (expected on a desktop: 40)
- [ ] A point card shows five slots (Cashier · Systems · Equipment · Cash · Communications), then
      TXNS, commission in pesos (for example "$ 40k"), the volume meter and the volume
- [ ] Some cards show a small **blue calendar** above the volume (a subsidy payment day in that department)
- [ ] Opening a point: the tab row reads Overview · Cashier · Systems · Equipment · Cash · **TXNS** ·
      Communications · Signals · Compliance · Configuration; each tab shows content
- [ ] The **Cash** tab shows the cash line between its two limits (20% and 85%)
- [ ] Zooming into Bogotá: numbered circles split into smaller areas; incident zones appear; pins
      appear only when zoomed in further
- [ ] Highlighting a point (its checkbox) keeps it as a pin while the rest stay as numbered circles
- [ ] Switching the language to Spanish: menus, cards and tabs read in Spanish (no English leftovers)
- [ ] A point's Overview says whether it comes from SuRed's master (its source ID) or is generated

## 1c. On a phone

- [ ] Open `engine.html?industry=financial` on a phone: the map shows a handful of large circles
- [ ] Open each left-menu section and type two letters: **suggestions appear** in every section
- [ ] When an incident resolves, a **green orb** grows from its place on the map

## 2. The AI (BOBee)

- [ ] `/api/ai` responds on the same host
- [ ] Opening BOBee from the left rail shows "Analysing…" and then a real answer
- [ ] The answer is **not** followed by "Local summary — the AI did not answer"
- [ ] Switching Situation / Recommendation / Prediction each produces a distinct answer
- [ ] **Paste one Recommendation answer here:** ______________________________________

## 3. Interaction mode (microphone)

Only works in a top-level tab on https, in Chrome, Edge or Safari.

- [ ] The microphone button beside the speaker is **enabled** (not greyed with a strike)
- [ ] Sidebar → **Check the microphone** reports `Context: own tab` and `Secure: https`
      — **paste the line it shows:** ______________________________________
- [ ] First press runs calibration: say "BOBee" three times, it confirms what it will recognise
- [ ] Saying "BOBee, what is the situation" produces a spoken answer
- [ ] A follow-up question within fifteen seconds works **without** the wake word

## 4. The daily report

- [ ] Downloading the report produces an eight-page PDF — **attach it**
- [ ] The Peru maps are crisp when zoomed to 400% (they are vectors, not screenshots)
- [ ] The report is in Spanish for the MIMP profile

## 5. SMS alerts (Twilio)

- [ ] `supabase/schema.sql` applied; `metamap_sms_sent` and `metamap_sms_replies` exist
- [ ] `metamap-sms` and `metamap-sms-inbound` deployed (the inbound one with `--no-verify-jwt`)
- [ ] Twilio number's "A message comes in" points at the inbound function
- [ ] **Simulated run** (endpoint blank): the emergency panel fills with sends and replies
- [ ] **Real run**: alert received on a real phone — **screenshot of the message**
- [ ] The message is prefixed `SIMULACRO MetaMAP — no es una emergencia real`
- [ ] Welfare check arrives one minute later; replying `SI` returns the acknowledgement
- [ ] The panel shows that number as **Safe**
- [ ] A number that does not reply turns to **No answer — escalated** after the reminder

## 6. Daily report by email (Resend)

- [ ] Sending domain verified in Resend — **which domain?** ______________________
- [ ] `metamap-report` deployed; `REPORT_FROM` uses the verified domain
- [ ] **Simulated run** (endpoint blank): the PDF downloads and the panel says "simulated"
- [ ] **Real run**: email received with the PDF attached — **screenshot of the inbox entry**
- [ ] The covering message's first line marks it as MetaMAP-generated simulated data

## 7. Security

- [ ] `ALLOWED_ORIGIN` is set to the exact serving origin, not a wildcard — **paste the value:**
      ______________________________________
- [ ] No Twilio, Resend or Supabase key appears anywhere in `engine.html`
      (`grep -i -e twilio -e resend -e "service_role" engine.html` returns nothing) — **paste the result**
- [ ] The drill prefix check in `metamap-sms` has not been removed
- [ ] Recipient lists contain only your own and your team's numbers and addresses

## 8. Production configuration

- [ ] Decided how settings persist: re-enter each session / defaults baked into `engine.html` /
      persistence requested — **which?** ______________________
- [ ] If baked in: `NECFG` and `RPCFG` contain the endpoints and recipients
- [ ] Branding uploaded (crest, cover photograph, COES lockup, source logo) and the profile
      downloaded as a backup — **attach the profile JSON**

---

## What to send back

1. This checklist, completed
2. The generated PDF report
3. Screenshots: no third-party network requests, the received SMS, the received email
4. The profile JSON with branding
5. The values asked for above: circle counts (public services, financial services), location count, `ALLOWED_ORIGIN`, sending domain
6. Anything that did not work, with the error text and the function logs

## Known limits — not defects

- The microphone does not work in an embedded frame. Top-level tab only, https only, and never
  in Firefox, which has no speech recognition.
- Report pages 4–7 (roads, seismic, meteorological, services) are drawn from simulated feeds and
  are marked as such. Connecting SENAMHI, IGP, MTC and El Peruano is separate work.
- The 819 locations are simulated until MIMP's real list is loaded.
- SuRed: 5,717 points come from SuRed's master and are **unverified**; the rest are generated and
  marked. Transactions, cash, commission rates and the payment calendar are simulation values.
- SuRed: which authority supervises each service line (MinTIC postal regime or SFC) is still to be
  verified; the Compliance tab says so.
- Switching industries several times within one script step (only possible from the browser console)
  can log a Leaflet error; clicking through the menu cannot trigger it.

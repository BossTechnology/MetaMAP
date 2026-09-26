# MetaMAP — upgrading production from v0.44 to v0.55.2

Production runs **v0.44** (public services only). The retail version was never deployed, so this
upgrade goes straight to **v0.55.2**. MetaMAP deploys as one self-contained `engine.html` plus
`vendor/`, so skipping versions is not a problem: you replace files, there is nothing to migrate
and no data format changes. Read this page, then follow `DEVELOPER-HANDOFF.md` as before.

## 1. What changes for users

| | v0.44 (live) | v0.55.2 |
|---|---|---|
| Opening screen | Opens straight on Public services (MIMP, Peru) | Opens on an **industry menu**; nothing is preloaded (decision by Boss.Technology) |
| Industries | Public services | Public services · **National retail** (NAF NAF, Colombia) · **Restaurant chains** (Delosi, Peru) |
| Direct links | — | `engine.html?industry=public` · `?industry=retail` · `?industry=restaurants` skip the menu |
| Last profile | — | Not remembered between visits; the menu always appears |
| Public services | — | Behaves as in v0.44 once chosen (same 819 locations, rules, report) |

If someone has a bookmark and wants to land straight on public services, give them
`engine.html?industry=public`. The plain URL opening on the menu is intended.

## 2. What arrived between v0.44 and v0.55.2

- **v0.45–v0.52 · National retail.** Country packs (Peru and Colombia, with Colombian geography),
  profiles as data, the NAF NAF profile (90 stores), sales pace and conversion, store systems,
  demand-shortfall signals, the fixed daily task schedule, retail report slide, Spanish throughout.
- **v0.53 · Restaurant chains.** The Delosi profile: seven brands, 476 venues from a researched
  location file (real candidates plus generated venues), one simulated CEDI, orders and sales by
  channel, equipment and cold chain, two-limit supplies, soles at risk per incident, customer voice,
  request clock, industry menu at start.
- **v0.54 · Restaurant realism.** Crew against the planned shift, device and machine faults,
  partial utility issues, supplies consumed by what each brand sells; counts instead of percentages.
- **v0.55 · Detail panel.** Every card icon opens its own tab (Crew · Utilities · Systems ·
  Equipment · Supplies · Delivery · Communications · Signals); chain of command with escalation.
- **v0.55.1–v0.55.2 · Card polish.** One-line footer with delivery share and a meter to the day's
  goal; colours are steady, and an icon flashes only when a red problem has gone 30 minutes
  without anyone acknowledging it; the goal is only judged once enough of the day has passed.

Everything restaurant-specific is switched on by the profile; public services and retail are
checked on every build to behave exactly as before.

## 3. Before you deploy

1. **Back up the live files** — keep the current `engine.html` and `vendor/` as `engine.v044.html`
   / `vendor.v044/`. That is the whole rollback.
2. **Compare anything you customised in production** against the new package, especially
   `deploy_adapter.js` behaviour (AI endpoint `/api/ai`, SMS and report endpoints) and the
   `server/` folder, and diff the new `server/` against what you deployed. The restaurant rounds
   did not touch the adapter or `server/`; if anything differs, it dates from the retail rounds and
   should be reviewed before redeploying. If you edited the built `engine.html` directly, those
   edits must be re-applied or, better, sent back to us.
3. **Supabase functions and schema** — redeploy only if your diff in step 2 shows changes.

## 4. Deploy

Exactly as in `DEVELOPER-HANDOFF.md` §2: copy `engine.html`, `index.html` and `vendor/` to the web
root. The file is about 2.7 MB (v0.44 was about 2 MB).

## 5. Check, in this order

1. The plain URL opens on the industry menu, and it cannot be closed until a choice is made.
2. Public services draws Peru with **819** locations; incidents appear within a minute.
3. National retail draws Colombia with **90** stores.
4. Restaurant chains draws Peru with **476** venues; clicking a card icon opens its tab.
5. Spanish renders (language switch in the sidebar).
6. The daily report generates as an eight-page PDF.
7. BOBee answers through `/api/ai`, and SMS/email still work as simulated or real, as before.

Then complete `ACCEPTANCE-CHECKLIST.md` (updated for v0.55.2) and return it.

## 6. Rollback

Put `engine.v044.html` back as `engine.html` (and `vendor.v044/` if you replaced it). Nothing else
is affected.

## 7. Building from source (only if you maintain the engine yourselves)

The handoff package (`MetaMAP_handoff_v0_55_2.zip`) has the sources, `build.py`, `deploy_build.py`
and the test set. `HANDOFF.md` and `STEP-BY-STEP.md` explain the build and the tests; run the
function guard (`tFN.py`) first, then the rest.

## 8. Known open items

- The report's road and basic-services slides still follow the public-services layout for retail
  and restaurants.
- Restaurant location data: 78 Peru venues lack a district; only Starbucks has a published count.
- Ecuador and Bolivia for Delosi are planned as a flag switch in a later round.

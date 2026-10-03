# MetaMAP — upgrading production to v0.56.4

This upgrade applies whether production runs **v0.55.2** or still **v0.44**. MetaMAP deploys as one
self-contained `engine.html` plus `vendor/`, so versions can be skipped: you replace files, there is
nothing to migrate and no data format changes. If production still runs v0.44, read
`UPGRADE-v0.44-to-v0.55.2.md` for what arrived before v0.55.2, then this page.

**Nothing on the server side changed since v0.55.2**: `deploy_adapter.js` behaviour (the AI endpoint
`/api/ai`, SMS and report endpoints), the Supabase functions and `schema.sql` are identical. This
release is the static files only.

## 1. What changes for users

| | v0.55.2 | v0.56.4 |
|---|---|---|
| Industries | Public services · National retail · Restaurant chains | the same, plus **Financial services** (SuRed, Colombia, about 10,000 cash points) |
| Direct links | `?industry=public` · `retail` · `restaurants` | the same, plus `?industry=financial` |
| Map at country and region zoom | region circles plus incident zones and pins | **numbered circles only** — one per department/region plus one per major metropolitan area on a desktop; incident zones, signals and pins appear as you zoom in |
| Phones | search suggestions were hidden behind the menu panel | suggestions show, opening with the best matches |
| Large numbers | full digits | **K** from 1,000 (10K; 10,1K in Spanish) |
| Detail-tab tooltips | stayed English after switching to Spanish | follow the language |
| Merged incident chip | plain browser tooltip | a list on hover, each incident in its colour; a click opens the first |
| Geo search | searched Peru's places for every industry (a bug) | searches the loaded country (Colombia's 1,122 municipalities for NAF NAF and SuRed) |
| Restaurant cards | — | unchanged (verified card by card against v0.55) |

## 2. What arrived between v0.55.2 and v0.56.4

- **v0.56.0** — Financial services (SuRed): the fourth industry; one card template for every venue
  industry; a staggered simulation tick for networks over 1,500 locations.
- **v0.56.1** — SuRed's card reduced to its essentials; the Transactions tab; K counts; the left menu
  follows the loaded country (Geo, names, vocabulary); Cash level filter; several Spanish fixes; a
  midday stop and false "behind pace" signals fixed.
- **v0.56.2** — a Communications slot on SuRed's card (public services' Conversations slot now has the
  same colours); commission shown in pesos; phone search fixed; dense-map circles.
- **v0.56.3** — numbered circles until city zoom, in every industry; a closed incident no longer leaves a
  trail of false signals; SuRed's PSE icon.
- **v0.56.4** — fewer, larger circles (department plus metro at national zoom; a screen-space grid below
  that and on phones); the green "resolved" orb shows at every zoom again.

## 3. Before you deploy

1. **Back up the live files** — keep the current `engine.html` and `vendor/` as, for example,
   `engine.v0552.html` / `vendor.v0552/`. That is the whole rollback.
2. If you edited the built `engine.html` directly in production, those edits must be re-applied — or,
   better, sent back to us so they go into the source.
3. Supabase: nothing to redeploy.

## 4. Deploy

Exactly as in `DEVELOPER-HANDOFF.md` §2: copy `engine.html`, `index.html` and `vendor/` to the web
root. The file is about 3.7 MB (v0.55.2 was about 2.8 MB).

## 5. Check, in this order

1. The plain URL opens on the industry menu with **four** tiles.
2. Public services: Peru, **819** locations, **32** numbered circles on a desktop's opening view.
3. National retail: Colombia, **90** stores. Restaurant chains: Peru, **476** venues.
4. Financial services: Colombia, **10K** points, **40** numbered circles; cards show five slots and a
   peso commission; the detail tab row includes **TXNS** and **Compliance**.
5. Zoom into a city: circles split, incident zones appear, pins appear once readable.
6. On a phone: every left-menu search shows suggestions.
7. Spanish renders (language switch in the sidebar).
8. The daily report generates; BOBee answers through `/api/ai`; SMS and email work as before.

Then complete `ACCEPTANCE-CHECKLIST.md` (updated for v0.56.4) and return it.

## 6. Rollback

Put the backed-up `engine.html` back (and `vendor/` if you replaced it). Nothing else is affected.

## 7. Building from source (only if you maintain the engine yourselves)

The developer package's `2-source/` folder has the sources, portable `build.py` and `deploy_build.py`,
the SuRed data builder and the test set. Its `README.md` gives the three commands; `HANDOFF.md` and
`STEP-BY-STEP.md` explain the engine and the tests.

## 8. Known open items

- SuRed's points are unverified (5,717 from its master) or generated (the rest), and its commission
  rates, cash ceilings and payment calendar are simulation values until SuRed shares real ones.
- The supervising authority for each SuRed service line (MinTIC postal regime or SFC) is to be verified.
- Switching industries several times within one script step (browser console only) can log a Leaflet
  error; the menu cannot trigger it.
- The public-services and retail cards move onto the shared card template in a later round.

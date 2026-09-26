MetaMAP — Geo Command Engine (simulation prototype)
Deployment package · v0.55.2

CONTENTS
  engine.html            the whole application, one self-contained file
  index.html             redirect to engine.html (only needed if the server cannot redirect)
  vendor/                Leaflet 1.9.4, jsPDF 2.5.1, DM Sans web fonts
  server/
    UPGRADE-v0.44-to-v0.55.2.md      READ FIRST if production runs v0.44
    DEVELOPER-HANDOFF.md             START HERE — step-by-step deployment for developers
    ACCEPTANCE-CHECKLIST.md          what the developer fills in and returns when done
    COMMUNICATIONS-IMPLEMENTATION.md reference: contracts, limits, test plan
    supabase/                        schema.sql + three Edge Functions (Twilio, Resend)

INSTALL
  Copy engine.html, index.html and vendor/ to the web root so the page is served at:
      https://metamap.bzzzbx.com/engine.html
  Keep the vendor/ folder next to engine.html — the page loads nothing from the internet.
  server/ is source for your developers; it does not belong on the web root.

AI (BOBee)
  BOBee posts to /api/ai on the same host, the service BOb already uses.
  If that route is not available the page still works; BOBee falls back to locally
  generated insights and says the AI service is not connected.

SMS ALERT
  The national emergency can be armed on a timer and text the people you list, then ask them
  to confirm they are safe and track who never answers. It runs simulated out of the box.
  For real messages see server/SMS-ALERT-IMPLEMENTATION.md — Supabase Edge Functions plus
  Twilio, with the schema and the request/response contract.
  Every message is marked as a drill and the send function rejects any that is not.

WHAT CHANGED IN v0.55.2 (restaurants only)
  · Colours are steady. An icon flashes only when it has been red for 30 minutes and nobody has
    acknowledged it (an acknowledged request or an incident in monitoring counts as addressed).
    A marketplace outage shows red at the venue but does not flash — it is handled centrally.
  · The sales meter turns red only when the projected end of day is under 80% of the goal, and only
    once 40% of a normal day has passed or in the last two hours; early sales are never red.
  · Delivery platform incidents use the bicycle icon everywhere. Task times follow each brand's hours.

WHAT CHANGED IN v0.55.1 (restaurants only)
  · One-line footer: orders · bicycle and delivery share │ a thin meter to the day's goal · sales.
    The meter is blue, and red when sales fall behind pace; the goal shows on hover.
  · Any icon approaching trouble flashes, and keeps flashing once red; the bicycle flashes when
    delivery is at risk and turns red when it is poor. The share itself is always neutral.
  · Icons 17 px; more room between header, icons, chips and footer; bold only for name and OPS.

WHAT CHANGED IN v0.55 (restaurants only)
  · Every card icon opens its own tab in the detail panel: Overview · Crew (attendance, tasks) ·
    Utilities · Systems · Equipment · Supplies · Delivery · Communications · Signals (alerts,
    alarms, anomalies, actions).
  · Supplies (Insumos) is one overall percentage; the tab shows each category against its own threshold.
  · The card footer is orders · delivery share (coloured by delivery health) · sales (coloured by
    pace), with compact money (S/ 3.2k). Icons are 10% larger.
  · Communications shows the chain of command: store manager → area manager → brand operations
    lead → COO, with automatic escalation of unanswered requests.

WHAT CHANGED IN v0.54 (restaurants only)
  · Venues are mostly healthy but rarely perfect: crew follows the planned shift for each hour,
    devices and machines have short faults, cleaning and warm spells, utilities dip, and supplies
    run down unevenly by what each brand sells.
  · The restaurant card counts instead of percentages: crew present/planned, systems and equipment
    working/total, supplies categories within limits. Utilities stays a percentage.
  · "Supplies" (Insumos) replaces "Inventory" for restaurants; the pace marker on the sales bar is
    gone (the bar's colour shows pace); the activity filter's example text follows the profile.

WHAT CHANGED IN v0.53
  · Third industry: restaurant chains, modelled on Delosi S.A. (Peru) — seven brands, about 475
    venues from the data team's location file plus generated venues, and one simulated CEDI.
  · The page opens on an industry menu with nothing preloaded. A direct link skips it:
      engine.html?industry=public · engine.html?industry=retail · engine.html?industry=restaurants
  · After deploying, check in this order: the menu appears; Public services draws Peru with 819
    locations; National retail draws Colombia with 90 stores; Restaurant chains draws Peru with 476
    venues and the new card (crew, utilities, systems, equipment, inventory; orders and sales at the
    foot); Spanish renders; a venue opens its detail panel; the daily report generates.

WHAT CHANGED IN v0.44
  · The disabled microphone keeps a solid white face like every other map control; only the icon
    greys and gains the strike. Previously the whole button dropped to 45% opacity, which read as
    a missing background.
  · The Communications and Activity tab icons are drawn at a heavier stroke, so the fine-line SVGs
    match the weight of the bitmap icons beside them. They were never dimmer — every inactive tab
    is at 45% — they simply looked weaker.

WHAT CHANGED IN v0.43
  · Build guard (tFN.py). Twice a patch removed a function it was editing around — clusterCells,
    then boOpen — and both times the build and node --check still passed because the callers were
    guarded. The guard checks three things against a real browser: every declared function exists
    at runtime (494), every guarded call and inline handler resolves (47 + 51), and the function
    inventory is diffed against a snapshot (functions.txt) so a disappearance is named and fails
    the run. Verified by deleting boOpen again: node --check passed, the guard caught it.
  · Microphone: no longer hidden when it cannot work. It stays in place, greyed with a strike
    through it, and says why when tapped — a button that vanishes is its own puzzle.
  · Activity tab restructured. The four blocks (attended/occupancy, staff on duty, supplies, main
    status issue) sit at the top; everything below folds into accordions, each showing its
    headline value on the closed row: Operational status 83%, Incidents 2 active, Basic services
    100%, Weather, Activity today, People sheltered, Work today, Activity feed. Operational
    status opens by default, the rest stay closed, empty sections are not shown at all, and the
    open/closed state carries between locations within a session.

WHAT CHANGED IN v0.42
  · FIXED — the BOBee panel was empty on first open. boOpen(), the function that initialises the
    panel, had been removed by an earlier patch to the insight code; every later test happened to
    touch a mode or scope button first, which initialises it by another path. Restored: opening
    the panel now picks the scope, syncs the labels and generates the Situation insight at once.
  · Interaction mode is honest about where it cannot work:
      – No speech recognition (Firefox): the microphone button is not shown at all, and the check
        explains why.
      – Embedded in a frame that does not delegate the microphone (the claude.ai artifact): the
        browser gives no prompt and no error, recognition just ends. That case is now detected
        after two dead starts; the mic switches off, the button disappears, and the message says
        to open MetaMAP in its own tab — instead of the old wording that sent people to browser
        settings, which cannot help.
      – Granting the microphone to the outer site does NOT reach a cross-origin frame. Interaction
        mode works on https://metamap.bzzzbx.com/engine.html opened as a normal tab.
  · New: "Check the microphone" in the sidebar reports recognition availability, embedded or own
    tab, secure context, language and the permission state in one line.

WHAT CHANGED IN v0.41
  · The "border" beside the map buttons was the map's own background showing in the gap. The gap
    is now deliberate and even: 12px on every side, matching the incident bar above it.
  · BOBee no longer shows placeholder text while it waits. The card shows an animated
    "Analysing…" state until the answer arrives, so nothing is swapped underneath you and
    switching Focused/Global never shows the previous scope's line. The locally computed summary
    is now only a fallback, and when it is used the card says so.
  · The green orb keeps its size but its contents are much larger: icon 34px to 56px, title 13px
    to 17px, detail 11px to 13px — readable in the two and a half seconds it is on screen.
  · Fixed: the focus line read "Lima, Callao and Callao" when exactly two regions were in view.

WHAT CHANGED IN v0.40
  · FIXED — on mobile, tapping a rail button with a location panel open appeared to do nothing.
    The taps were working: the flyout opened at z-index 350, behind the panel at 1200, so it was
    never seen. The sheet and its backdrop now sit above the panel, which stays open underneath —
    so closing the sheet returns you to the location, and BOBee keeps it in focus.
  · The BOBee focus line now describes what is actually in view instead of "the current map
    view": how many locations, which regions, how many critical / at risk / not reporting, and
    the active filters. Examples:
        Whole country: 819 locations (2 critical, 265 at risk).
        Map view: 79 locations in 4 regions (12 at risk).
        Whole country: 271 locations (2 critical, 269 at risk) · filters: status 0–69%.
        Focused location: CEM San Juan de Lurigancho, San Juan de Lurigancho, Lima.

WHAT CHANGED IN v0.39 (mobile)
  · The microphone control was drawn larger than its neighbours; it now matches the other map
    controls at 15px.
  · Opening a location no longer hides the main menu: the panel stops above the rail and the rail
    sits above it, so BOBee is always one tap away with that location still in focus.
  · BOBee now takes the open location as its focus. The focus line was being overwritten by the
    filter layer with "All operations"; the panel owns it now and refreshes when the panel opens.
  · The header bee is gone on small screens — the rail already has one — and "MetaMAP" shows in
    small black type instead.
  · The gap between the header and a flyout is gone: the sheet fills everything between the
    header and the rail.

WHAT CHANGED IN v0.38
  · FIXED — the map failed to load on mobile. Leaflet was fetched from a CDN with a plain script
    tag; when that request does not complete (phone network, embedded frame, CSP) the map never
    appeared and the fallback message showed instead. Leaflet is now inlined in the file, so the
    map depends on no network at all. Verified with every CDN blocked: map draws, 25 region
    circles, no fallback. The engine file grew by 147 KB.
  · The green resolved orbs were drawing as corner text for the same reason — no map, no layer to
    draw on. They are back on the map now that it loads.
  · jsPDF is still fetched on demand but now tries a second host if the first is unreachable, so
    the report works on a phone too.
  · BOBee insights are no longer a wall of text. One item at a time in a compact card: a priority
    label, one short sentence, then More to expand that item in place and Next tip to advance,
    with dots and a counter. Swipe works on touch. Situation stays a single item.
      – One request returns every item, so More and Next are instant.
      – The model is asked for JSON with a hard item and length limit; if it answers in prose
        anyway the reply is split into items and stripped of markdown, so "**Priority 1:**"
        can no longer reach the screen.
      – In interaction mode, "BOBee, next" advances the tip and reads it aloud.

WHAT CHANGED IN v0.37
  · Cards: the percentage lost its pill border and background, moved flush right, and now carries
    OPS beneath it in light grey. Locations with no report keep the dash, so the column stays
    regular. Incident cards were flipped to match — percentage on top, OPS beneath.
  · Cards header: simpler location icon (pin over a route marker).
  · Location panel: the Activity tab is finally an icon — this was missed in v0.36.
  · Header: the bee and wordmark are back to full black. Still not a control.
  · NEW — Interaction mode. A microphone beside the speaker in the map controls. While on,
    speech is discarded until it hears "BOBee", then the question goes to BOBee with the current
    focus and the answer is spoken back. For fifteen seconds afterwards the window stays open, so
    follow-up questions need no wake word. Saying "BOBee" over the narration interrupts it.
      – The mic never turns itself on: Play plays, the microphone is its own control.
      – A banner shows whenever the mic is live, and recognition is suspended while BOBee speaks
        so it cannot hear itself.
      – Recognition follows the interface language; one language at a time.
      – First use runs a 30-second calibration: say "BOBee" three times and MetaMAP records how
        your voice actually transcribes, stored per profile. Re-runnable from the sidebar.
      – Note for operations centres: Chrome transcribes speech through Google's service, so the
        audio leaves the machine. The microphone is never on without a visible indicator.
      – Microphone access may be blocked inside an embedded frame; verify on the deployed host.

WHAT CHANGED IN v0.36
  · Left rail: every icon now has a hover tooltip and an accessible name.
  · Status left the rail; its operational-status and occupancy controls moved into Observe, so
    nothing was lost and the rail is shorter. The Observe badge counts both tags and ranges.
  · Location panel: the Activity tab is now its icon, and on mobile the panel runs the full
    height of the screen, over the header.
  · Incident cards: swipe sideways to dismiss on touch devices, and the stack now sits behind
    the sidebar, the flyouts and the detail panels instead of over them.
  · Cards header: the word "Locations" is replaced by a building-and-pin icon (drawn as an SVG
    in the interface stroke style); "in view" stays as words when the list follows the map.
  · BOBee is now one entry point. The header button, the location panel tab and the incident
    panel tab are gone; the rail panel carries everything.
      – three modes in the panel header: Situation · Recommendation · Prediction
        (ES: Situación · Recomendación · Predicción)
      – a Focused / Global toggle beneath them
      – opens on Situation, generated immediately; the other two generate when picked
      – one chat thread across modes and scope changes, with a line marking where the view moved
      – Focused reads the selected location, the open incident, or the current view and filters
  · The header bee and MetaMAP wordmark remain as branding: light grey and no longer clickable.

ADDED IN v0.35.1
  · server/DEVELOPER-HANDOFF.md — the step-by-step a developer follows end to end: what they
    receive, what they must provide, serving the engine, the AI route, Supabase schema/secrets/
    functions, the Twilio webhook, what to configure in the hamburger menu, how to make those
    settings permanent for production, a layered test plan, the safety rules, what is real
    versus simulated, and where each section lives inside engine.html.

WHAT CHANGED IN v0.35
  · Branding: the crest, cover photograph, COES lockup and a source logo can be uploaded in the
    sidebar. They are stored with the profile — so they travel with the downloaded profile JSON —
    and the report embeds them where the placeholders were. Uploads are re-encoded to bounded
    JPEG through a canvas, because jsPDF's PNG decoder is slow and rejects some valid files.
  · Daily report by email, mirroring the SMS alert: on/off, start now or in 1–10 minutes after
    Apply Config, subject (defaulted from the report title and date), covering message,
    recipients with add/remove, and an endpoint URL. Blank endpoint simulates: the PDF downloads
    locally and the panel records who it would have gone to.
  · The covering message carries the simulation notice; the PDF itself stays clean.
  · New Edge Function metamap-report (Resend) beside metamap-sms (Twilio), and the developer
    guide now covers both channels: secrets, deployment, contracts, size limits and a test plan
    for each. See server/COMMUNICATIONS-IMPLEMENTATION.md.

PREVIOUS (v0.34)

  · The downloadable report is replaced by an eight-page 16:9 deck following the COES Resumen
    Diario: cover · operational status of locations · incidents in force (their DEE table shape
    with the departments/provinces/districts bars) · road network by department · seismic
    movements with callouts · meteorological warnings with level colours · basic services and
    infrastructure · critical locations and message confirmations.
  · The Peru maps are drawn as vectors from the same department polygons the map uses, so they
    stay crisp at any size — no screenshots.
  · It follows the selected timeframe and filters, and is written in the profile's language
    (Spanish for MIMP) regardless of the interface language.
  · Space is reserved for the institutional crest and photograph; the real assets drop in
    without layout changes.
  · Generated from the engine at roughly 500 KB.

PREVIOUS (v0.33)

  · Dark blue service cards were effectively unreachable: a basic-services card needed severity
    3, which itself needs twelve affected locations, and only then could it go dark. A service
    card now appears when it is severe OR when the locations under it are failing, so the dark
    blue state — services down and operations bad — actually occurs. Measured over a long run:
    8 dark blue, 26 white-blue, 2 full red, 61 white-red, 40 unconfirmed.
  · Fixed an ordering bug found while checking that: the card gate ran before zone exposure was
    computed, so an empty zone read as "no reports" and let severity-2 service cards through.
  · The green orb now carries the hazard's own icon above its text, so you can see what was
    resolved without reading it.

PREVIOUS (v0.32)

  · Fixed: the map flew to severity-3 arrivals even with Play stopped. That clause was left
    unscoped when the "most severe takes over" rule went in. The map now moves only while Play
    is running.
  · Play is now Stop: it ends the walk, clears the focus and marking, and flies back to the
    whole country. Audio is independent — the voice keeps narrating arrivals either way.
  · Cards now have three levels per family, so red no longer means "an incident exists" but
    "an incident and the network under it is failing":
        white + dotted border  = reported, unconfirmed
        white + solid border   = confirmed, operations holding
        full colour            = confirmed and operations failing (OPS under 45%, or no report)
    Hazards use red; basic services use dark blue (#1C5A86), because within one hue severity has
    to read as depth — a pale tint at the top of the ladder would look friendlier than the rung
    below it.
  · The voice now covers basic services, but only the dark blue ones, and never ahead of a
    hazard: the queue sorts hazards first, then by severity.
  · Resolved incidents no longer conflict with the narration. A closed event is dropped from the
    voice queue, its card is dismissed, and if the voice is mid-sentence about it the green orb
    waits until the sentence ends.

PREVIOUS (v0.31)

  · Play no longer opens the Incidents panel. The incident being read is the card bottom right;
    the left column stays on locations, so you see the neighbourhood around the event instead
    of the same incident twice.
  · While a zone is focused, the locations inside it are marked with a red edge and sorted to
    the top of the left column — so an isolated problem and a province-wide one look different
    at a glance.
  · No "IN FOCUS" or "TOUR" wording. A Play stop raises an ordinary incident card with the
    normal kicker.
  · The map no longer darkens: the focused zone's fill dropped from 0.20 to 0.10.
  · The flash on the card being read is much stronger — brighter halo, thicker ring and a
    slight scale pulse — and it runs for exactly as long as the voice is speaking.
  · Pause clears the focus, the marking and the sorting, and hands the map back.
  · Resolved incidents keep the green orb at their own location, with no corner fallback: zoom
    out to see the good news across the country.

PREVIOUS (v0.30)

  · Voice and cards are now one system. Previously five separate code paths spoke — new
    incidents, signals, updates, Play stops, national emergency — and only one of them flashed
    a card, which is why the narration seemed unrelated to what was on screen. Every card now
    registers with a single narration controller: it reads the most severe card waiting, that
    card flashes while it is read, and its dismiss timer is frozen until the voice finishes,
    so the card you hear is always the card you can see. Nothing is spoken without a card.
  · Play mode stops now raise an IN FOCUS card, so the tour narration has something to point at.
  · Wording shortened so the kicker never wraps: SEV, LOCS, MSGS/MSJS, REP, COMM./COM.,
    WEATHER/CLIMA, TRAFFIC/TRÁNSITO, SERVICES/SERVICIOS, SIGNAL — UNCONFIRMED, SEV UP TO 3.
  · OPS label and percentage are white on the solid cards and dark ink on the light blue ones,
    so both read clearly.

PREVIOUS (v0.29)

  · Locations: the simulation now seeds from 106 places across all 25 regions instead of 41
    across 10. Lima's share drops from a third to 16%, and every region has a presence, so the
    national view is no longer a pile on Lima with an empty country around it.
  · Macro-regions and metro areas extended to match (9 macro-regions, 9 metro areas).
  · Cards: the severity number on the right is gone; severity is back in the grey kicker line
    above the title. The right-hand column now carries OPS — operational status of the
    locations inside the zone — as a percentage in the status colour.
  · Cards: the close button is gone. Cards dismiss themselves; clicking opens the details.
  · Voice: when several cards arrive together the voice reads only the most severe of them,
    and the card being read flashes. A more severe arrival takes over. The map only follows
    automatically during Play or for a severity-3 event.
  · Tour cards (the black ones) removed. Play mode still moves the map and narrates.
  · Good news: the green orb now grows from the incident's own location and carries its message
    inside the circle, then fades.
  · Highlighting one location on a card zooms to street level (16) instead of city level (11).
  · Spanish: the last "ocupación residencial" in the spoken summary is now just "ocupación".

PREVIOUS (v0.28)

  · Map — ROOT CAUSE of the circles in the ocean, across four earlier attempts: a CSS rule on
    .mm-cluster set position:relative, overriding Leaflet's position:absolute. The circles fell
    into normal document flow and slid progressively downward — up to 164 px for the tenth one
    — so their drawn position had nothing to do with their coordinates. Every geometric fix
    before this was correct and invisible. Now verified two ways at three window sizes: drawn
    position matches coordinates to 0 px, and no circle edge falls on water in the rendered
    pixels.
  · Cards: the people count sits immediately right of the icon.
  · Good news: a resolved incident now grows a green orb out of its own place on the map, with
    the message beside it, then fades. Events with no location (an SMS safe confirmation) still
    use the quiet corner message.

PREVIOUS (v0.27)

  · Map: the circle test now runs against the department polygons the map actually draws, not
    the coarse country outline that caused three earlier failures. Sixteen points around each
    circle's edge must all fall on land; the circle shrinks, or moves inland over its
    neighbour, until they do. Verified at four window widths and three zoom levels.
  · Cards: people affected sits on the title line, right of the city, behind a thin divider.
    The close button moved to the top-right corner with the severity number beneath it.
  · Cards: every card uses the hazard's own icon. Reported signals no longer show the
    communications icon — the dashed border already says unconfirmed. Same on the map, where a
    signal now draws its hazard icon in a dashed ring.
  · Cards: basic services no longer raise signal cards at all, and only update the stack at
    severity 3, so blue stays rare.
  · Location cards: the incident chip is blue when every incident on it is a basic service.

PREVIOUS
  v0.26  National emergency alert on a timer with SMS confirmation tracking; circles capped by
         coastal clearance; people under the icon; voice for hazards only; occupancy wording;
         green orb for good news.
  v0.25  Cards follow the map view; all cards solid, dashed for unconfirmed; people affected
         returned; larger severity number; text links removed.
  v0.24  Zones coloured by family (blue services, red hazards); gauge/drop utilities icon;
         two-line cards; four in the stack.
  v0.23  Short operation chips; red clock for overdue; attended-today fixed; region circles.

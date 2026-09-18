MetaMAP — Geo Command Engine (simulation prototype)
Deployment package · v0.35.1

CONTENTS
  engine.html            the whole application, one self-contained file
  index.html             redirect to engine.html (only needed if the server cannot redirect)
  vendor/                Leaflet 1.9.4, jsPDF 2.5.1, DM Sans web fonts
  server/
    DEVELOPER-HANDOFF.md             START HERE — step-by-step deployment for developers
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

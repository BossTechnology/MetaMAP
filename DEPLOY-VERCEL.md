# MetaMAP en Vercel — SMS y reporte por email

Este despliegue **no** usa las Supabase Edge Functions de `server/supabase/functions/`. Las tres
funciones corren en Vercel, en el mismo dominio que el engine:

| Ruta | Reemplaza a | Qué hace |
|---|---|---|
| `/api/ai` | — | BOBee → proxy público de BOb (`bob.bzzzbx.com/api/ai`) |
| `/api/sms` | `metamap-sms` | Envía SMS por Twilio y devuelve respuestas |
| `/api/sms-inbound` | `metamap-sms-inbound` | Webhook de Twilio para respuestas entrantes |
| `/api/report` | `metamap-report` | Envía el Resumen Diario por Resend |

Mismo contrato JSON que el del proveedor (`server/COMMUNICATIONS-IMPLEMENTATION.md` §3), así que
`engine.html` no cambia. Al ser mismo origen no hay CORS, ni JWT, ni `ALLOWED_ORIGIN`, y la CSP
sigue en `connect-src 'self'`. Supabase se usa solo como base de datos.

## 1. Base de datos

Aplicar `supabase/migrations/20260918120000_metamap_comms.sql` en el proyecto Supabase
(SQL editor, o `supabase db push`). Crea las dos tablas del proveedor más `metamap_report_sent`.

## 2. Variables de entorno (Vercel → proyecto `metamap` → Settings → Environment Variables, Production)

| Variable | Ejemplo | Para |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | ambos |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` o la service_role antigua | ambos |
| `TWILIO_ACCOUNT_SID` | `AC…` | SMS |
| `TWILIO_AUTH_TOKEN` | | SMS (también valida el webhook) |
| `TWILIO_FROM` | `+15550001111` | SMS |
| `TWILIO_WEBHOOK_URL` | `https://metamap.bzzzbx.com/api/sms-inbound` | SMS — debe ser idéntica a la configurada en Twilio |
| `SMS_ALLOWED_NUMBERS` | `+51*,+57*` | SMS — números exactos o prefijos con `*` (hoy: todo Perú y Colombia) |
| `SMS_DAILY_LIMIT` | `200` (por defecto) | SMS — tope de envíos reales en 24 h |
| `RESEND_API_KEY` | `re_…` | email |
| `REPORT_FROM` | `COES MetaMAP <notifications@bzzzbx.com>` | email — dominio **verificado en Resend** |
| `REPORT_ALLOWED_RECIPIENTS` | `@boss.technology,@mimp.gob.pe` | email — direcciones o `@dominio` |
| `REPORT_DAILY_LIMIT` | `50` (por defecto) | email — tope de reportes enviados en 24 h |

Las listas permitidas no son opcionales: sin ellas cada envío responde 403. La página es pública
y los endpoints no llevan secreto, así que sin lista cualquiera con `curl` podría mandar SMS o
correos a nuestra costa desde nuestro dominio. Al abrir países o dominios enteros, el tope diario
limita el costo de un abuso; al alcanzarlo, los envíos responden 429 hasta que pasen 24 h.
El consentimiento de cada participante (ver `/sms-consent`) queda a cargo del coordinador: el
sistema ya no lo verifica número por número.

Después de cambiar variables hay que redesplegar (`vercel deploy --prod --scope bosstechnology`).

## 3. Twilio

Consola → el número → **A MESSAGE COMES IN** → HTTP POST →
`https://metamap.bzzzbx.com/api/sms-inbound`. Las peticiones sin firma válida de Twilio se rechazan.

## 4. En el menú de MetaMAP

Los endpoints vienen fijos en `engine.html` (handoff §6, opción 2): `NECFG.smsEndpoint = '/api/sms'`
y `RPCFG.endpoint = '/api/report'`. El menú aparece ya lleno y los envíos son reales para los
destinatarios de las listas permitidas. Para una demo simulada, borrar el campo antes de aplicar.

**Al recibir una versión nueva de `engine.html` hay que repetir estos dos cambios**; el proveedor
los entrega vacíos.

## 5. Protecciones del backend

El engine v0.35 reenvía mensajes en tres situaciones (ver abajo). El backend lo contiene:

- Cada tipo de SMS (alert, welfare, remind, ack) va a un número como máximo una vez cada 10 min
  y, salvo la alerta, como máximo una vez por respuesta recibida. Los repetidos responden
  `200 {"ok":true,"suppressed":true}` y quedan registrados con `status = 'suppressed'`.
- Las respuestas se anclan a la última alerta realmente recibida por cada número, no al id
  `NE-00N`.
- El mismo reporte (asunto + destinatarios) sale una vez cada 10 min. Solo se aceptan adjuntos
  PDF.
- Límite por IP: 120/min en `/api/sms`, 10/min en `/api/report`.
- Tope diario: 200 SMS y 50 reportes en 24 h (configurable con `SMS_DAILY_LIMIT` /
  `REPORT_DAILY_LIMIT`).

## 6. Prueba por capas

1. Endpoints vacíos → todo simulado (ya funciona en producción).
2. `/api/sms` con tu número en `SMS_ALLOWED_NUMBERS` → llega la alerta; a 1 min la pregunta;
   responde `SI` → llega la confirmación y el panel muestra **Safe**.
3. `/api/report` con tu correo en `REPORT_ALLOWED_RECIPIENTS` → llega con el PDF adjunto.

El engine solo muestra `HTTP <código>` cuando algo falla; el detalle está en los logs de Vercel
(`vercel logs`) y en las tablas `metamap_sms_sent` / `metamap_report_sent` (columna `error`).

---

## Issues found in engine.html v0.35 — for Boss.Technology

1. **Apply Config re-fires an armed alert and report.** `NECFG.mode` stays `'once'` after the
   alert fires, and `applyConfig()` calls `applyNationalConfig()` whenever mode is not `'off'`.
   Any later Apply Config — to change the language, say — declares a new emergency and texts
   every recipient again. `RPCFG.mode` behaves the same way for the report email. Suggested fix:
   return `mode` to `'off'` once it fires, or re-arm only when the national/report settings
   actually changed.
2. **Emergency ids restart at `NE-001` on every page load** (`NATIONAL.seq`). With a real
   endpoint, `{op:"replies", emergencyId:"NE-001"}` also matches replies from earlier drills, so
   people show as Safe from old answers. Suggested fix: send a unique id (e.g. `NE-001-<timestamp>`).
3. **An unclear reply triggers a welfare SMS every 15 s.** `nePollReplies` re-processes every
   reply on each poll; `neReply` only ignores contacts already `confirmed`/`help`, so an
   `unclear` contact is re-asked on every poll until they answer SI/NO. Suggested fix: remember
   which replies were processed (by `at` timestamp) and skip them.
4. **Error text is not shown.** `neSend` and `sendReportEmail` throw `'HTTP '+status` without
   reading the `{error}` body, contrary to COMMUNICATIONS-IMPLEMENTATION.md ("Whatever error
   text you return is shown to the operator").
5. **Handoff §4.3 deploys `metamap-sms` and `metamap-report` with JWT verification on**, but the
   engine sends no `Authorization` header. Every call gets 401 from the Supabase gateway without
   CORS headers, so it surfaces as a CORS error and points the reader at `ALLOWED_ORIGIN`.
   All three need `--no-verify-jwt`.
6. **The Supabase functions are callable by anyone.** `ALLOWED_ORIGIN` only restricts browsers;
   `curl` can text any number and email any address. `metamap-sms-inbound` does not check the
   Twilio signature. Recipient allowlists and signature validation close this.
7. Minor: README.txt refers to `server/SMS-ALERT-IMPLEMENTATION.md` (now
   COMMUNICATIONS-IMPLEMENTATION.md); COMMUNICATIONS-IMPLEMENTATION.md §5 refers to
   `national.js`; with the UI in English the report panel's status line reads in Spanish
   ("Sin envíos en esta sesión", "simulado"); the Spanish report's cover subtitle is in English
   ("Peru's Ministry of Women and Vulnerable Populations…").

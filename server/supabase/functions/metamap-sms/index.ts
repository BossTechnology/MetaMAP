// MetaMAP → Twilio. Deploy as a Supabase Edge Function.
// MetaMAP posts here; this function holds the Twilio credentials so they never reach the browser.
//
//   POST { op: "send",    to, body, kind, emergencyId }   → sends one SMS
//   POST { op: "replies", emergencyId }                   → returns replies received so far
//
// Secrets:  TWILIO_ACCOUNT_SID  TWILIO_AUTH_TOKEN  TWILIO_FROM  ALLOWED_ORIGIN
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SID    = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TOKEN  = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const FROM   = Deno.env.get("TWILIO_FROM")!;
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://metamap.bzzzbx.com";

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return new Response("method not allowed", { status: 405, headers: cors });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); }
  catch { return json({ error: "bad json" }, 400); }

  const op = String(payload.op ?? "send");

  // ── replies received so far for this emergency ─────────────────────────────
  if (op === "replies") {
    const { data, error } = await db
      .from("metamap_sms_replies")
      .select("from_number, body, received_at")
      .eq("emergency_id", String(payload.emergencyId ?? ""))
      .order("received_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json({ replies: (data ?? []).map((r) => ({ from: r.from_number, body: r.body, at: r.received_at })) });
  }

  // ── send one message ──────────────────────────────────────────────────────
  const to   = String(payload.to ?? "");
  const body = String(payload.body ?? "");
  const kind = String(payload.kind ?? "alert");          // alert · welfare · remind · ack
  const eid  = String(payload.emergencyId ?? "");

  if (!/^\+[1-9]\d{6,15}$/.test(to)) return json({ error: "recipient must be E.164, e.g. +51987654321" }, 400);
  if (!body || body.length > 480)    return json({ error: "body missing or too long" }, 400);

  // Every message is a drill. Refuse anything that does not say so.
  if (!/SIMULACRO|DRILL/i.test(body)) return json({ error: "body must be marked as a drill" }, 400);

  const form = new URLSearchParams({ To: to, From: FROM, Body: body });
  const tw = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${SID}:${TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const result = await tw.json();

  await db.from("metamap_sms_sent").insert({
    emergency_id: eid, to_number: to, kind, body,
    twilio_sid: result.sid ?? null,
    status: tw.ok ? (result.status ?? "queued") : "failed",
    error: tw.ok ? null : JSON.stringify(result).slice(0, 500),
  });

  if (!tw.ok) return json({ error: result.message ?? "twilio rejected the message" }, 502);
  return json({ ok: true, sid: result.sid, status: result.status });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

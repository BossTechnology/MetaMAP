// Twilio → MetaMAP. Deploy as a Supabase Edge Function with verify_jwt disabled,
// then set it as the "A MESSAGE COMES IN" webhook on your Twilio number (HTTP POST).
//
// Twilio posts application/x-www-form-urlencoded. We record the reply against the most
// recent alert sent to that number, so MetaMAP's "replies" call can pick it up.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const form = new URLSearchParams(await req.text());
  const from = form.get("From") ?? "";
  const body = (form.get("Body") ?? "").trim();
  if (!from) return twiml("");

  // the alert this reply belongs to
  const { data } = await db
    .from("metamap_sms_sent")
    .select("emergency_id")
    .eq("to_number", from)
    .order("created_at", { ascending: false })
    .limit(1);
  const eid = data?.[0]?.emergency_id ?? "";

  await db.from("metamap_sms_replies").insert({
    emergency_id: eid, from_number: from, body,
  });

  // MetaMAP sends the acknowledgement itself, so stay quiet here.
  return twiml("");
});

function twiml(msg: string) {
  const xml = msg
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}

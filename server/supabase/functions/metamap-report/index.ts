// MetaMAP → Resend. Deploy as a Supabase Edge Function.
// MetaMAP builds the Resumen Diario in the browser, base64-encodes it and posts it here;
// this function holds the Resend key and sends the mail with the PDF attached.
//
//   POST { op: "send", to: string[], subject, message, filename, pdfBase64 }
//
// Secrets:  RESEND_API_KEY  REPORT_FROM  ALLOWED_ORIGIN
//   REPORT_FROM must be on a domain verified in Resend, e.g. "COES MetaMAP <coes@bzzzbx.com>";
//   an unverified domain is the usual reason ministry addresses never receive anything.

const KEY    = Deno.env.get("RESEND_API_KEY")!;
const FROM   = Deno.env.get("REPORT_FROM")!;
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://metamap.bzzzbx.com";

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const to       = Array.isArray(p.to) ? (p.to as string[]).filter(Boolean) : [];
  const subject  = String(p.subject ?? "").trim();
  const message  = String(p.message ?? "").trim();
  const filename = String(p.filename ?? "resumen-diario.pdf");
  const b64      = String(p.pdfBase64 ?? "");

  if (!to.length)                       return json({ error: "no recipients" }, 400);
  if (to.some((a) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a)))
                                        return json({ error: "a recipient address is not valid" }, 400);
  if (!subject)                         return json({ error: "subject missing" }, 400);
  if (!b64)                             return json({ error: "pdf missing" }, 400);
  // base64 inflates by ~4/3; keep well inside Resend's 40 MB and the function's own limits
  if (b64.length > 12_000_000)          return json({ error: "pdf too large" }, 413);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return json({ error: "pdf is not base64" }, 400);

  const html = `<div style="font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111">
      ${message.split("\n").map((l) => `<p style="margin:0 0 10px">${escapeHtml(l)}</p>`).join("")}
      <p style="margin:18px 0 0;font-size:12px;color:#6b6b6b">MetaMAP · Boss.Technology</p>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to, subject,
      text: message, html,
      attachments: [{ filename, content: b64 }],
    }),
  });
  const out = await r.json();
  if (!r.ok) return json({ error: out.message ?? "resend rejected the message" }, 502);
  return json({ ok: true, id: out.id });
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

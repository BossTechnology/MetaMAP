// OPTIONAL — only if BOb's existing /api/ai cannot be reused.
// Supabase Edge Function "metamap-ai" (Deno). Deploy:
//   supabase functions deploy metamap-ai --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  ANTHROPIC_MODEL=claude-sonnet-5
// Then point nginx `location = /api/ai` at  http://<supabase-host>/functions/v1/metamap-ai
//
// Contract (what engine.html sends / accepts):
//   request  POST JSON { prompt: string, messages: [{role:'user',content}], max_tokens?: number, source: 'metamap', tier?: string }
//   response JSON { text: string }       (errors: 429 rate limited, 4xx/5xx failure)

const API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const MAX_TOKENS_CAP = 1000;          // hard cap per answer
const MAX_PROMPT_CHARS = 60_000;      // the engine sends a data snapshot with each question
const PER_MINUTE = 12;                // per visitor IP

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > PER_MINUTE;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!API_KEY) return new Response("AI not configured", { status: 503 });
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return new Response("Too many requests", { status: 429 });

  let body: { prompt?: string; max_tokens?: number };
  try { body = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const prompt = String(body.prompt ?? "").slice(0, MAX_PROMPT_CHARS);
  if (!prompt) return new Response("Missing prompt", { status: 400 });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: Math.min(Number(body.max_tokens) || 900, MAX_TOKENS_CAP),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) return new Response(`Upstream error ${r.status}`, { status: r.status === 429 ? 429 : 502 });
  const data = await r.json();
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  return new Response(JSON.stringify({ text }), { headers: { "content-type": "application/json" } });
});

/* ═══════════════════════════════════════════════════════════════════
   MetaMAP deployment adapter  (see README-deploy.md → "AI endpoint")
   Connects BOBee to the server-side AI endpoint used by BOb.
   Only this block needs to change if the endpoint's format differs.
   ═══════════════════════════════════════════════════════════════════ */
window.METAMAP_AI = Object.assign({
  endpoint: '/api/ai',     // same-origin path; the web server forwards it to BOb's AI service
  maxTokens: 900,          // cap per answer
  timeoutMs: 45000,
  minIntervalMs: 1500,     // client-side pacing between requests
  headers: {}              // e.g. { 'x-engine': 'metamap' } if the service needs it
}, window.METAMAP_AI || {});

(function () {
  var last = 0;
  function fail(code, msg) { var e = new Error(msg); e.code = code; return e; }

  // Request body: sends the most common shapes at once so an existing endpoint
  // can read whichever it expects (prompt | message | messages).
  function buildBody(prompt, opts) {
    var cfg = window.METAMAP_AI;
    return {
      prompt: prompt,
      message: prompt,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: cfg.maxTokens,
      source: 'metamap',
      tier: (opts && opts.modelTier) || 'quick'
    };
  }

  // Response: accepts plain text or common JSON shapes, including Anthropic's.
  function extractText(d) {
    if (d == null) return '';
    if (typeof d === 'string') return d;
    if (Array.isArray(d.content)) return d.content.filter(function (b) { return b && b.type === 'text'; }).map(function (b) { return b.text; }).join('');
    var keys = ['text', 'reply', 'response', 'completion', 'output', 'answer', 'result', 'content'];
    for (var i = 0; i < keys.length; i++) { var v = d[keys[i]]; if (typeof v === 'string' && v) return v; }
    if (d.message) return typeof d.message === 'string' ? d.message : extractText(d.message);
    if (d.choices && d.choices[0]) return (d.choices[0].message && d.choices[0].message.content) || d.choices[0].text || '';
    if (d.data) return extractText(d.data);
    return '';
  }

  async function sample(prompt, opts) {
    opts = opts || {};
    var cfg = window.METAMAP_AI;
    var wait = cfg.minIntervalMs - (Date.now() - last);
    if (wait > 0) await new Promise(function (r) { setTimeout(r, wait); });
    last = Date.now();
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, cfg.timeoutMs);
    var res;
    try {
      res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, cfg.headers),
        body: JSON.stringify(buildBody(prompt, opts)),
        signal: ctl.signal,
        credentials: 'same-origin'
      });
    } catch (e) { clearTimeout(t); throw fail('unavailable', 'AI endpoint unreachable'); }
    clearTimeout(t);
    if ([404, 405, 501, 502, 503].indexOf(res.status) >= 0) throw fail('unavailable', 'AI endpoint not available (' + res.status + ')');
    if (res.status === 429) throw fail('rate_limited', 'Too many AI requests');
    if (!res.ok) throw fail('failed', 'AI request failed (' + res.status + ')');
    var ct = res.headers.get('content-type') || '';
    var text = ct.indexOf('json') >= 0 ? extractText(await res.json()) : await res.text();
    if (!text) throw fail('failed', 'Empty AI response');
    if (opts.onText) { try { opts.onText({ text: text }); } catch (_) {} }
    return { text: text };
  }

  // The engine asks for capabilities through window.claude.use(name).
  // 'sample' → the AI endpoint above; anything else (e.g. 'downloads') → not
  // available, so the engine falls back to normal browser downloads.
  window.claude = {
    use: function (name) {
      return name === 'sample' ? Promise.resolve(sample) : Promise.reject(fail('unavailable', name + ' not available'));
    }
  };
})();

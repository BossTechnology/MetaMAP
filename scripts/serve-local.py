#!/usr/bin/env python3
"""Serve metamap/ with the same headers, redirect and rewrites Vercel applies in production,
so a new engine.html can be checked against the real Content-Security-Policy before deploying.
POSTs answer 503, which is how the page behaves when the API is not configured.

    scripts/serve-local.py [port]        then open http://127.0.0.1:<port>/
"""

import http.server
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'metamap')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
cfg = json.load(open(os.path.join(ROOT, 'vercel.json')))
GLOBAL = {h['key']: h['value'] for h in cfg['headers'][0]['headers']}
REWRITES = {r['source']: r['destination'] for r in cfg.get('rewrites', [])}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        for key, value in GLOBAL.items():
            self.send_header(key, value)
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/':
            self.send_response(307)
            self.send_header('Location', '/engine')
            self.end_headers()
            return
        if path in REWRITES:
            self.path = REWRITES[path]
        return super().do_GET()

    def do_POST(self):
        self.send_response(503)
        self.end_headers()
        self.wfile.write(b'not configured (local check)')


print(f'metamap/ on http://127.0.0.1:{PORT}/ with production headers')
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()

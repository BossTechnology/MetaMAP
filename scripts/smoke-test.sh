#!/usr/bin/env bash
# Production smoke test. Sends no SMS and no email: every messaging check stops at
# validation (allowlist or signature), which still proves secrets and database are wired.
# Usage: scripts/smoke-test.sh [base-url]
set -u
B=${1:-https://metamap.bzzzbx.com}
pass=0; fail=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; pass=$((pass + 1))
  else echo "  ✗ $1 — expected $2, got $3"; fail=$((fail + 1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
post() { code -X POST -H 'Content-Type: application/json' "$@"; }

echo "Engine"
check "/ redirects to /engine" 307 "$(code "$B/")"
check "/engine loads" 200 "$(code "$B/engine")"
check "security headers (CSP)" 1 "$(curl -sI "$B/engine" | grep -ci '^content-security-policy')"
check "vendor assets" 200 "$(code "$B/vendor/leaflet/leaflet.js")"

echo "AI (BOBee)"
check "/api/ai answers" 200 "$(post "$B/api/ai" -d '{"prompt":"Responde solo: ok"}')"

echo "SMS — nothing is sent"
check "secrets + database (replies)" 200 "$(post "$B/api/sms" -d '{"op":"replies","emergencyId":"smoke-test"}')"
check "number outside SMS_ALLOWED_NUMBERS refused" 403 \
  "$(post "$B/api/sms" -d '{"op":"send","to":"+10000000000","body":"SIMULACRO smoke test","kind":"alert"}')"
check "message without SIMULACRO refused" 400 \
  "$(post "$B/api/sms" -d '{"op":"send","to":"+10000000000","body":"smoke test","kind":"alert"}')"
check "inbound without Twilio signature refused" 403 "$(code -X POST "$B/api/sms-inbound" -d 'From=%2B10000000000&Body=SI')"

echo "Email — nothing is sent"
check "recipient outside REPORT_ALLOWED_RECIPIENTS refused" 403 \
  "$(post "$B/api/report" -d '{"op":"send","to":["smoke-test@example.com"],"subject":"x","pdfBase64":"JVBERi0="}')"

echo "Public pages"
for p in termsconditions privacypolicy sms-consent; do check "/$p" 200 "$(code "$B/$p")"; done

echo "Not exposed"
for p in api/_lib server/DEVELOPER-HANDOFF.md README.txt; do check "/$p" 404 "$(code "$B/$p")"; done

echo; echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]

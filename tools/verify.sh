#!/usr/bin/env bash
# Routine verification. `tools/verify.sh` (npm run verify) runs the unit tests, the static checks, the
# extended validation suite and the build; `tools/verify.sh --full` (npm run verify:full) also runs every
# browser test against the built site, each in a fresh Chromium profile. Exits non-zero on the first failure.
set -euo pipefail
cd "$(dirname "$0")/.."
full=0; [[ "${1:-}" == "--full" ]] && full=1

step(){ local name=$1; shift; local start=$SECONDS; printf '%-34s' "$name"; local log; log=$(mktemp)
 if "$@" >"$log" 2>&1; then echo "ok ($((SECONDS-start)) s)"; rm -f "$log"
 else echo "FAILED"; tail -40 "$log"; rm -f "$log"; exit 1; fi; }

step "unit tests" npm test --silent
step "syntax, contrast, interface" npm run check --silent
step "validation regressions" python3 -m unittest -q validation.test_protocol validation.test_mutations validation.test_product_protocol validation.test_product_comparison
step "certificate verifier" python3 -m unittest -q validation.verifier.test_verifier
step "validation suite (extended)" python3 -m validation.report --level extended --no-write
for t in validation/csss26/*.mjs; do step "CSSS26 $(basename "$t" .mjs)" node "$t"; done
step "build" npm run build --silent

if ((full)); then
 command -v chromium >/dev/null || { echo "chromium is required for --full"; exit 1; }
 tmp=$(mktemp -d); trap 'kill $(jobs -p) 2>/dev/null; wait 2>/dev/null; rm -rf "$tmp"' EXIT
 python3 -m http.server 5173 --bind 127.0.0.1 --directory dist >/dev/null 2>&1 &
 for t in tests/browser*.mjs; do # Includes tests/browser-cards.mjs (cards, Help, both conventions and themes).
  chromium --headless=new --disable-gpu --remote-debugging-port=9222 --user-data-dir="$tmp/$(basename "$t")" about:blank >/dev/null 2>&1 &
  browser=$!
  for _ in $(seq 50); do curl -s http://127.0.0.1:9222/json >/dev/null && break; sleep 0.2; done
  step "$(basename "$t" .mjs)" node "$t"
  kill $browser; wait $browser 2>/dev/null || true
 done
fi
echo "verification passed"

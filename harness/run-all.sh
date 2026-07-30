#!/bin/bash
# =====================================================================
# run-all.sh — everything. Run before calling any engine change done.
# =====================================================================
# EVERY CHECK BELOW READS THE SOURCES AS WRITTEN — levant/engine.js and levant/app.jsx — and
# none of them inspects build output. A guard that only ever looks at build output cannot see a
# fault in whatever the build throws away.
#
# pipefail IS LOAD-BEARING, not tidiness. Every check below pipes its output through grep or
# sed to indent it, and without pipefail a pipeline reports the exit status of the LAST command
# — so `node test.js | sed …` succeeds no matter what the test did, and this script reports a
# pass on a failing suite. Do not add a pipe here without checking that a failure still
# propagates; `head` and `tail` in particular swallow both the message and the status.
set -eo pipefail
cd "$(dirname "$0")/.."

# ASSERTIONS ARE ARMED FOR THE WHOLE HARNESS. Every walk below then checks every invariant in
# engine.js, so coverage of the invariants is coverage of the walks and costs no new test. An
# assertion firing throws, so the suite that reached the broken world reports it and stops.
export GK_CHECK=1

# harness/new.cjs is the engine as the suites import it; harness/scenario.cjs is the canon
# world as data, which the suites author their fixtures from; harness/ref.cjs is the
# differential's accepted baseline. All are generated; none is committed.
echo "— engine bundle —"
rm -f harness/new.cjs harness/scenario.cjs
npx esbuild levant/engine.js --format=cjs --bundle --outfile=harness/new.cjs >/dev/null
npx esbuild levant/scenario.js --format=cjs --bundle --outfile=harness/scenario.cjs >/dev/null
echo "  harness/new.cjs + harness/scenario.cjs"

echo "— differential —"
# The reference is a copy of the bundle at a point whose play was accepted. A fresh clone has
# none, so the first run establishes one and has nothing to compare against — that is
# expected, and it is not a pass.
if [ ! -f harness/ref.cjs ]; then
  cp harness/new.cjs harness/ref.cjs
  echo "  no reference — baseline established from this build (nothing compared)"
else
  ./harness/engine/diff.sh
fi

# A SUITE'S EXIT CODE IS THE RESULT; its count line is only a summary. Print the count and drop
# the status, and a suite that cannot report a failure looks identical to a passing one. A
# non-zero exit prints the whole run and stops everything.
echo "— engine suites —"
cd harness/engine
for f in economy ownership war raid strike subvert verbs commands hash orders view query; do
  printf "  %-10s " $f
  if out=$(node test-$f.js 2>&1); then
    echo "$out" | grep "passed," | tail -1
  else
    echo "FAILED"
    echo "$out" | sed 's/^/    /'
    exit 1
  fi
done
cd ../..

# THE SOURCES MUST COMPILE ON THEIR OWN. engine.js is checked by the bundle above; app.jsx is
# not imported by any suite, so without this a fault in it reaches nothing but the browser.
echo "— the sources compile —"
for f in levant/engine.js levant/app.jsx levant/main.jsx; do
  if npx esbuild "$f" --bundle --outfile=/dev/null \
       --external:react --external:react-dom --external:react-dom/client --external:react-dom/server \
       --external:./table.css >/dev/null 2>/tmp/gk-srcerr
    then echo "  $f: compiles"
    else echo "  $f: BROKEN"; sed 's/^/    /' /tmp/gk-srcerr; exit 1; fi
done

# AND THE TABLE MUST DRAW. app.jsx compiling proves it is valid JavaScript, not that it
# renders — the two are different failures and both have happened.
echo "— the table renders —"
rm -f /tmp/gk-render.cjs
npx esbuild harness/render-check.jsx --bundle --format=cjs --platform=node --outfile=/tmp/gk-render.cjs
node /tmp/gk-render.cjs | sed 's/^/  /'

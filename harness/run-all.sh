#!/bin/bash
# Everything, in one command. Run before calling any engine change done.
cd "$(dirname "$0")/.."
set -e
echo "— build —"
node build-game.js | sed 's/^/  /'
npx esbuild levant/engine.js --format=cjs --bundle --outfile=harness/new.cjs >/dev/null
echo "— differential —"
# The reference is a generated baseline: a copy of the bundle at a point whose play was
# accepted. A fresh clone has none, so the first run establishes one and has nothing to
# compare against — that is expected, not a pass.
if [ ! -f harness/ref.cjs ]; then
  cp harness/new.cjs harness/ref.cjs
  echo "  no reference — baseline established from this build (nothing compared)"
else
  ./harness/engine/diff.sh
fi
# A SUITE'S EXIT CODE MUST REACH THIS SCRIPT. Piping into grep threw it away: the pipeline's
# status is grep's, so `set -e` saw success no matter what the suite returned, and a red suite
# would have been reported as a line of text and nothing more. Two holes, one on each side —
# test-orders.js had also drifted to `process.exit(fail ? 0 : 0)` and could not report a
# failure even if this loop had been listening. Both are closed; keep them that way.
echo "— engine suites —"
cd harness/engine
suites_failed=0
for f in economy ownership foremost raid subvert verbs commands hash orders view; do
  printf "  %-10s " $f
  # `out=$(...)` under `set -e` aborts the script on a non-zero status BEFORE the next line
  # can read $?, which would have made everything below here unreachable — a diagnostic that
  # cannot print is the same bug this loop was written to fix. `if !` keeps set -e out of it.
  code=0
  out=$(node test-$f.js 2>&1) || code=$?
  echo "$out" | grep "passed," | tail -1 || echo "(no summary line — the suite did not finish)"
  if [ $code -ne 0 ]; then
    suites_failed=1
    echo "$out" | grep -E "✗|Error" | head -20 | sed 's/^/      /'
    echo "      ^ test-$f.js exited $code"
  fi
done
cd ../..
[ $suites_failed -eq 0 ] || { echo "FAILED — an engine suite is red"; exit 1; }
# THE SOURCES MUST COMPILE ON THEIR OWN. build-game.js strips the imports before it
# concatenates, so a fault in the import block never reaches the built file and every check
# downstream passes. app.jsx imported `view` TWICE and nothing noticed: the artifact was
# fine, the source was not valid JavaScript, and the next person to open it in a bundler or
# an editor would have met an error the whole harness said did not exist.
echo "— the SOURCES compile on their own —"
for f in levant/engine.js levant/app.jsx; do
  if npx esbuild "$f" --bundle --outfile=/dev/null --external:react --external:react-dom/server >/dev/null 2>/tmp/srcerr
    then echo "  $f: compiles"
    else echo "  $f: BROKEN"; sed 's/^/    /' /tmp/srcerr; exit 1; fi
done
# A GUARD THAT CANNOT FIRE IS WORSE THAN NO GUARD. This block used to look for
# /mnt/user-data/outputs/levant-prototype-v25-core.jsx — a sandbox path, under a filename no
# build in this repo has ever produced — and `continue` past it in silence. It ran on every
# machine and checked nothing, while reading like the artifact was covered.
#
# The game itself is covered below: the smoke renders import the built file. What is left is
# the bench, which is built separately, so say plainly whether it was checked.
echo "— the published BENCH compiles —"
BENCH="${GREAT_KINGS_PUBLISH_BENCH:-dist/orders-bench.jsx}"
if [ -f "$BENCH" ]; then
  if npx esbuild "$BENCH" --loader:.jsx=jsx --bundle --outfile=/dev/null --external:react >/dev/null 2>/tmp/bencherr
    then echo "  $BENCH: compiles"
    else echo "  $BENCH: BROKEN — do not upload"; sed 's/^/    /' /tmp/bencherr; exit 1; fi
else
  echo "  not built, so nothing was checked: $BENCH"
  echo "  run ./harness/inject.sh to build it"
fi
# NEVER hide the build, and never run a stale bundle. Both were true here once: a duplicate
# declaration broke the artifact, esbuild reported it, the output was sent to /dev/null, and
# node then ran the PREVIOUS bundle and printed RENDER OK. The test passed; the game did not.
rm -f /tmp/smoke.cjs /tmp/smokem.cjs
npx esbuild smoke.jsx --loader:.jsx=jsx --bundle --format=cjs --platform=node --outfile=/tmp/smoke.cjs
npx esbuild smoke-mobile.jsx --loader:.jsx=jsx --bundle --format=cjs --platform=node --outfile=/tmp/smokem.cjs
node /tmp/smoke.cjs | head -1
node /tmp/smokem.cjs | head -1

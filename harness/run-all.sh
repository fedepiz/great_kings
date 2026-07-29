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
echo "— engine suites —"
cd harness/engine
for f in economy ownership war raid subvert verbs commands hash orders view; do
  printf "  %-10s " $f; node test-$f.js 2>&1 | grep "passed," | tail -1
done
cd ../..
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
echo "— the PUBLISHED artifacts compile and render —"
for f in /mnt/user-data/outputs/levant-prototype-v25-core.jsx /mnt/user-data/outputs/orders-bench.jsx; do
  [ -f "$f" ] || continue
  cp "$f" /tmp/pub-check.jsx
  if npx esbuild /tmp/pub-check.jsx --loader:.jsx=jsx --outfile=/tmp/pub-check.js >/dev/null 2>&1
    then echo "  $(basename $f): compiles"
    else echo "  $(basename $f): BROKEN — do not upload"; fi
done
# NEVER hide the build, and never run a stale bundle. Both were true here once: a duplicate
# declaration broke the artifact, esbuild reported it, the output was sent to /dev/null, and
# node then ran the PREVIOUS bundle and printed RENDER OK. The test passed; the game did not.
rm -f /tmp/smoke.cjs /tmp/smokem.cjs
npx esbuild smoke.jsx --loader:.jsx=jsx --bundle --format=cjs --platform=node --outfile=/tmp/smoke.cjs
npx esbuild smoke-mobile.jsx --loader:.jsx=jsx --bundle --format=cjs --platform=node --outfile=/tmp/smokem.cjs
node /tmp/smoke.cjs | head -1
node /tmp/smokem.cjs | head -1

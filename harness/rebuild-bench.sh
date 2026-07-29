#!/bin/bash
# Rebuild the orders-bench from the engine, in order, with every check on the way.
set -e
cd "$(dirname "$0")/.."
echo "1/6  engine → bundle"
npx esbuild levant/engine.js --format=cjs --bundle --outfile=harness/new.cjs >/dev/null
cd harness/bench
echo "2/6  bundle → corpus";      node gen-corpus.js      | sed 's/^/     /'
echo "3/6  corpus replays?";      node validate-corpus.js | tail -2 | sed 's/^/     /'
echo "4/6  corpus → pack";        node render-pack.js     | sed 's/^/     /'
echo "5/6  instrument calibrated?"; node validate-pack.js | sed -n '3,6p' | sed 's/^/     /'
echo "6/6  chain consistent?";    node check-chain.js     | tail -1 | sed 's/^/     /'
echo; echo "then: ./harness/inject.sh"

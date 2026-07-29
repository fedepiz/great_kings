#!/bin/bash
# quick: rebuild the bundle and run the differential
cd "$(dirname "$0")/../.."
npx esbuild levant/engine.js --format=cjs --bundle --outfile=harness/new.cjs >/dev/null
./harness/engine/diff.sh

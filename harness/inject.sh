#!/bin/bash
# Build the published orders-bench from source. It carries the ENGINE and the GENERATOR,
# not a corpus — so it makes its own, and cannot go stale.
set -e
cd "$(dirname "$0")/bench"
# Destination: an explicit argument, else GREAT_KINGS_PUBLISH_BENCH, else dist/ inside the
# repo — build-bench.js resolves it. This used to hardcode /mnt/user-data/outputs/, the
# sandbox the project was written in, and so failed on every clone.
node build-bench.js "$@"

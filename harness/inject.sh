#!/bin/bash
# Build the published orders-bench from source. It carries the ENGINE and the GENERATOR,
# not a corpus — so it makes its own, and cannot go stale.
set -e
cd "$(dirname "$0")/bench"
node build-bench.js "${1:-/mnt/user-data/outputs/orders-bench.jsx}"

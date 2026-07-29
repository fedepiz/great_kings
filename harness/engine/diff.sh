#!/bin/bash
# pure-refactor check: the engine must produce identical play from identical seeds
cd "$(dirname "$0")"
same=0; diff=0
for s in 12345 777 42 31337 555 8888 60613 1 99991 2024; do
  a=$(node drive.js ../ref.cjs $s | tail -1)
  b=$(node drive.js ../new.cjs $s | tail -1)
  if [ "$a" = "$b" ]; then same=$((same+1)); else diff=$((diff+1)); echo "  seed $s DIFFERS"; fi
done
echo "  $same/10 seeds identical to reference"
[ $diff -eq 0 ]

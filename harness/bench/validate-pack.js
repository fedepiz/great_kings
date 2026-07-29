#!/usr/bin/env node
// =====================================================================
// validate-pack.js — prove the bench can measure before trusting a number
// =====================================================================
// The control panel is a display; the scoring lives in the pack. This runs the
// three mock candidates against it headlessly and checks each lands where it
// must. If the oracle is not 100%, the acceptable sets are wrong. If always-wrong
// is not 0%, the bands are wrong. If random misses the computed baseline, the
// menus or the acceptable sets disagree with the arithmetic.
// =====================================================================

const path = require("path");
const pack = require(path.join(__dirname, "orders-pack.json"));

const scored = [];
for (const c of pack.cases) for (const p of c.positions) if (!p.forced) scored.push({ c, p });

function band(p, pickIx) {
  const legal = pickIx >= 0 && p.menu.some(([ci]) => ci === pickIx);
  if (!legal) return "illegal";
  if (p.acc.includes(pickIx)) return pickIx === p.oracle ? "optimal" : "acceptable";
  return p.traps.includes(pickIx) ? "trap" : "wrong";
}
const ok = (b) => b === "optimal" || b === "acceptable";

function run(kind, seed) {
  let s = (seed || 1) >>> 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let hit = 0; const bands = {};
  for (const { p } of scored) {
    const pick = kind === "oracle" ? p.oracle
      : kind === "wrong" ? (p.wrong >= 0 ? p.wrong : p.menu[0][0])
      : p.menu[Math.floor(rnd() * p.menu.length)][0];
    const b = band(p, pick);
    bands[b] = (bands[b] || 0) + 1;
    if (ok(b)) hit++;
  }
  return { pct: 100 * hit / scored.length, bands };
}

const oracle = run("oracle");
const wrong = run("wrong");
const rnds = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => run("random", s).pct);
const rndMean = rnds.reduce((a, b) => a + b, 0) / rnds.length;
const claimed = 100 * pack.meta.expectedRandomAccuracy;

// per-class coverage: a class with too few positions cannot be reported on
const byClass = {};
for (const { p } of scored) (byClass[p.cls] = byClass[p.cls] || []).push(p);

console.log("— the bench measures what it claims —");
console.log(`  scored positions      : ${scored.length}`);
console.log(`  ORACLE                : ${oracle.pct.toFixed(1)}%   ${oracle.pct === 100 ? "✓" : "✗ acceptable sets are wrong"}`);
console.log(`  ALWAYS WRONG          : ${wrong.pct.toFixed(1)}%   ${wrong.pct === 0 ? "✓" : "✗ bands are wrong"}`);
console.log(`  RANDOM (8 seeds)      : ${rndMean.toFixed(1)}%  vs computed ${claimed.toFixed(1)}%   ${Math.abs(rndMean - claimed) < 5 ? "✓" : "✗ menus disagree with the arithmetic"}`);
console.log(`     spread             : ${rnds.map((r) => r.toFixed(0)).join(", ")}`);
console.log(`  wrong-candidate bands : ${JSON.stringify(wrong.bands)}`);

console.log("\n— per class —");
for (const [k, v] of Object.entries(byClass).sort((a, b) => b[1].length - a[1].length))
  console.log(`  ${k.padEnd(11)} n=${String(v.length).padStart(3)}  ${v.length < 10 ? "(thin — report with care)" : ""}`);

console.log("\n— trap coverage —");
const trapped = scored.filter(({ p }) => p.traps.length);
const trapByScope = {};
for (const { c } of trapped) trapByScope[c.scope] = (trapByScope[c.scope] || 0) + 1;
console.log(`  trapped positions: ${trapped.length} · by scope ${JSON.stringify(trapByScope)}`);

const bad = oracle.pct !== 100 || wrong.pct !== 0 || Math.abs(rndMean - claimed) >= 5;
console.log(bad ? "\nFAILED — do not trust a model number from this pack" : "\nOK — the instrument is calibrated");
process.exit(bad ? 1 : 0);

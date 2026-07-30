#!/usr/bin/env node
// =====================================================================
// validate-corpus.js — the corpus is only worth what it can reproduce
// =====================================================================
// Every case claims: replay `prefix` from initState, then walk `oracle`,
// and at position i you will find exactly the recorded mode, menu size and
// legal set. If that is not true, every number the harness later reports is
// measured against a board that does not exist. This proves it, case by case.
//
// It also re-derives the random baseline by simulation rather than arithmetic,
// so the figure in corpus.meta is checked against an independent method.
// =====================================================================

const fs = require("fs");
const path = require("path");
const M = require(path.join(__dirname, "..", "new.cjs"));
const clone = (g) => JSON.parse(JSON.stringify(g));
const corpus = require(path.join(__dirname, "orders-corpus.json"));

const BACKTRACK = M.ORDER_NEVER, key = M.cmdKey;   // one list, one identity — see engine.js

// rebuild a contest case's fixtures exactly as the generator laid them
function applyFixtures(g, setup) {
  g.turn = setup.turn;
  for (const f of setup.fixtures) {
    if (f.what === "rel") g.rel[f.who][f.rid] = { i: f.i, s: f.s, strained: false };
    else if (f.what === "stock") for (const p of M.PLAYERS) g.players[p].stock = { ...f.all };
    else g.b[f.rid][f.i] = { t: f.what, o: setup.turn, tap: false };
  }
  return g;
}

let fail = 0, checked = 0, posChecked = 0;
const problems = [];

for (const c of corpus.cases) {
  let g = M.initState();
  if (c.setup) g = applyFixtures(g, c.setup);
  let ok = true;

  for (const cmd of c.prefix) g = M.dispatch(clone(g), cmd);

  for (let i = 0; i < c.oracle.length; i++) {
    const pos = c.positions[i];
    const menu = M.availableCommands(g).filter((x) => !BACKTRACK.has(x.t));
    const mode = g.mode ? g.mode.v : (g.act ? "verb-choice" : "activate");
    const cmd = c.oracle[i];
    posChecked++;

    if (!menu.some((m) => key(m) === key(cmd))) {
      problems.push(`${c.id} pos ${i}: oracle command is NOT in the live menu (${cmd.t}${cmd.rid ? " " + cmd.rid : ""})`);
      ok = false; break;
    }
    if (pos.mode !== mode) { problems.push(`${c.id} pos ${i}: mode "${pos.mode}" recorded, "${mode}" live`); ok = false; break; }
    if (pos.menuSize !== menu.length) { problems.push(`${c.id} pos ${i}: menu ${pos.menuSize} recorded, ${menu.length} live`); ok = false; break; }
    for (const a of pos.acceptable) {
      if (!menu.some((m) => key(m) === key(a))) { problems.push(`${c.id} pos ${i}: an "acceptable" command is not legal here`); ok = false; break; }
    }
    for (const tr of pos.traps) {
      if (!menu.some((m) => key(m) === key(tr.cmd))) { problems.push(`${c.id} pos ${i}: a trap is not actually on the menu`); ok = false; break; }
    }
    if (!ok) break;
    g = M.dispatch(clone(g), cmd);
  }

  // the seat must not have wandered off mid-case without the corpus knowing
  checked++;
  if (!ok) fail++;
}

// --- independent check of the baseline: play the corpus with a random legal picker ---
function randomRun(seed) {
  let s = seed >>> 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let hit = 0, n = 0;
  for (const c of corpus.cases) {
    let g = M.initState();
    if (c.setup) g = applyFixtures(g, c.setup);
    for (const cmd of c.prefix) g = M.dispatch(clone(g), cmd);
    for (let i = 0; i < c.oracle.length; i++) {
      const pos = c.positions[i];
      const menu = M.availableCommands(g).filter((x) => !BACKTRACK.has(x.t));
      if (!pos.forced) {
        const pick = menu[Math.floor(rnd() * menu.length)];
        if (pos.acceptable.some((a) => key(a) === key(pick))) hit++;
        n++;
      }
      g = M.dispatch(clone(g), c.oracle[i]);   // TEACHER FORCING: always the oracle
    }
  }
  return hit / n;
}

const runs = [1, 2, 3, 4, 5, 6, 7, 8].map(randomRun);
const mean = runs.reduce((a, b) => a + b, 0) / runs.length;
const claimed = corpus.meta.expectedRandomAccuracy;

console.log("— replay integrity —");
console.log(`  cases replayed exactly : ${checked - fail}/${checked}`);
console.log(`  positions verified     : ${posChecked}`);
for (const p of problems.slice(0, 10)) console.log("   ✗", p);

console.log("\n— baseline cross-check —");
console.log(`  claimed (arithmetic)   : ${(100 * claimed).toFixed(1)}%`);
console.log(`  measured (8 random runs): ${(100 * mean).toFixed(1)}%  [${runs.map((r) => (100 * r).toFixed(0)).join(", ")}]`);
const agree = Math.abs(mean - claimed) < 0.05;
console.log(`  agreement within 5pt   : ${agree ? "yes" : "NO — the scorer and the corpus disagree"}`);

console.log("\n— shape —");
console.log("  scored positions:", corpus.meta.scoredPositions, "· forced:", corpus.meta.forcedPositions, "· trapped:", corpus.meta.trappedPositions);

const bad = fail > 0 || !agree;
console.log(bad ? "\nFAILED" : "\nOK — the corpus reproduces the engine exactly");
process.exit(bad ? 1 : 0);

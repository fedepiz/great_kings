#!/usr/bin/env node
// =====================================================================
// test-roundtrip.js — is THE ORDER a complete description of an action?
// =====================================================================
//     commands ──extract──▶ order ──expand──▶ commands
// If the second sequence runs the first one's action, the order carries everything an
// action needs. If it cannot, the schema is missing a field. If it is AMBIGUOUS, the order
// does not say enough — which is the same defect the scribe evaluation chased by hand six
// times, now caught by a function in milliseconds.
//
// This is the acceptance test for the schema. Everything downstream — the executor, the
// dry-run validator, the vizier's contract — rests on it being 100%.
// =====================================================================
const path = require("path");
const M = require(path.join(__dirname, "..", "new.cjs"));
const corpus = require(path.join(__dirname, "orders-corpus.json"));
const clone = (g) => JSON.parse(JSON.stringify(g));
const BACKTRACK = new Set(["srcBack", "tradeCancel", "cancelActivation", "bidTake", "calloff", "endActivation", "pass", "forfeit"]);
const K = (c) => JSON.stringify([c.t, c.rid ?? "", c.i ?? "", c.v ?? "", c.bt ?? "", c.good ?? "", c.pid ?? ""]);
// EQUIVALENCE IS ABOUT THE WORLD, NOT THE ROUTE — and the engine now says so directly.
const worldOf = (g) => M.fingerprint(g);

// The rules live in the engine; this only exercises them against the corpus.
const expand = (g, order) => { const r = M.Order.commands(g, order); return { cmds: r.commands, ambiguous: r.ambiguous }; };

function fixtures(g, setup) {
  g.turn = setup.turn;
  for (const f of setup.fixtures) {
    if (f.what === "rel") g.rel[f.who][f.rid] = { i: f.i, s: f.s, strained: false };
    else if (f.what === "stock") for (const p of M.PLAYERS) g.players[p].stock = { ...f.all };
    else g.b[f.rid][f.i] = { t: f.what, o: setup.turn, tap: false };
  }
  return g;
}

let exact = 0, short = 0, ambiguous = 0, empty = 0, n = 0;
const notes = [];
for (const c of corpus.cases) {
  let g = M.initState();
  if (c.setup) g = fixtures(g, c.setup);
  for (const cmd of c.prefix) g = M.dispatch(clone(g), cmd);
  for (const a of c.actions || []) {
    n++;
    const want = c.oracle.slice(a.from, a.to + 1);
    const r = expand(g, a.order);
    // run both routes and compare the worlds they leave
    let byOracle = clone(g); for (const cmd of want) byOracle = M.dispatch(clone(byOracle), cmd);
    let byOrder = clone(g); for (const cmd of r.cmds) byOrder = M.dispatch(clone(byOrder), cmd);
    if (r.ambiguous) { ambiguous++; if (notes.length < 6) notes.push(`${c.id} act${a.index}: AMBIGUOUS between ${r.ambiguous.map(K).join(" | ").slice(0, 90)}`); }
    else if (!r.cmds.length) { empty++; if (notes.length < 6) notes.push(`${c.id} act${a.index}: expanded to nothing`); }
    else if (worldOf(byOrder) === worldOf(byOracle)) exact++;
    else { short++; if (notes.length < 6) notes.push(`${c.id} act${a.index}: ${r.cmds.length} commands vs ${want.length}, and the worlds differ`); }
    g = byOracle;
  }
}

console.log("— commands → order → commands —");
console.log(`  actions round-tripped exactly : ${exact}/${n}  (${(100 * exact / n).toFixed(0)}%)`);
console.log(`  ran, but left a different world: ${short}`);
console.log(`  order did not say enough      : ${ambiguous}`);
console.log(`  order licensed nothing        : ${empty}`);
for (const x of notes) console.log("     " + x);
const ok = exact === n;
console.log(ok ? "\nOK — the order is a complete description of an action" : `\nINCOMPLETE — ${n - exact} action(s) the schema cannot carry`);
process.exit(ok ? 0 : 1);

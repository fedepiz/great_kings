#!/usr/bin/env node
// =====================================================================
// check-chain.js — is everything downstream actually built from what is upstream?
// =====================================================================
// The scribe bench is a pipeline:
//     engine → gen-corpus.js → corpus.json → render-pack.js → evalpack.json → bench
// Every stage caches the one before it, so any stage can silently go stale: the engine
// gains a rule and the corpus still encodes the old one; the corpus is regenerated and
// the pack is not; the pack is rebuilt and the bench still embeds yesterday's copy.
// None of that shows up as an error — it shows up as a number that means nothing.
//
// This checks the chain end to end. Run it before trusting any result.
// =====================================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const M = require(path.join(__dirname, "..", "new.cjs"));

const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const exists = (f) => fs.existsSync(path.join(__dirname, f));
const mtime = (f) => fs.statSync(path.join(__dirname, f)).mtimeMs;

let fail = 0;
const ok = (c, m, detail) => { if (c) console.log("  ✓", m); else { fail++; console.log("  ✗", m, detail ? "\n      " + detail : ""); } };

console.log("— the files exist —");
for (const f of ["orders-corpus.json", "orders-pack.json", "gen-corpus.js", "render-pack.js", "validate-corpus.js", "validate-pack.js"])
  ok(exists(f), f);
if (fail) { console.log("\nFAILED — the chain is incomplete"); process.exit(1); }

console.log("\n— build order: each stage is newer than the one it is built from —");
const engineSrc = path.join(__dirname, "..", "..", "levant", "engine.js");
const appSrc = path.join(__dirname, "..", "..", "levant", "app.jsx");
const builtGame = path.join(__dirname, "..", "..", "levant-prototype-v25.jsx");
ok(fs.statSync(engineSrc).mtimeMs <= fs.statSync(path.join(__dirname,"..","new.cjs")).mtimeMs, "engine bundle is not older than engine.js",
   "run: npx esbuild levant/engine.js --format=cjs --bundle --outfile=harness/new.cjs");
// THE PUBLISHED GAME IS A BUILD OUTPUT. If it predates either source, the thing you would
// upload is not the thing the tests just passed.
ok(fs.existsSync(builtGame) && fs.statSync(builtGame).mtimeMs >= fs.statSync(engineSrc).mtimeMs
   && fs.statSync(builtGame).mtimeMs >= fs.statSync(appSrc).mtimeMs,
   "the built game is newer than engine.js and app.jsx", "run: node build-game.js");
ok(fs.statSync(path.join(__dirname,"..","new.cjs")).mtimeMs <= mtime("orders-corpus.json"), "corpus is not older than the engine bundle", "run: node gen-corpus.js");
ok(mtime("orders-corpus.json") <= mtime("orders-pack.json"), "pack is not older than the corpus", "run: node render-pack.js");

console.log("\n— the shared constants agree across the chain —");
const files = ["gen-corpus.js", "render-pack.js", "validate-corpus.js"];
const grab = (f, re) => { const m = read(f).match(re); return m ? m[0].replace(/\s+/g, " ") : null; };
const backtracks = files.map((f) => grab(f, /const BACKTRACK = new Set\(\[[^\]]*\]\)/));
ok(new Set(backtracks).size === 1, "BACKTRACK is the same everywhere", backtracks.join("\n      "));
const keys = files.map((f) => grab(f, /const key = \(c\) => JSON\.stringify\(\[[^\]]*\]\)/));
ok(new Set(keys).size === 1, "key() is the same everywhere", keys.join("\n      "));
// a key that omits a field cannot tell two commands apart that differ only in that field
const keySrc = keys[0] || "";
for (const field of ["c.t", "c.rid", "c.i", "c.v", "c.bt", "c.good", "c.side", "c.pid"])
  ok(keySrc.includes(field), `key() distinguishes ${field}`);

console.log("\n— the order rules have exactly one home —");
// They were duplicated across three harness files and agreed only because I edited them
// with the same regex. They belong to the engine, beside the commands they describe.
const orderFns = ["function orderRead", "function orderAllows", "function orderMark", "function orderCommands"];
const engineText = read(path.join("..", "..", "levant-prototype-v25.jsx"));
for (const fn of orderFns) {
  const inEngine = engineText.split(fn).length - 1;
  const inHarness = files.reduce((a, f) => a + (read(f).split(fn).length - 1), 0);
  ok(inEngine === 1 && inHarness === 0, `${fn.replace("function ", "")} defined once, in the engine`,
     `engine ${inEngine}, harness ${inHarness}`);
}
ok(!read("render-pack.js").includes("new Function("), "render-pack does not eval the rules out of another file");

console.log("\n— the corpus was generated against THIS engine —");
const corpus = JSON.parse(read("orders-corpus.json"));
const cmdTypes = new Set();
for (const c of corpus.cases) for (const o of c.oracle) cmdTypes.add(o.t);
const engineCases = new Set([...read(path.join("..", "..", "levant-prototype-v25.jsx")).matchAll(/case "(\w+)":/g)].map((m) => m[1]));
const orphan = [...cmdTypes].filter((t) => !engineCases.has(t) && t !== "verb");
ok(orphan.length === 0, "every command the corpus uses still exists in the engine", orphan.join(", "));

console.log("\n— the pack was rendered from THIS corpus —");
const pack = JSON.parse(read("orders-pack.json"));
ok(pack.cases.length === corpus.cases.length, `case count matches (${pack.cases.length} vs ${corpus.cases.length})`);
const cPos = corpus.cases.reduce((a, c) => a + c.positions.length, 0);
const pPos = pack.cases.reduce((a, c) => a + c.positions.length, 0);
ok(cPos === pPos, `position count matches (${pPos} vs ${cPos})`);
ok(pack.meta.scoredPositions === corpus.meta.scoredPositions, "scored-position count matches");
const idsMatch = corpus.cases.every((c, i) => pack.cases[i] && pack.cases[i].id === c.id);
ok(idsMatch, "case ids line up in order");

console.log("\n— the pack is internally sound —");
let badIx = 0, noMenu = 0, oracleOffMenu = 0;
for (const c of pack.cases) for (const p of c.positions) {
  if (!p.menu.length) noMenu++;
  if (!p.menu.some(([ci]) => ci === p.oracle)) oracleOffMenu++;
  for (const [ci, gi] of p.menu) if (!pack.commands[ci] || pack.strings[gi] === undefined) badIx++;
  for (const a of p.acc) if (!pack.commands[a]) badIx++;
}
ok(badIx === 0, "every pooled index resolves", badIx + " dangling");
ok(noMenu === 0, "every position has a menu");
ok(oracleOffMenu === 0, "every oracle is on its own menu", oracleOffMenu + " off-menu");

console.log("\n— the published bench is built from current sources —");
// It no longer embeds a pack: it carries the ENGINE and the GENERATOR and makes its own
// corpus from a seed. So the check is not "is the data current" but "is the build current".
const benchOut = "/mnt/user-data/outputs/orders-bench.jsx";
if (fs.existsSync(benchOut)) {
  const built = fs.statSync(benchOut).mtimeMs;
  const sources = ["orders-bench.jsx", "gen-corpus.js", "render-pack.js"].map((f) => mtime(f));
  sources.push(fs.statSync(engineSrc).mtimeMs);
  ok(sources.every((s) => s <= built), "the built bench is newer than every source it is made from",
     "run: ./harness/inject.sh");
  const text = fs.readFileSync(benchOut, "utf8");
  ok(!/const PACK = \{/.test(text), "it carries no baked-in corpus");
  ok(/function orderCommands/.test(text) && /function main\(opts\)/.test(text),
     "it carries the engine and the generator");
} else console.log("  – bench not published yet (skipped)");

console.log(fail ? `\nFAILED — ${fail} problem(s); results from this chain cannot be trusted` : "\nOK — the chain is consistent end to end");
process.exit(fail ? 1 : 0);

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
// A FRESH CLONE MAKES THESE VACUOUS. git stamps every file with one checkout time, so
// "not older than" holds of everything and compares nothing. Say so rather than printing
// six ticks that mean nothing on the machine most likely to be reading them.
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
// The corpus and pack edges are NOT checked by mtime. They used to be, and it was the weaker
// test in both directions: vacuous on a fresh clone, and a false alarm on a working copy
// where the bundle is rebuilt after a corpus that is still perfectly current. They are
// checked by content below — `engineHash` and `corpusHash` — which is decisive either way.

console.log("\n— the shared constants have exactly one home —");
// This section used to assert the harness's THREE copies of BACKTRACK and key() still agreed
// textually. They agreed only because they were edited with one regex, and asserting that
// copies match is a way of blessing the copying. Both now come from the engine — BACKTRACK is
// its `ORDER_NEVER`, key() is its `cmdKey` — so the check is that no copy has come back.
const files = ["gen-corpus.js", "render-pack.js", "validate-corpus.js", "test-roundtrip.js"];
const localBacktrack = files.filter((f) => /const (BACKTRACK|NEVER) = new Set\(/.test(read(f)));
ok(localBacktrack.length === 0, "no file redefines the backtrack set", localBacktrack.join(", "));
const localKey = files.filter((f) => /const K?e?y? ?= \(c\) => JSON\.stringify\(\[c\.t/.test(read(f)));
ok(localKey.length === 0, "no file redefines the command key", localKey.join(", "));
// a key that omits a field cannot tell two commands apart that differ only in that field.
// test-roundtrip.js's own copy omitted `c.side` and so could not tell the two sides of a
// contest apart — which is exactly what a second copy is for.
const cmdKeySrc = String(M.cmdKey);
for (const field of ["c.t", "c.rid", "c.i", "c.v", "c.bt", "c.good", "c.side", "c.pid"])
  ok(cmdKeySrc.includes(field), `cmdKey distinguishes ${field}`);

console.log("\n— the order rules have exactly one home —");
// They were duplicated across three harness files and agreed only because I edited them
// with the same regex. They belong to the engine, beside the commands they describe.
//
// READ THE SOURCE, NOT THE BUILD OUTPUT. This counted definitions in levant-prototype-v25.jsx
// — a file build-game.js assembles by stripping the import block and concatenating. A guard
// that only ever looks at the build output cannot see a fault in what the build throws away,
// which is precisely how a doubled `import { view }` once survived the whole harness.
const orderFns = ["function orderRead", "function orderAllows", "function orderMark", "function orderCommands"];
const engineText = fs.readFileSync(engineSrc, "utf8");
for (const fn of orderFns) {
  const inEngine = engineText.split(fn).length - 1;
  const inHarness = files.reduce((a, f) => a + (read(f).split(fn).length - 1), 0);
  ok(inEngine === 1 && inHarness === 0, `${fn.replace("function ", "")} defined once, in the engine`,
     `engine ${inEngine}, harness ${inHarness}`);
}
ok(!read("render-pack.js").includes("new Function("), "render-pack does not eval the rules out of another file");

console.log("\n— the corpus was generated against THIS engine —");
const corpus = JSON.parse(read("orders-corpus.json"));
// THE CHECK THE MTIMES WERE STANDING IN FOR. A stamp of the engine's contents, taken when the
// corpus was generated. It is decisive where "newer than" is not: it survives a fresh clone,
// and it notices a change that leaves every count identical — a reworded chronicle line left
// the pack quoting prose the engine no longer produced, and nothing above caught it.
{
  // `hash` here truncates to 12, gen-corpus stamps 16; compare on the shorter prefix.
  const live = hash(fs.readFileSync(engineSrc, "utf8"));
  const stamped = (corpus.meta.engineHash || "").slice(0, live.length);
  ok(stamped === live, "the corpus carries this engine's hash",
     `corpus: ${stamped || "(unstamped)"}  engine: ${live}\n      run: node gen-corpus.js && node render-pack.js`);
}
const cmdTypes = new Set();
for (const c of corpus.cases) for (const o of c.oracle) cmdTypes.add(o.t);
const engineCases = new Set([...engineText.matchAll(/case "(\w+)":/g)].map((m) => m[1]));
const orphan = [...cmdTypes].filter((t) => !engineCases.has(t) && t !== "verb");
ok(orphan.length === 0, "every command the corpus uses still exists in the engine", orphan.join(", "));

console.log("\n— the table names no command types —");
// THE ACCEPTANCE TEST FOR `view`. If the table can write a command, it knows something about
// the rules, and a rule can then live in whether a panel happens to draw a button — which is
// how every UI-enforced rule in this project got in. The table's job is to draw what `view`
// says and ship back the `cmd` attached to whatever was clicked, verbatim.
//
// This passed only once the map was drawn from `view`. Before that, one site survived:
// the province click, which built { t: "region", rid } itself.
{
  const appText = fs.readFileSync(appSrc, "utf8");
  const named = [...appText.matchAll(/\bt: *"(\w+)"/g)].map((m) => m[1]).filter((t) => engineCases.has(t));
  ok(named.length === 0, "app.jsx builds no command of its own", [...new Set(named)].join(", "));
  const reads = [...appText.matchAll(/\.t *===? *"(\w+)"/g)].map((m) => m[1]).filter((t) => engineCases.has(t));
  ok(reads.length === 0, "app.jsx branches on no command type", [...new Set(reads)].join(", "));
  // The third shape: a SET of types tested against .t — `["forfeit","pass"].includes(c.t)`,
  // which neither regex above catches.
  //
  // A blunt scan for any command type appearing as a string does NOT work here, and the
  // reason is worth writing down: panel kinds and command types are both English words drawn
  // from one namespace, and they collide. `note` is a real command ({t:"note"} writes a
  // chronicle line) AND a real panel kind, so `pan.kind === "note"` looks exactly like the
  // table naming a command and is nothing of the sort. Only a string tested against `.t`
  // means what this check is looking for.
  //
  // Exactly two are allowed, and they are the SCRIBE's, not the table's: the desk does not
  // offer a model the two ways to end a turn without acting. That withholds nothing from the
  // player and enforces nothing on the engine — both stay on the menu, and the buttons that
  // send them are drawn from `view` like everything else.
  const SCRIBE_EXCLUDES = ["forfeit", "pass"];
  const inSets = [...appText.matchAll(/\[([^\]]*)\]\.includes\( *\w+\.t *\)/g)]
    .flatMap((m) => [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]));
  const surprise = [...new Set(inSets)].filter((t) => !SCRIBE_EXCLUDES.includes(t));
  ok(surprise.length === 0, `the only command types tested against are the scribe's own exclusions (${SCRIBE_EXCLUDES.join(", ")})`,
     "unexpected: " + surprise.join(", "));
  // the map's old private routes into the rules. `view` answers both now.
  for (const fn of ["legalTargets", "isCoastal", "rank"])
    ok(!new RegExp("\\b" + fn + "\\s*\\(").test(appText), `app.jsx does not call ${fn} — the map reads the view`);
}

console.log("\n— the pack was rendered from THIS corpus —");
const pack = JSON.parse(read("orders-pack.json"));
// By contents, not by counts. Counts all matched while the pack quoted a chronicle line the
// engine had stopped producing — the counts cannot see prose, and the pack is mostly prose.
{
  const live = crypto.createHash("sha256").update(JSON.stringify(corpus.cases)).digest("hex").slice(0, 16);
  ok(pack.meta.corpusHash === live, "the pack carries this corpus's hash",
     `pack: ${pack.meta.corpusHash || "(unstamped)"}  corpus: ${live}\n      run: node render-pack.js`);
}
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
const benchOut = process.env.GREAT_KINGS_PUBLISH_BENCH
  || path.join(__dirname, "..", "..", "dist", "orders-bench.jsx");
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
} else console.log(`  – not built yet, so nothing was checked: ${benchOut}\n    run ./harness/inject.sh`);

console.log(fail ? `\nFAILED — ${fail} problem(s); results from this chain cannot be trusted` : "\nOK — the chain is consistent end to end");
process.exit(fail ? 1 : 0);

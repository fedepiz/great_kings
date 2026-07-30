#!/usr/bin/env node
// =====================================================================
// render-pack.js — turn the corpus into something a control panel can run
// =====================================================================
// corpus.json carries command PREFIXES so states can be replayed. That is 70%
// of its bulk and useless to a browser, which cannot run the engine. This
// replays every case ONCE, here, and writes out what a candidate would actually
// be shown at each position — menu, glosses, grounding, chronicle — so the panel
// needs no engine at all: it assembles a prompt from parts and scores a pick.
//
// ABLATION BLOCKS are rendered separately and never concatenated here. The panel
// decides which to include, which is the whole point of the experiment.
// =====================================================================

const fs = require("fs");
const path = require("path");
const M = require(path.join(__dirname, "..", "new.cjs"));
const clone = (g) => JSON.parse(JSON.stringify(g));


const BACKTRACK = M.ORDER_NEVER, key = M.cmdKey;   // one list, one identity — see engine.js

// The corpus this pack was rendered from, by contents. `cases` alone: `meta` carries a
// generation timestamp, which would make every rebuild look like a different corpus.
const corpusHash = (c) => require("crypto").createHash("sha256")
  .update(JSON.stringify(c.cases)).digest("hex").slice(0, 16);
const bare = (c) => { const o = { ...c }; delete o.standing; delete o.b; return o; };

function applyFixtures(g, setup) {
  g.turn = setup.turn;
  for (const f of setup.fixtures) {
    if (f.what === "rel") g.rel[f.who][f.rid] = { i: f.i, s: f.s, strained: false };
    else if (f.what === "stock") for (const p of M.PLAYERS) g.players[p].stock = { ...f.all };
    else g.b[f.rid][f.i] = { t: f.what, o: setup.turn, tap: false };
  }
  return g;
}

// the rules live in the engine
const RULES = { licenses: M.Order.allows, consume: M.Order.mark };


// THE RENDERER, callable: hand it a corpus, get a pack. No disk, so the bench can run it too.
function renderPack(corpus) {
const packCases = [];
  let rendered = 0;
  // --- string pool: the chronicle barely changes between positions, so repeated
  // --- lines are stored once and referenced by index.
  const pool = [];
  const poolIx = new Map();
  const S = (s) => { let k = poolIx.get(s); if (k === undefined) { k = pool.length; pool.push(s); poolIx.set(s, k); } return k; };
  // --- command pool: the same command object recurs across hundreds of menus. Pooling it
  // --- turns every comparison the panel makes into an integer test.
  const cmds = [];
  const cmdIx = new Map();
  const C = (cmd) => { const k = key(cmd); let ix = cmdIx.get(k); if (ix === undefined) { ix = cmds.length; cmds.push(bare(cmd)); cmdIx.set(k, ix); } return ix; };
  
  for (const c of corpus.cases) {
    let g = M.initState();
    if (c.setup) g = applyFixtures(g, c.setup);
    for (const cmd of c.prefix) g = M.dispatch(clone(g), cmd);
  
    const actionStartLog = [];      // log length at the start of each action, for "done so far"
    let curAction = -1;
    const positions = [];
    let orderUsed = [];             // what the current action's order has already spent
    let orderSeat = null;           // whose order that is — a contest passes the desk around
  
    for (let i = 0; i < c.oracle.length; i++) {
      const src = c.positions[i];
      if (src.action !== curAction) { curAction = src.action; actionStartLog[curAction] = g.log.length; orderUsed = []; }
      // WHOSE ORDER APPLIES HERE. An ordinary activation is one court's business; a contest
      // passes the desk around and each court answers to its own. When the desk moves, the
      // new court's order starts fresh — it has spent nothing.
      const seatNow = M.effectiveSeat(g);
      if (seatNow !== orderSeat) { orderSeat = seatNow; orderUsed = []; }
      const act = (c.actions || [])[src.action];
      let ord = act && act.order && seatNow === c.seat ? act.order : null;
      if (!ord) {
        const d = (c.directives || {})[seatNow];
        if (d && d.order) { try { const arr = JSON.parse(d.order); ord = Array.isArray(arr) ? arr[src.action] || arr[0] : arr; } catch (e) {} }
      }
  
      const menu = M.availableCommands(g).filter((x) => !BACKTRACK.has(x.t));
      const seat = M.effectiveSeat(g);
  
      // the menu as the candidate sees it: the copyable object, and what it means
      const options = menu.map((cmd) => [C(cmd), S(M.describeCmd(g, cmd))]);   // [commandIx, glossIx]
      // WHERE EACH OPTION LEADS. Scoring compares POSITIONS, not commands: two different
      // commands that reach the same board are equally right, and the fingerprint says so.
      const outcomes = menu.map((cmd) => { try { return M.fingerprint(M.dispatch(clone(g), cmd)); } catch (e) { return "xxxxxxxx"; } });
      const licensed = ord ? menu.map((cmd, k) => [k, cmd])
        .filter(([, cmd]) => RULES.licenses(ord, cmd, orderUsed, src.mode)).map(([k]) => k) : [];
      const accKeys = src.acceptable.map(key);
      const trapKeys = src.traps.map((t) => key(t.cmd));
  
      // A LEGAL BUT WRONG PICK for the deliberately-incorrect candidate: prefer a trap, and
      // judge wrongness by WHERE IT LEADS, the same way scoring does — a command outside the
      // acceptable list may still arrive at an accepted position.
      const okSet = new Set(licensed.length ? licensed.map((k) => outcomes[k]) : []);
      const wrongIx = menu.findIndex((m) => trapKeys.includes(key(m)) && !okSet.has(outcomes[menu.indexOf(m)]));
      const anyWrong = menu.findIndex((m, k) => !okSet.has(outcomes[k]) && !accKeys.includes(key(m)));
      const wrong = wrongIx >= 0 ? menu[wrongIx] : (anyWrong >= 0 ? menu[anyWrong] : null);
  
      // grounding blocks, rendered separately so the panel can toggle each
      const done = g.log.slice(0, Math.max(0, g.log.length - (actionStartLog[curAction] ?? g.log.length)))
        .reverse().slice(-10).map((l) => (l.length > 150 ? l.slice(0, 150) + "…" : l));
      const year = g.log.slice(0, 10).reverse().map((l) => (l.length > 150 ? l.slice(0, 150) + "…" : l));
  
      positions.push({
        i, a: src.action, mode: src.mode, cls: src.stepClass, seat,
        forced: !!src.forced,
        menu: options,
        fp: outcomes,                                        // where each option leads
        // which options the ORDER licenses here — one means forced, several of a kind means
        // their sequence is free, several kinds means the order does not say enough
        lic: licensed,
        // THE POSITIONS THAT COUNT AS RIGHT, derived from the order rather than authored.
        // The hand-written acceptable sets agreed with this everywhere they existed (315/315)
        // and were too narrow where they were written by hand, as in the contests.
        ok: [...new Set((licensed.length ? licensed.map((k) => outcomes[k])
          : src.acceptable.map((a) => { const ix = menu.findIndex((m) => key(m) === key(a)); return ix >= 0 ? outcomes[ix] : null; })
        ).filter(Boolean))],
        acc: src.acceptable.map(C),
        traps: src.traps.map((t) => C(t.cmd)),
        oracle: C(src.oracle),
        wrong: wrong ? C(wrong) : -1,   // index 0 is a real command: absence is -1, never falsy
        blocks: {
          stand: S(g.act ? M.progressLine(g, g.turn) : (g.raid ? `A raid is under way at ${M.R[g.raid.t].n}.` : "No activation is open.")),
          done: done.map(S),
          year: year.map(S),
          stores: M.PLAYERS.map((p) => S(`${M.PNAME[p]}: ` + M.GOODS.map((t) => `${g.players[p].stock[t]} ${t}`).join(", ")
            + ` · food store ${M.foodStore(g, p)} · due ${M.upkeepDue(g, p).food}`)),
        },
      });
      rendered++;
      if (ord) RULES.consume(ord, c.oracle[i], orderUsed, src.mode);
      g = M.dispatch(clone(g), c.oracle[i]);
    }
  
    packCases.push({
      id: c.id, cls: c.class, scope: c.scope, seat: c.seat,
      opened: c.opened || null,
      directives: c.directives,   // template · prose · loose · order — four voices, one axis
      actions: c.actions ? c.actions.map((a) => ({ i: a.index, from: a.from, to: a.to, phrase: a.phrase })) : [],
      stats: c.stats,
      positions,
    });
  }
  
  const pack = {
    strings: pool,
    commands: cmds,
    meta: {
      ...corpus.meta,
      renderedFrom: "orders-corpus.json",
      note: "Self-contained: every prompt part is pre-rendered. Teacher-forced — position i is fixed, whatever a candidate answers.",
    },
    cases: packCases,
  };
  
  
  return {
    strings: pool, commands: cmds,
    meta: { ...corpus.meta, renderedFrom: "orders-corpus.json", corpusHash: corpusHash(corpus),
      note: "Self-contained: every prompt part is pre-rendered. Teacher-forced." },
    cases: packCases,
  };
}

// ---- the command line ----
const corpus = require(path.join(__dirname, "orders-corpus.json"));
// THE PACK BAKES IN PROSE THE ENGINE PRODUCED — glosses, the chronicle since the action
// began. Rendering a current engine's prose onto a corpus generated by an older one, and then
// inheriting that corpus's engine stamp, would put a false claim of freshness on the pack.
// Refuse instead: it costs a regeneration and saves a number that means nothing.
{
  const live = require("crypto").createHash("sha256")
    .update(fs.readFileSync(path.join(__dirname, "..", "..", "levant", "engine.js")))
    .digest("hex").slice(0, 16);
  if (corpus.meta.engineHash !== live) {
    console.error("REFUSING TO RENDER — the corpus was generated against a different engine.");
    console.error(`  corpus: ${corpus.meta.engineHash || "(unstamped)"}\n  engine: ${live}`);
    console.error("  run: node gen-corpus.js");
    process.exit(1);
  }
}
const pack = renderPack(corpus);
const out = path.join(__dirname, "orders-pack.json");
fs.writeFileSync(out, JSON.stringify(pack));
console.log("wrote", out, (fs.statSync(out).size / 1024).toFixed(0) + "KB");
console.log("  string pool:", pack.strings.length, "lines ·", pack.commands.length, "distinct commands");
console.log("  cases", pack.cases.length, "· positions", pack.cases.reduce((a,c)=>a+c.positions.length,0));
console.log("  scored", pack.meta.scoredPositions, "· trapped", pack.meta.trappedPositions);
const wrongMissing = pack.cases.flatMap((c) => c.positions).filter((p) => !p.forced && p.wrong < 0).length;
console.log("  scored positions with no wrong option available:", wrongMissing);

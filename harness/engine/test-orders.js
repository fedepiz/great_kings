#!/usr/bin/env node
// =====================================================================
// test-orders.js — is an ORDER a complete description of an action?
// =====================================================================
//     commands ──Order.read──▶ order ──Order.commands──▶ commands
//
// This walks the engine itself, so it needs no corpus and no fixtures: it is a REGRESSION
// TEST FOR THE COMMAND LAYER. Add a command that no order can express, or change a flow so
// an order stops driving it, and this fails.
//
// Equivalence is judged on the WORLD, not the route. Three gifts may be chosen in any order
// and two producers tapped in either; the command stream differs, the action does not.
// =====================================================================
const path = require("path");
const M = require(path.join(__dirname, "..", "new.cjs"));
const clone = (g) => JSON.parse(JSON.stringify(g));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };

const key = (c) => JSON.stringify([c.t, c.rid ?? "", c.i ?? "", c.v ?? "", c.bt ?? "", c.good ?? "", c.pid ?? ""]);
const NEVER = new Set(["srcBack", "srcToChoose", "tradeCancel", "cancelActivation", "bidTake", "calloff", "endActivation", "pass", "forfeit"]);
// NOT ACTIONS AT ALL. The year closing, a famine's abandonments, and raising a new palace
// when the last one is lost are the world's doing or a forced recovery — not something a
// court ORDERS. No order describes them, and none should be asked to.
//   resolveUpkeep  the year closes
//   perish         a famine takes a building
//   restoreCourt   a power with no palace left rebuilds one; there is no choice in it
const NOT_AN_ACTION = new Set(["resolveUpkeep", "perish", "restoreCourt"]);

// Walk the engine, cutting the trace into actions-proper, and round-trip each one.
function sweep(seeds, rounds) {
  let exact = 0, differs = 0, ambiguous = 0, empty = 0, n = 0;
  const notes = [];
  for (const seed of seeds) {
    let s = seed >>> 0;
    const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let g = M.initState();
    let action = [], soFar = [], startState = clone(g);
    for (let i = 0; i < 4000; i++) {
      if (g.round > rounds) break;
      const menu = M.availableCommands(g).filter((c) => !NEVER.has(c.t) && !NOT_AN_ACTION.has(c.t));
      if (!menu.length) {
        const esc = M.availableCommands(g).find((c) => c.t === "pass" || c.t === "endActivation" || NOT_AN_ACTION.has(c.t));
        if (!esc) break;
        g = M.dispatch(clone(g), esc); action = []; soFar = []; startState = clone(g); continue;
      }
      // COHERENT PLAY ONLY. An order describes an INTENTION, so a trace with no intention
      // behind it — a gift toggled on and off, a verb chosen and abandoned — is not
      // something an order should be able to say. These are the same three rules the corpus
      // generator walks by, and without them this test measures nonsense.
      const committed = !!(g.mode && g.mode.v && g.mode.v !== "source");
      let choices = menu
        .filter((c) => !(committed && c.t === "verb"))                        // no dithering
        .filter((c) => c.t === "bid" || !soFar.includes(key(c)));             // no self-undo
      if (!committed && choices.some((c) => c.t === "verb")) {                // no dead verbs
        choices = choices.filter((c) => {
          if (c.t !== "verb") return true;
          try {
            const nx = M.dispatch(clone(g), c);
            return M.availableCommands(nx).some((x) => !NEVER.has(x.t) && x.t !== "verb");
          } catch (e) { return false; }
        });
      }
      if (!choices.length) {
        const esc = M.availableCommands(g).find((c) => c.t === "endActivation" || c.t === "pass");
        if (!esc) break;
        g = M.dispatch(clone(g), esc); action = []; soFar = []; startState = clone(g); continue;
      }
      const cmd = choices[Math.floor(rnd() * choices.length)];
      const mode = g.mode ? g.mode.v : (g.act ? "verb-choice" : "activate");
      const capBefore = g.act ? g.act.capLeft : null;
      const deskBefore = M.effectiveSeat(g);
      action.push({ cmd, mode }); soFar.push(key(cmd));
      const next = M.dispatch(clone(g), cmd);
      const capAfter = next.act ? next.act.capLeft : null;
      const spent = (capBefore != null && capAfter != null && capAfter < capBefore)
        || (g.act && !next.act) || M.effectiveSeat(next) !== deskBefore;
      if (spent && action.length) {
        n++;
        const order = M.Order.read(action);
        const r = M.Order.commands(startState, order);
        let byTrace = clone(startState); for (const a of action) byTrace = M.dispatch(clone(byTrace), a.cmd);
        let byOrder = clone(startState); for (const c of (r.commands || [])) byOrder = M.dispatch(clone(byOrder), c);
        if (r.ambiguous) { ambiguous++; if (notes.length < 5) notes.push(`ambiguous: ${r.ambiguous.map((c) => c.t).join("/")} (verb ${order.verb})`); }
        else if (!r.commands.length) { empty++; if (notes.length < 5) notes.push(`licensed nothing (verb ${order.verb})`); }
        else if (M.fingerprint(byOrder) === M.fingerprint(byTrace)) exact++;
        else { differs++; if (notes.length < 5) notes.push(`different world (verb ${order.verb}, ${r.commands.length} vs ${action.length} commands)`); }
        action = []; soFar = []; startState = clone(next);
      }
      g = next;
    }
  }
  return { exact, differs, ambiguous, empty, n, notes };
}

console.log("\n— commands → order → commands, over the engine's own play —");
const r = sweep([12345, 777, 42, 31337, 555, 8888, 1, 2024], 14);
console.log(`  actions round-tripped : ${r.exact}/${r.n}  (${(100 * r.exact / r.n).toFixed(1)}%)`);
console.log(`  left a different world: ${r.differs}`);
console.log(`  order said too little : ${r.ambiguous}`);
console.log(`  order licensed nothing: ${r.empty}`);
for (const x of r.notes) console.log("     " + x);
ok(r.n > 100, `enough actions to be meaningful (${r.n})`);
ok(r.exact === r.n, "every action the engine can play, an order can describe");

console.log("\n— an order is read from what was done, not from what was said —");
let g = M.initState();
const act = M.availableCommands(g).find((c) => c.t === "activate");
const o = M.Order.read([{ cmd: act, mode: "activate" }]);
ok(o.actor && o.actor.rid === act.rid, `the actor is recovered (${o.actor && o.actor.rid})`);

console.log("\n— a wrong order licenses nothing rather than guessing —");
const nonsense = { actor: { rid: "NOWHERE", i: 0 }, verb: "build", target: { rid: "NOWHERE" } };
const rr = M.Order.commands(M.initState(), nonsense);
ok(!rr.commands.length, "an order naming what does not exist produces no commands");

console.log(`\n${pass} passed, ${fail} failed\n`);
// This read `fail ? 0 : 0` — the suite the README calls the command layer's regression test
// could not fail, whatever it found. Both branches returned success, so run-all.sh printed its
// count and moved on.
process.exit(fail ? 1 : 0);

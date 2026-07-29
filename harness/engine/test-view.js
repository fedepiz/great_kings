// =====================================================================
// test-view.js — "does the table have a second opinion?"
// =====================================================================
// view(g) is the ONE question the table asks. That only holds if every option it emits is a
// command actually on offer, and if nothing the table can click was decided anywhere but
// availableCommands. These are the standing checks that caught real bugs while `view` was
// being built, made permanent.
//
// The one the map was added for:
//
//   The map used to ask legalTargets directly. legalTargets does not know every gate that
//   stands in front of a command — once all had passed, the only thing on offer was the
//   reckoning, and yet the map still lit every activatable building. 322 such states in
//   50,178. The click was refused and the world did not move, so no rule was broken; the
//   BOARD LIED, which is the same disease one step earlier. Drawing the map from the menu is
//   what makes it impossible rather than merely fixed.
// =====================================================================
const path = require("path");
const M = require(path.join(__dirname, "..", "new.cjs"));

let pass = 0, fail = 0;
const ok = (c, m, detail) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m, detail ? "\n      " + detail : ""); } };

// ---- a seeded walk, sampling view(g) at every state along the way ----
let s = 0;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const key = (c) => JSON.stringify([c.t, c.rid, c.i, c.v, c.bt, c.good, c.side, c.pid]);

const bad = {};                       // signature -> { count, first sample }
const flag = (sig, sample) => { if (!bad[sig]) bad[sig] = { count: 0, sample }; bad[sig].count++; };

const KINDS = new Set(["notice", "note", "choices", "facts", "sides", "map"]);
const STATES = new Set(["chosen", "available", "idle", "blocked", "satisfied"]);
const PICKS = new Set(["one", "many", "repeat", "act"]);

let states = 0, options = 0, mapRegions = 0;
for (let seed = 1; seed <= 40; seed++) {
  s = seed >>> 0;
  let g = M.initState();
  for (let step = 0; step < 4000; step++) {
    if (g.round > 20) break;
    let menu;
    try { menu = M.availableCommands(g); } catch (e) { flag("availableCommands threw: " + e.message, {}); break; }
    if (!menu || !menu.length) break;

    let v;
    try { v = M.view(g); } catch (e) { flag("view threw: " + e.message, { chain: g.chain }); break; }
    states++;
    const onMenu = new Set(menu.map(key));

    const eachOption = (o, where) => {
      options++;
      if (!o.state || !STATES.has(o.state)) flag(`option with no usable state (${where})`, { o: o.label, state: o.state });
      if (o.state === "blocked" && o.cmd) flag(`a blocked option is still dispatchable (${where})`, { o: o.label });
      if (o.state === "blocked" && !o.why) flag(`a blocked option gives no reason (${where})`, { o: o.label });
      // THE POINT OF ALL OF IT: nothing clickable that the engine did not offer.
      if (o.cmd && !onMenu.has(key(o.cmd))) flag(`an option offers a command that is NOT on the menu (${where})`, { o: o.label, cmd: o.cmd, chain: g.chain });
    };

    for (const pan of v.panels) {
      if (!KINDS.has(pan.kind)) flag("a panel of an unknown kind", { kind: pan.kind });
      if (pan.kind === "choices") {
        if (!PICKS.has(pan.pick)) flag("a choices panel declares no pick", { id: pan.id, pick: pan.pick });
        for (const o of pan.options) eachOption(o, "panel " + pan.id);
      }
      if (pan.kind === "map") {
        for (const [rid, place] of Object.entries(pan.regions)) {
          mapRegions++;
          for (const o of place.options) eachOption(o, "map " + rid);
          for (const os of Object.values(place.slots)) for (const o of os) eachOption(o, "map " + rid + " slot");
        }
      }
    }

    // ---- the map covers the menu: every place-command reachable on the board ----
    const mapPan = v.panels.find((pan) => pan.kind === "map");
    if (mapPan) {
      const clickable = new Set();
      for (const place of Object.values(mapPan.regions)) {
        for (const o of place.options) if (o.cmd) clickable.add(key(o.cmd));
        for (const os of Object.values(place.slots)) for (const o of os) if (o.cmd) clickable.add(key(o.cmd));
      }
      for (const c of menu) {
        if (c.t !== "region" && c.t !== "activate" && c.t !== "slot") continue;
        if (!clickable.has(key(c))) flag(`a ${c.t} command is on the menu but nowhere on the map`, { cmd: c, chain: g.chain });
      }
      // every region drawn, always, so nothing appears and vanishes under the hand
      if (Object.keys(mapPan.regions).length !== M.REG.length)
        flag("the map does not carry every region", { got: Object.keys(mapPan.regions).length, want: M.REG.length });
    }

    const pool = menu.filter((x) => x.t !== "forfeit");
    if (!pool.length) break;
    try { g = M.dispatch(JSON.parse(JSON.stringify(g)), pool[Math.floor(rnd() * pool.length)]); }
    catch (e) { flag("dispatch threw: " + e.message, {}); break; }
  }
}

console.log(`— view, over ${states} states (${options} options, ${mapRegions} drawn provinces) —`);
ok(states > 20000, `enough states to be meaningful (${states})`);
const rows = Object.entries(bad).sort((a, b) => b[1].count - a[1].count);
for (const [sig, v] of rows) console.log("     ", String(v.count).padStart(6), sig, JSON.stringify(v.sample));
ok(rows.length === 0, "every option the table can click is a command the engine offers");

// ---- the state the map used to lie about ----
// All have passed: the only thing on offer is the reckoning. The board must light nothing.
console.log("\n— the board says nothing can be done when nothing can be done —");
{
  let g = M.initState();
  let guard = 0;
  while (!M.PLAYERS.every((q) => g.out[q] || g.passed[q]) && guard++ < 100) {
    const menu = M.availableCommands(g);
    const pass_ = menu.find((c) => c.t === "pass");
    g = M.dispatch(g, pass_ || menu[0]);
  }
  const menu = M.availableCommands(g);
  ok(menu.length === 1 && menu[0].t === "resolveUpkeep", "the menu offers only the reckoning", JSON.stringify(menu));
  const mapPan = M.view(g).panels.find((p) => p.kind === "map");
  ok(!!mapPan, "the map panel is emitted");
  let lit = [];
  for (const [rid, place] of Object.entries(mapPan.regions)) {
    if (place.options.some((o) => o.cmd)) lit.push(rid);
    for (const [i, os] of Object.entries(place.slots)) if (os.some((o) => o.cmd)) lit.push(rid + ":" + i);
  }
  ok(lit.length === 0, "and the board lights nothing", lit.join(", "));
  // the old route, for the record: this is what the map used to read
  const legacy = M.legalTargets(g);
  console.log(`      (legalTargets still reports ${legacy.slots.size} activatable slot(s) here — which is why the map may not ask it)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

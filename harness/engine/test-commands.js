// THE COMMAND LAYER IS THE API. The UI, a test, an AI or a network peer all drive the engine
// through dispatch(), so dispatch must be total: any command, in any state, must be absorbed
// or refused — never throw. This fuzzes every known command shape against a wide spread of
// live states, including states the command has no business arriving in.
// TODO: tests that encode constraints instead of exercising code — the way-out walk is now
// checkMenu's own assertion. The two fuzzes are the right shape and stay.
const M = require("../new.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const clone = (g) => JSON.parse(JSON.stringify(g));

// every command shape the engine can emit, harvested from real play
const shapes = new Map();
function harvest(g) { for (const c of M.availableCommands(g)) if (!shapes.has(c.t)) shapes.set(c.t, c); }

// collect a spread of interesting states by walking several seeds
const states = [];
for (const seed of [12345, 777, 42, 31337, 555]) {
  let g = M.initState(); let s = seed >>> 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < 4000; i++) {
    harvest(g);
    if (i % 40 === 0) states.push(clone(g));
    const menu = M.availableCommands(g).filter((c) => c.t !== "forfeit");
    if (!menu.length || g.round > 12) break;
    g = M.dispatch(clone(g), menu[Math.floor(rnd() * menu.length)]);
  }
}
// plus some deliberately awkward ones
{
  let g = M.initState(); g.turn = "H";
  g.rel.H.KIZ = { i: 8, s: "ally", strained: false };
  g.rel.M.KIZ = { i: 5, s: "friend", strained: false };
  for (const p of M.PLAYERS) g.players[p].stock = { food: 3, bronze: 3, cloth: 3, pottery: 3 };
  const home = M.HOME.H, slot = g.b[home].findIndex((x) => x === null);
  g.b[home][slot] = { t: "chancery", o: "H", tap: false };
  const act = M.availableCommands(g).find((c) => c.t === "activate" && g.b[home][c.i] && g.b[home][c.i].t === "chancery");
  g = M.dispatch(clone(g), act);
  g = M.dispatch(clone(g), { t: "verb", v: "subvert" });
  g = M.dispatch(clone(g), { t: "region", rid: "KIZ" });
  states.push(clone(g));                                  // mid-subversion
  states.push(clone(M.dispatch(clone(g), { t: "bid", pid: "KIZ", good: "cloth" })));
}

console.log(`\n— ${shapes.size} command shapes × ${states.length} states —`);
const throwers = [];
let tried = 0;
for (const [t, proto] of shapes) {
  for (const st of states) {
    tried++;
    try { M.dispatch(clone(st), clone(proto)); }
    catch (e) { throwers.push(`${t} → ${e.message}`); break; }
  }
}
ok(throwers.length === 0, `dispatch absorbed every shape in every state (${tried} calls)`);
for (const th of throwers.slice(0, 8)) console.log("      ", th);

console.log("\n— malformed and hostile input —");
const junk = [
  {}, { t: "" }, { t: "nonsense" }, { t: "region" }, { t: "region", rid: "NOWHERE" },
  { t: "bid" }, { t: "bid", pid: "NOWHERE", good: "gold" }, { t: "bidTake", pid: "KIZ", good: "food" },
  { t: "calloff" }, { t: "launch" }, { t: "stand" }, { t: "perish" }, { t: "perish", rid: "X", i: 99 },
  { t: "activate", rid: "MYC", i: 999 }, { t: "buildType", bt: "castle" }, { t: "unit", side: "atk" },
  { t: "verb", v: "sorcery" }, { t: "slot", rid: null, i: null }, { t: "resolveUpkeep" },
];
const junkThrow = [];
for (const j of junk) for (const st of states.slice(0, 12)) {
  try { M.dispatch(clone(st), j); } catch (e) { junkThrow.push(`${JSON.stringify(j)} → ${e.message}`); break; }
}
ok(junkThrow.length === 0, `${junk.length} malformed commands refused without throwing`);
for (const th of junkThrow.slice(0, 8)) console.log("      ", th);

console.log("\n— a court may always set down what it has picked up —");
// THERE MUST ALWAYS BE A WAY OUT of an open activation, and this check is the whole guarantee
// of it. Nothing bypasses the gate, so an exit missing from the menu is an exit that does not
// exist and a court holding an unfinishable errand cannot put it down. That class of bug is
// silent in play and loud here, which is the trade this assertion exists to make.
{
  let g = M.initState(), stuck = 0, checked = 0, s = 4242 >>> 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const OUT = ["back", "srcBack", "tradeCancel", "cancelActivation", "endActivation"];
  for (let i = 0; i < 1500; i++) {
    if (g.act && !g.raid && !g.contest) {
      checked++;
      if (!M.availableCommands(g).some((c) => OUT.includes(c.t))) stuck++;
    }
    const menu = M.availableCommands(g).filter((c) => c.t !== "forfeit");
    if (!menu.length || g.round > 10) break;
    g = M.dispatch(clone(g), menu[Math.floor(rnd() * menu.length)]);
  }
  ok(checked > 100 && stuck === 0, `every open activation offers a way out (${checked} checked)`);
}
{
  // and stepping back costs nothing: the command is not spent
  let g = M.initState();
  g = M.dispatch(g, M.availableCommands(g).find((c) => c.t === "activate" && c.b === "palace"));
  const before = g.act.capLeft;
  g = M.dispatch(g, { t: "verb", v: "build" });
  const tgt = M.availableCommands(g).find((c) => c.t === "region");
  if (tgt) {
    g = M.dispatch(g, tgt);
    ok(M.availableCommands(g).some((c) => c.t === "back"), "a named target can still be set aside");
    const b = M.dispatch(clone(g), { t: "back" });
    ok(b.mode === null, "stepping back forgets the errand");
    ok(b.act.capLeft === before, "and costs no command");
  } else console.log("   – no build target from the opening; skipped");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

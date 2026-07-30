// TODO: tests that encode constraints instead of exercising code — "state shape" and "no overflow
// commands survive" assert deleted features stay deleted; "the Food Store" and "what winter
// takes" restate BT.granary.capBonus and the spoilage formula; "a sourcing must actually pay"
// is now checkMenu's commitTaps biconditional.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;

console.log("\n— state shape —");
let g = M.initState(F.CANON);
ok(!("pendingOverflow" in g), "no pendingOverflow in state");
ok(F.players().every((p) => !("committed" in g.players[p])), "no committed pool on any player");

console.log("\n— the Food Store —");
ok(M.foodStore(g, "M") === 1, `palace alone carries 1 food (got ${M.foodStore(g, "M")})`);
// author a granary onto Mitanni's home ground and check it adds 2
let g2 = M.initState(F.variant(F.addWork(F.home("M"), { type: "granary" })));
ok(M.foodStore(g2, "M") === 3, `palace + one granary carries 3 (got ${M.foodStore(g2, "M")})`);

console.log("\n— the reckoning: grain rots, metal keeps —");
// Mitanni opens rich; the whole table passes BY COMMAND, and the year is resolved
let g3 = M.initState(F.variant(F.stock("M", { food: 9, bronze: 7, cloth: 5, pottery: 4 })));
for (const q of F.players()) g3 = M.dispatch(fork(g3), { t: "pass" });
g3 = M.dispatch(g3, { t: "resolveUpkeep" });
let guard = 0;
while (g3.shortfall && guard++ < 40) {
  const c = M.availableCommands(g3).find((x) => x.t === "perish");
  if (!c) break;
  g3 = M.dispatch(g3, c);
}
const due = 1; // palace only at game start
ok(g3.players.M.stock.food === M.foodStore(g3, "M"),
   `food falls to the Food Store after upkeep (${g3.players.M.stock.food} vs store ${M.foodStore(g3, "M")})`);
ok(g3.players.M.stock.bronze === 7 && g3.players.M.stock.cloth === 5 && g3.players.M.stock.pottery === 4,
   "bronze, cloth and pottery survive the year untouched");

console.log("\n— no overflow commands survive anywhere —");
let g5 = M.initState(F.CANON);
let seen = new Set(), s = 7 >>> 0;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
for (let i = 0; i < 6000; i++) {
  const menu = M.availableCommands(g5).filter((c) => c.t !== "forfeit");
  if (!menu.length) break;
  for (const c of menu) seen.add(c.t);
  g5 = M.dispatch(fork(g5), menu[Math.floor(rnd() * menu.length)]);
  if (g5.round > 15) break;
}
ok(!seen.has("overflowTable") && !seen.has("overflowSwap") && !seen.has("overflowAllTable") && !seen.has("commitToTable"),
   `no table commands ever offered (${seen.size} distinct commands seen)`);

console.log("\n— chronicle no longer mentions the table —");
ok(!/upkeep table|stockpile overflow/i.test(g5.log.join(" ")), "no table language in the chronicle");

console.log("\n— a sourcing must actually pay —");
// The payment rule must live in the gate, not in a greyed button: anything going through
// dispatch — an order expander, a replay, an agent — would otherwise settle a food bill with
// pottery, and `costTakePaid` would decrement a good that was never in the basket.
{
  let g = M.initState(F.variant(F.seatFirst("B")));
  g = M.dispatch(g, M.availableCommands(g).find((c) => c.t === "activate" && c.rid === F.home("B") && c.b === "palace"));
  g = M.dispatch(g, { t: "verb", v: "build" });
  g = M.dispatch(g, M.availableCommands(g).find((c) => c.t === "region"));
  g = M.dispatch(g, M.availableCommands(g).find((c) => c.t === "buildType"));
  const slots = M.availableCommands(g).filter((c) => c.t === "slot");
  let checked = 0, wrong = 0;
  for (const s of slots) {
    const one = M.dispatch(fork(g), s);
    const offered = M.availableCommands(one).some((c) => c.t === "commitTaps");
    const pays = M.costTapCovered(M.specOf(one.mode), one.mode, M.tapYields(one, one.mode));
    checked++; if (offered !== pays) wrong++;
  }
  ok(checked > 2 && wrong === 0, `commitTaps is offered exactly when the taps pay (${checked} selections)`);
  const potter = slots.find((s) => { const y = M.yieldOf(g, s.rid, s.i); return y && y.good !== "food"; });
  if (potter) {
    const one = M.dispatch(fork(g), potter);
    ok(!M.availableCommands(one).some((c) => c.t === "commitTaps"),
       "a producer of the wrong good cannot settle a fixed bill");
    const forced = M.dispatch(fork(one), { t: "commitTaps" });
    ok(M.fingerprint(forced) === M.fingerprint(one), "and dispatching it anyway is refused");
  } else console.log("   – no wrong-good producer in reach; skipped");
}

console.log("\n— what winter takes —");
// Spoilage is a RULE, not a panel's forecast: food above the store rots at the reckoning, once
// upkeep is paid. `foodRots` is the one place that says so.
{
  const p = "H";
  // each boundary is its own AUTHORED opening: Hatti seated with exactly that much food
  const withFood = (n) => M.initState(F.variant(F.stock(p, { food: n })));
  const base = M.initState(F.CANON);
  const keep = M.foodStore(base, p), due = M.upkeepDue(base, p).food;
  ok(M.foodRots(withFood(0), p) === 0, "nothing rots when there is nothing");
  ok(M.foodRots(withFood(due + keep), p) === 0, `upkeep plus the store keeps (${due}+${keep}) — nothing rots`);
  ok(M.foodRots(withFood(due + keep + 3), p) === 3, "three above that, and three rot");
  ok(M.foodRots(withFood(Math.max(0, due - 1)), p) === 0, "a court that is short loses nothing to winter — it loses mouths");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

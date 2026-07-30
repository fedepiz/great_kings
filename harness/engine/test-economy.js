// TODO: tests that encode constraints instead of exercising code — "the Food Store" and
// "what winter takes" restate BT.granary.capBonus and the spoilage formula.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const Q = (g, q) => M.query(g, q);
const g = M.initState(F.CANON);

console.log("\n— the Food Store —");
ok(Q(g, { ask: "foodStore", power: "M" }) === 1, `palace alone carries 1 food (got ${Q(g, { ask: "foodStore", power: "M" })})`);
// author a granary onto Mitanni's home ground and check it adds 2
let g2 = M.initState(F.variant(F.addWork(F.home("M"), { type: "granary" })));
ok(Q(g2, { ask: "foodStore", power: "M" }) === 3, `palace + one granary carries 3 (got ${Q(g2, { ask: "foodStore", power: "M" })})`);

console.log("\n— the reckoning: grain rots, metal keeps —");
// Mitanni opens rich; the whole table passes BY COMMAND, and the year is resolved
let g3 = M.initState(F.variant(F.stock("M", { food: 9, bronze: 7, cloth: 5, pottery: 4 })));
for (const q of F.players()) g3 = M.dispatch(fork(g3), { t: "pass" });
g3 = M.dispatch(g3, { t: "resolveUpkeep" });
let guard = 0, perish;
while ((perish = M.availableCommands(g3).find((x) => x.t === "perish")) && guard++ < 40)
  g3 = M.dispatch(g3, perish);
const m3 = Q(g3, { ask: "stock", power: "M" });
ok(m3.food === Q(g3, { ask: "foodStore", power: "M" }),
   `food falls to the Food Store after upkeep (${m3.food} vs store ${Q(g3, { ask: "foodStore", power: "M" })})`);
ok(m3.bronze === 7 && m3.cloth === 5 && m3.pottery === 4,
   "bronze, cloth and pottery survive the year untouched");

console.log("\n— what winter takes —");
// Spoilage is a RULE, not a panel's forecast: food above the store rots at the reckoning, once
// upkeep is paid. `foodRots` is the one place that says so.
{
  const p = "H";
  // each boundary is its own AUTHORED opening: Hatti seated with exactly that much food
  const withFood = (n) => M.initState(F.variant(F.stock(p, { food: n })));
  const base = M.initState(F.CANON);
  const keep = Q(base, { ask: "foodStore", power: p }), due = Q(base, { ask: "upkeepDue", power: p }).food;
  const rots = (n) => Q(withFood(n), { ask: "foodRots", power: p });
  ok(rots(0) === 0, "nothing rots when there is nothing");
  ok(rots(due + keep) === 0, `upkeep plus the store keeps (${due}+${keep}) — nothing rots`);
  ok(rots(due + keep + 3) === 3, "three above that, and three rot");
  ok(rots(Math.max(0, due - 1)) === 0, "a court that is short loses nothing to winter — it loses mouths");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

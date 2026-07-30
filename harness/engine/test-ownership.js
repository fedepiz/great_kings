// Ownership, read back through the doors: `works.answers` says WHOSE a work is, and the menu
// says what that ownership lets a court do. The old truth table transcribed `usable` line by
// line; what replaces it is the property the rulebook actually claims — RAISING A RUNG NEVER
// REVOKES A COMMAND — plus the ownership facts, asked as facts. The two opening walks this
// file once made are checkWorld's own assertion now.
// TODO: tests that encode constraints instead of exercising code — "follows the writ" still
// pins 1 and 3 where BT.granary.capBonus is the claim.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const Q = (g, q) => M.query(g, q);
const D = (g, c) => M.dispatch(fork(g), c);

console.log("\n— works answer a power or their province —");
let g = M.initState(F.CANON);
const was = Q(g, { ask: "works", region: F.home("M") });
ok(was.find((w) => w.type === "palace").answers === "M", "the palace answers its crown");
ok(was.find((w) => w.type === "farm").answers === "province", "the farm answers the province, whoever holds it");

console.log("\n— raising a rung never revokes a command —");
// Carchemish holds a farm and sits within the levy's reach of Mitanni's palace. One authored
// world per rung; the levy menu at each rung must contain the one below it, and the climb to
// Subject must GAIN ground — a chain of equal menus would prove nothing.
{
  const taxTargets = (rung, influence) => {
    let w = M.initState(F.variant(
      F.seatFirst("M"),
      F.noStanding("M", "CAR"),
      ...(rung ? [F.standing("M", "CAR", rung, influence)] : []),
    ));
    w = D(w, M.availableCommands(w).find((c) => c.t === "activate" && c.rid === F.home("M") && c.b === "palace"));
    w = D(w, { t: "verb", v: "tax" });
    return new Set(M.availableCommands(w).filter((c) => c.t === "region").map((c) => c.rid));
  };
  const ladder = [taxTargets(null), taxTargets("friend", 2), taxTargets("ally", 5), taxTargets("subject", 10)];
  let monotone = true;
  for (let k = 1; k < ladder.length; k++)
    for (const rid of ladder[k - 1]) if (!ladder[k].has(rid)) monotone = false;
  ok(monotone, "every rung's levy menu contains the one below it");
  ok(ladder[3].has("CAR") && !ladder[0].has("CAR"),
     `and the climb to Subject gains Carchemish (${[...ladder[3]].join(",") || "nothing"} vs ${[...ladder[0]].join(",") || "nothing"})`);
}

console.log("\n— a crown's organs stay its own —");
{
  const withChancery = (opener) => M.initState(F.variant(
    F.seatFirst(opener),
    F.addWork(F.home("M"), { type: "chancery", crown: "M" }),
  ));
  const gM = withChancery("M"), gB = withChancery("B");
  ok(Q(gM, { ask: "works", region: F.home("M") }).find((w) => w.type === "chancery").answers === "M",
     "the chancery answers its crown");
  ok(M.availableCommands(gM).some((c) => c.t === "activate" && c.rid === F.home("M") && c.b === "chancery"),
     "its own crown may open it");
  ok(!M.availableCommands(gB).some((c) => c.t === "activate" && c.b === "chancery"),
     "a rival may not, even with the whole board on offer");
}

console.log("\n— markets open to Ties+, not only Subjects —");
{
  // Amurru gets a market, a farm to sell, and Mitanni at Friend with goods to pay
  const g5 = M.initState(F.variant(
    F.seatFirst("M"),
    F.addWork("AMU", { type: "market" }),
    F.addWork("AMU", { type: "farm" }),
    F.standing("M", "AMU", "friend", 2),
    F.stock("M", { food: 2, bronze: 2, cloth: 2, pottery: 2 }),
  ));
  const acts = M.availableCommands(g5).filter((c) => c.t === "activate" && c.rid === "AMU" && c.b === "market");
  ok(acts.length > 0, `a market on Friend ground opens for trade (${acts.length} offer(s))`);
}

console.log("\n— the Food Store follows the writ, not the deed —");
const granaryAt = (rung, influence) => M.initState(F.variant(
  F.addWork("WIL", { type: "granary" }),
  F.standing("M", "WIL", rung, influence),
));
const atFriend = M.query(granaryAt("friend", 2), { ask: "foodStore", power: "M" });
const atSubject = M.query(granaryAt("subject", 10), { ask: "foodStore", power: "M" });
ok(atFriend === 1 && atSubject === 3, `a granary counts only inside your writ (Friend ${atFriend}, Subject ${atSubject})`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

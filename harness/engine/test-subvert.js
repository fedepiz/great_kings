// TODO: tests that encode constraints instead of exercising code — "once per target per year" is
// now checkMenu's spent-ledger assertion, and the `turnOrder` check pins a literal three-element
// array where test-query.js asserts "ascending by influence" over every contest a walk reaches.
// The resolution arithmetic below it is an oracle with content and stays.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const D = (g, c) => M.dispatch(fork(g), c);
const Q = (g, q) => M.query(g, q);
const inf = (g, p) => Q(g, { ask: "influence", power: p, region: "KIZ" });

// Kizzuwatna: Hatti 8, Egypt 3, Mitanni 5, Babylon 0. Hatti opens the bidding.
// The board is AUTHORED, never poked: Hatti seated first, its chancery raised at home, the
// Kizzuwatna ladder placed exactly. Mitanni also holds a stake at Ugarit, so Kizzuwatna is
// never Hatti's ONLY subvertable province — the once-per-year check at the foot needs a menu
// that still offers something, or the absence it asserts on is vacuous.
function scenario() {
  return M.initState(F.variant(
    F.seatFirst("H"),
    F.standing("H", "KIZ", "ally", 8),
    F.standing("M", "KIZ", "friend", 5),
    F.standing("E", "KIZ", "friend", 3),
    F.standing("M", "UGA", "friend", 2),
    F.stocks({ food: 5, bronze: 5, cloth: 5, pottery: 5 }),
    F.addWork("HAT", { type: "chancery", crown: "H" }),
  ));
}
function open(g) {
  const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === "HAT" && c.b === "chancery");
  g = D(g, act);
  g = D(g, { t: "verb", v: "subvert" });
  return D(g, { t: "region", rid: "KIZ" });
}

console.log("\n— the command opens a bidding, it does not settle anything —");
let g = open(scenario());
const e = Q(g, { ask: "engagement" });
ok(e && e.kind === "subversion" && e.phase === "bidding" && e.region === "KIZ", "a subversion is under way");
ok(inf(g, "H") === 8 && inf(g, "M") === 5, "no influence has moved yet");

console.log("\n— everyone with standing takes part, poorest first —");
const c0 = Q(g, { ask: "contest" });
ok(JSON.stringify(c0.turnOrder) === JSON.stringify(["E", "M", "H"]),
   `order is ascending influence (${c0.turnOrder}) — E(3), M(5), H(8)`);
ok(Q(g, { ask: "desk" }) === "E", `the seat passes to the poorest first (${Q(g, { ask: "desk" })})`);
ok(c0.parties.E === "E" && c0.parties.H === "H", "each power is its own party");

console.log("\n— a lone basket wins, and the winner's standing is the weight —");
let g1 = D(g, { t: "bid", pid: "KIZ", good: "cloth" });   // Egypt alone lays cloth
g1 = D(g1, { t: "stand" });                                // Egypt stands
ok(Q(g1, { ask: "desk" }) === "M", "the next power is heard");
g1 = D(g1, { t: "stand" });                                // Mitanni offers nothing
g1 = D(g1, { t: "stand" });                                // Hatti offers nothing -> resolve
ok(Q(g1, { ask: "contest" }) === null && Q(g1, { ask: "engagement" }) === null,
   "the contest closes when the last power stands");
ok(inf(g1, "E") === 3, "the winner loses nothing");
ok(inf(g1, "M") === 2 && inf(g1, "H") === 5,
   `every other participant drops by the winner's 3 (M 5→${inf(g1, "M")}, H 8→${inf(g1, "H")})`);

console.log("\n— the strong buying it clears the province —");
let g2 = D(g, { t: "stand" });                             // Egypt passes
g2 = D(g2, { t: "stand" });                                // Mitanni passes
g2 = D(g2, { t: "bid", pid: "KIZ", good: "food" });        // Hatti alone
g2 = D(g2, { t: "stand" });
ok(inf(g2, "M") === 0 && inf(g2, "E") === 0,
   `Hatti's standing of 8 wipes the others out (M ${inf(g2, "M")}, E ${inf(g2, "E")})`);

console.log("\n— domination must beat EVERY other basket —");
let g3 = D(g, { t: "bid", pid: "KIZ", good: "cloth" });     // E: 1 cloth
g3 = D(g3, { t: "stand" });
g3 = D(g3, { t: "bid", pid: "KIZ", good: "bronze" });       // M: 1 bronze — neither dominates
g3 = D(g3, { t: "stand" });
g3 = D(g3, { t: "stand" });                                 // H: nothing
ok(inf(g3, "H") === 8 && inf(g3, "M") === 5 && inf(g3, "E") === 3,
   "two incomparable baskets are a tie — nothing moves");

console.log("\n— but the goods are gone regardless —");
ok(Q(g3, { ask: "stock", power: "E", good: "cloth" }) === 4
   && Q(g3, { ask: "stock", power: "M", good: "bronze" }) === 4,
   "baskets stay with the province, win, lose or tie");

console.log("\n— a basket that covers every rival takes it —");
let g4 = D(g, { t: "bid", pid: "KIZ", good: "cloth" });      // E: cloth
g4 = D(g4, { t: "stand" });
g4 = D(g4, { t: "bid", pid: "KIZ", good: "cloth" });         // M: cloth+bronze beats cloth
g4 = D(g4, { t: "bid", pid: "KIZ", good: "bronze" });
g4 = D(g4, { t: "stand" });
g4 = D(g4, { t: "stand" });                                  // H: nothing
ok(inf(g4, "M") === 5 && inf(g4, "E") === 0 && inf(g4, "H") === 3,
   `Mitanni's 5 undermines the rest (E ${inf(g4, "E")}, H ${inf(g4, "H")})`);

console.log("\n— once per target per year —");
ok((Q(g1, { ask: "ledger", power: "H" }).subvert || []).includes("KIZ"),
   "the year's ledger records the attempt");
// the table goes round by commands until Hatti's desk comes back, then Hatti tries again
let g5 = fork(g1);
for (const q of ["M", "B", "E", "Y"]) g5 = D(g5, { t: "pass" });
g5 = D(g5, M.availableCommands(g5).find((c) => c.t === "activate" && c.rid === "HAT" && c.b === "palace"));
g5 = D(g5, { t: "verb", v: "subvert" });
const offered5 = M.availableCommands(g5).filter((c) => c.t === "region");
ok(offered5.length > 0, `the verb still offers other provinces (${offered5.length}) — the absence below means something`);
ok(!offered5.some((c) => c.rid === "KIZ"), "the same province cannot be subverted twice in a year");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

// TODO: tests that encode constraints instead of exercising code — "once per target per year" is
// now checkMenu's spent-ledger assertion, and the `turnOrder` check pins a literal three-element
// array where "ascending by influence" is the rule and wants asserting at construction. The
// resolution arithmetic below it is an oracle with content and stays.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const D = (g, c) => M.dispatch(fork(g), c);

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
ok(g.mode && g.mode.v === "subvertBid", "a subversion is under way");
ok(g.rel.H.KIZ.i === 8 && g.rel.M.KIZ.i === 5, "no influence has moved yet");

console.log("\n— everyone with standing takes part, poorest first —");
ok(JSON.stringify(g.contest.turnOrder) === JSON.stringify(["E", "M", "H"]),
   `order is ascending influence (${g.contest.turnOrder}) — E(3), M(5), H(8)`);
ok(M.effectiveSeat(g) === "E", `the seat passes to the poorest first (${M.effectiveSeat(g)})`);
ok(g.contest.party.E === "E" && g.contest.party.H === "H", "each power is its own party");

console.log("\n— a lone basket wins, and the winner's standing is the weight —");
let g1 = D(g, { t: "bid", pid: "KIZ", good: "cloth" });   // Egypt alone lays cloth
g1 = D(g1, { t: "stand" });                                // Egypt stands
ok(M.effectiveSeat(g1) === "M", "the next power is heard");
g1 = D(g1, { t: "stand" });                                // Mitanni offers nothing
g1 = D(g1, { t: "stand" });                                // Hatti offers nothing -> resolve
ok(!g1.contest && g1.mode === null, "the contest closes when the last power stands");
ok(g1.rel.E.KIZ.i === 3, "the winner loses nothing");
ok(g1.rel.M.KIZ.i === 2 && g1.rel.H.KIZ.i === 5,
   `every other participant drops by the winner's 3 (M 5→${g1.rel.M.KIZ.i}, H 8→${g1.rel.H.KIZ.i})`);

console.log("\n— the strong buying it clears the province —");
let g2 = D(g, { t: "stand" });                             // Egypt passes
g2 = D(g2, { t: "stand" });                                // Mitanni passes
g2 = D(g2, { t: "bid", pid: "KIZ", good: "food" });        // Hatti alone
g2 = D(g2, { t: "stand" });
ok(g2.rel.M.KIZ.i === 0 && g2.rel.E.KIZ.i === 0,
   `Hatti's standing of 8 wipes the others out (M ${g2.rel.M.KIZ.i}, E ${g2.rel.E.KIZ.i})`);

console.log("\n— domination must beat EVERY other basket —");
let g3 = D(g, { t: "bid", pid: "KIZ", good: "cloth" });     // E: 1 cloth
g3 = D(g3, { t: "stand" });
g3 = D(g3, { t: "bid", pid: "KIZ", good: "bronze" });       // M: 1 bronze — neither dominates
g3 = D(g3, { t: "stand" });
g3 = D(g3, { t: "stand" });                                 // H: nothing
ok(g3.log.some((l) => /no clear master/.test(l)), "two incomparable baskets are a tie");
ok(g3.rel.H.KIZ.i === 8 && g3.rel.M.KIZ.i === 5 && g3.rel.E.KIZ.i === 3, "and nothing moves");

console.log("\n— but the goods are gone regardless —");
ok(g3.players.E.stock.cloth === 4 && g3.players.M.stock.bronze === 4,
   "baskets stay with the province, win, lose or tie");

console.log("\n— a basket that covers every rival takes it —");
let g4 = D(g, { t: "bid", pid: "KIZ", good: "cloth" });      // E: cloth
g4 = D(g4, { t: "stand" });
g4 = D(g4, { t: "bid", pid: "KIZ", good: "cloth" });         // M: cloth+bronze beats cloth
g4 = D(g4, { t: "bid", pid: "KIZ", good: "bronze" });
g4 = D(g4, { t: "stand" });
g4 = D(g4, { t: "stand" });                                  // H: nothing
ok(g4.rel.M.KIZ.i === 5 && g4.rel.E.KIZ.i === 0 && g4.rel.H.KIZ.i === 3,
   `Mitanni's 5 undermines the rest (E ${g4.rel.E.KIZ.i}, H ${g4.rel.H.KIZ.i})`);

console.log("\n— once per target per year —");
ok((g1.spent.H.subvert || []).includes("KIZ"), "the year's ledger records the attempt");
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

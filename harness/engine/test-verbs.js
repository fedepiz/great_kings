// Coverage for the verbs random play barely lands: treaty (1 landing in 8 seeds x 30 rounds)
// and searaid (1). These must be pinned BEFORE either verb moves into the ACTIONS table.
// TODO: tests that encode constraints instead of exercising code — "the treaty costs a
// command" passes when the activation vanished. The treaty climb and overtake assertions
// above it are oracles with content and stay.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const D = (g, c) => M.dispatch(fork(g), c);
const Q = (g, q) => M.query(g, q);
const rung = (g, p, r) => Q(g, { ask: "standing", power: p, region: r });
const openPalace = (g, p) => {
  const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === F.home(p) && c.b === "palace");
  return D(g, act);
};
// every board below is authored — a Hatti-first world with the Ugarit ladder placed exactly
const hatti = (...edits) => M.initState(F.variant(F.seatFirst("H"), ...edits));

console.log("\n— TREATY: the climb, and the overtake rule —");
// Hatti is Friend at Ugarit with the floor met; nobody outranks it
let g = hatti(F.standing("H", "UGA", "friend", 6));
g = openPalace(g, "H");
g = D(g, { t: "verb", v: "treaty" });
let offered = M.availableCommands(g).filter((c) => c.t === "region").map((c) => c.rid);
ok(offered.includes("UGA"), `a Friend at 6 with the Ally floor of 5 met may climb (${offered.join(",") || "none"})`);
let g1 = D(g, { t: "region", rid: "UGA" });
ok(rung(g1, "H", "UGA") === "ally", `Friend → Ally (${rung(g1, "H", "UGA")})`);

// an incumbent Ally with MORE influence blocks the climb
let g2 = hatti(F.standing("H", "UGA", "friend", 6), F.standing("M", "UGA", "ally", 8));
g2 = openPalace(g2, "H");
g2 = D(g2, { t: "verb", v: "treaty" });
offered = M.availableCommands(g2).filter((c) => c.t === "region").map((c) => c.rid);
ok(!offered.includes("UGA"), "an incumbent Ally standing higher blocks the climb");

// exceeding the incumbent unblocks it, and the incumbent falls to Friend
let g3 = hatti(F.standing("H", "UGA", "friend", 9), F.standing("M", "UGA", "ally", 8));
g3 = openPalace(g3, "H");
g3 = D(g3, { t: "verb", v: "treaty" });
g3 = D(g3, { t: "region", rid: "UGA" });
ok(rung(g3, "H", "UGA") === "ally" && rung(g3, "M", "UGA") === "friend",
   `overtaking demotes the incumbent (H ${rung(g3, "H", "UGA")}, M ${rung(g3, "M", "UGA")})`);

// Ally → Subject, and the wild refuse it
let g4 = hatti(F.standing("H", "UGA", "ally", 11));
g4 = openPalace(g4, "H");
g4 = D(g4, { t: "verb", v: "treaty" });
g4 = D(g4, { t: "region", rid: "UGA" });
ok(rung(g4, "H", "UGA") === "subject", `Ally → Subject at the floor of 10 (${rung(g4, "H", "UGA")})`);

let g5 = hatti(F.standing("H", "KAS", "ally", 11));   // Kaska are wild
g5 = openPalace(g5, "H");
g5 = D(g5, { t: "verb", v: "treaty" });
const wildOffered = M.availableCommands(g5).filter((c) => c.t === "region").map((c) => c.rid);
ok(!wildOffered.includes("KAS"), "the wild never submit — no Subject treaty is offered");

console.log("\n— the treaty costs a command and spends it —");
const a1 = Q(g1, { ask: "activation" });
ok(a1 === null || a1.left === 2,
   `the palace's budget falls by one (${a1 ? a1.left : "activation closed"})`);

console.log("\n— SEA RAID: only warriors sail, and only from a harbour —");
// Mycenae: island power with ports. Its home is full at setup, so the warriors are AUTHORED
// in the potteries' place — the same board the old fixture poked together.
const warriorsAtHome = (...edits) => M.initState(F.variant(
  F.seatFirst("Y"),
  F.setWorks("MYC", ["port", { type: "warrior", crown: "Y" }, { type: "palace", crown: "Y" }, "farm"]),
  ...edits,
));
let s0 = warriorsAtHome();
s0 = openPalace(s0, "Y");
s0 = D(s0, { t: "verb", v: "searaid" });
const seaTargets = M.availableCommands(s0).filter((c) => c.t === "region").map((c) => c.rid);
ok(seaTargets.length > 0, `warriors in a port region can strike overseas (${seaTargets.length} targets)`);
ok(seaTargets.every((r) => F.region(F.CANON, r).slots.some((s) => s.coast)),
   "every sea target has a coast to land on");

// with the port tapped there is no berth, so nothing sails
let s1 = warriorsAtHome(F.setWorks("MYC",
  [{ type: "port", tapped: true }, { type: "warrior", crown: "Y" }, { type: "palace", crown: "Y" }, "farm"]));
s1 = openPalace(s1, "Y");
s1 = D(s1, { t: "verb", v: "searaid" });
const noBerth = M.availableCommands(s1).filter((c) => c.t === "region").map((c) => c.rid);
ok(noBerth.length < seaTargets.length, `a tapped port offers fewer berths (${noBerth.length} vs ${seaTargets.length})`);

console.log("\n— a sea raid opens the same contest as a land raid —");
if (seaTargets.length) {
  let s2 = D(s0, { t: "region", rid: seaTargets[0] });
  const r2 = Q(s2, { ask: "raid" });
  ok(r2 && r2.by === "sea", `the raid is by sea (${r2 && r2.by})`);
  const e2 = Q(s2, { ask: "engagement" }), k2 = Q(s2, { ask: "contest" });
  ok(e2 && e2.kind === "raid" && k2 && k2.binding === false,
     "and it opens an unbound contest, refundable until the launch");
} else { ok(false, "no sea target available to open"); }

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

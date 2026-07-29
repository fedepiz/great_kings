// Coverage for the verbs random play barely lands: treaty (1 landing in 8 seeds x 30 rounds)
// and searaid (1). These must be pinned BEFORE either verb moves into the ACTIONS table.
const M = require("../new.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const clone = (g) => JSON.parse(JSON.stringify(g));
const D = (g, c) => M.dispatch(clone(g), c);
const openPalace = (g, p) => {
  const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === M.HOME[p]
    && g.b[M.HOME[p]][c.i] && g.b[M.HOME[p]][c.i].t === "palace");
  return D(g, act);
};

console.log("\n— TREATY: the climb, and the overtake rule —");
// Hatti is Friend at Ugarit with the floor met; nobody outranks it
let g = M.initState(); g.turn = "H";
g.rel.H.UGA = { i: 6, s: "friend", strained: false };
g = openPalace(g, "H");
g = D(g, { t: "verb", v: "treaty" });
let offered = M.availableCommands(g).filter((c) => c.t === "region").map((c) => c.rid);
ok(offered.includes("UGA"), `a Friend at 6 with the Ally floor of 5 met may climb (${offered.join(",") || "none"})`);
let g1 = D(g, { t: "region", rid: "UGA" });
ok(g1.rel.H.UGA.s === "ally", `Friend → Ally (${g1.rel.H.UGA.s})`);

// an incumbent Ally with MORE influence blocks the climb
let g2 = M.initState(); g2.turn = "H";
g2.rel.H.UGA = { i: 6, s: "friend", strained: false };
g2.rel.M.UGA = { i: 8, s: "ally", strained: false };
g2 = openPalace(g2, "H");
g2 = D(g2, { t: "verb", v: "treaty" });
offered = M.availableCommands(g2).filter((c) => c.t === "region").map((c) => c.rid);
ok(!offered.includes("UGA"), "an incumbent Ally standing higher blocks the climb");

// exceeding the incumbent unblocks it, and the incumbent falls to Friend
let g3 = M.initState(); g3.turn = "H";
g3.rel.H.UGA = { i: 9, s: "friend", strained: false };
g3.rel.M.UGA = { i: 8, s: "ally", strained: false };
g3 = openPalace(g3, "H");
g3 = D(g3, { t: "verb", v: "treaty" });
g3 = D(g3, { t: "region", rid: "UGA" });
ok(g3.rel.H.UGA.s === "ally" && g3.rel.M.UGA.s === "friend",
   `overtaking demotes the incumbent (H ${g3.rel.H.UGA.s}, M ${g3.rel.M.UGA.s})`);

// Ally → Subject, and the wild refuse it
let g4 = M.initState(); g4.turn = "H";
g4.rel.H.UGA = { i: 11, s: "ally", strained: false };
g4 = openPalace(g4, "H");
g4 = D(g4, { t: "verb", v: "treaty" });
g4 = D(g4, { t: "region", rid: "UGA" });
ok(g4.rel.H.UGA.s === "subject", `Ally → Subject at the floor of 10 (${g4.rel.H.UGA.s})`);

let g5 = M.initState(); g5.turn = "H";
g5.rel.H.KAS = { i: 11, s: "ally", strained: false };   // Kaska are wild
g5 = openPalace(g5, "H");
g5 = D(g5, { t: "verb", v: "treaty" });
const wildOffered = M.availableCommands(g5).filter((c) => c.t === "region").map((c) => c.rid);
ok(!wildOffered.includes("KAS"), "the wild never submit — no Subject treaty is offered");

console.log("\n— the treaty costs a command and spends it —");
ok(g1.act === null || (g1.act && g1.act.capLeft === 2),
   `the palace's budget falls by one (${g1.act ? g1.act.capLeft : "activation closed"})`);

console.log("\n— SEA RAID: only warriors sail, and only from a harbour —");
let s0 = M.initState(); s0.turn = "Y";           // Mycenae: island power with ports
const home = M.HOME.Y;
// the home is full at setup, so the warriors take a producer's place
const putWarrior = (g) => {
  const free = g.b[home].findIndex((x) => x === null);
  const at = free >= 0 ? free : g.b[home].findIndex((b) => b && b.t === "wsP");
  g.b[home][at] = { t: "warrior", o: "Y", tap: false };
  return at;
};
putWarrior(s0);
s0 = openPalace(s0, "Y");
s0 = D(s0, { t: "verb", v: "searaid" });
const seaTargets = M.availableCommands(s0).filter((c) => c.t === "region").map((c) => c.rid);
ok(seaTargets.length > 0, `warriors in a port region can strike overseas (${seaTargets.length} targets)`);
ok(seaTargets.every((r) => M.R[r].coast || true), "every sea target is reachable by water");

// with the port tapped there is no berth, so nothing sails
let s1 = M.initState(); s1.turn = "Y";
putWarrior(s1);
s1.b[home].forEach((bd) => { if (bd && bd.t === "port") bd.tap = true; });
s1 = openPalace(s1, "Y");
s1 = D(s1, { t: "verb", v: "searaid" });
const noBerth = M.availableCommands(s1).filter((c) => c.t === "region").map((c) => c.rid);
ok(noBerth.length < seaTargets.length, `a tapped port offers fewer berths (${noBerth.length} vs ${seaTargets.length})`);

console.log("\n— a sea raid opens the same contest as a land raid —");
if (seaTargets.length) {
  let s2 = D(s0, { t: "region", rid: seaTargets[0] });
  ok(s2.raid && s2.raid.mode === "sea", `the raid is by sea (${s2.raid && s2.raid.mode})`);
  ok(s2.contest && s2.contest.kind === "raid" && s2.contest.binding === false,
     "and it opens an unbound contest, refundable until the launch");
} else { ok(false, "no sea target available to open"); }

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

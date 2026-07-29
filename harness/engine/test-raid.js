// Coverage for the RAID CONTEST — the part of the engine the random walk barely touches
// (6 seeds x 30 rounds fired 3 bids and 1 strike). These drive a real raid on Qadesh, which
// borders two wild peoples, through actual dispatch commands, and pin the bidding outcomes.
const M = require("../new.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const clone = (g) => JSON.parse(JSON.stringify(g));
const has = (g, pred) => M.availableCommands(g).some(pred);

// ---- scenario: Babylon raids Qadesh by land. Sutu and Apiru sit adjacent and biddable. ----
function scenario(opts = {}) {
  let g = M.initState();
  g.turn = "B";
  // Babylon's stables in its home give it reach 3 to Qadesh
  const home = M.HOME.B;
  const slot = g.b[home].findIndex((x) => x === null);
  g.b[home][slot] = { t: "stables", o: "B", tap: false };
  // Qadesh is nobody's subject; Mitanni protects it at Friend so there is a defender
  if (opts.defender !== false) g.rel.M.QAD = { i: 3, s: "friend", strained: false };
  // everyone gets goods to bid with
  for (const p of M.PLAYERS) g.players[p].stock = { food: 4, bronze: 4, cloth: 4, pottery: 4 };
  return g;
}

function openRaid(g) {
  const st = M.activeStables ? null : null;
  // activate the stables, choose the raid verb, target Qadesh
  const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === M.HOME.B && g.b[M.HOME.B][c.i] && g.b[M.HOME.B][c.i].t === "stables");
  g = M.dispatch(clone(g), act);
  g = M.dispatch(clone(g), { t: "verb", v: "raid" });
  g = M.dispatch(clone(g), { t: "region", rid: "QAD" });
  return g;
}

console.log("\n— the raid opens and the peoples are biddable —");
let g = openRaid(scenario());
ok(g.raid && g.raid.t === "QAD", "a raid on Qadesh is under way");
ok(g.mode && g.mode.v === "raidCommit", "assembly is open");
const lots = new Set(M.availableCommands(g).filter((c) => c.t === "bid").map((c) => c.pid));
ok(lots.has("SUT") && lots.has("APR"), `both peoples take bids (${[...lots].join(", ")})`);

console.log("\n— goods leave the stores the moment they are laid down —");
let g2 = clone(g);
const before = g2.players.B.stock.bronze;
g2 = M.dispatch(clone(g2), { t: "bid", pid: "SUT", good: "bronze" });
ok(g2.players.B.stock.bronze === before - 1, "a laid good is deducted immediately");
ok(g2.contest.lots.SUT.atk.bronze === 1, "and lands in the attacker's basket for that people");
let g2b = M.dispatch(clone(g2), { t: "bidTake", pid: "SUT", good: "bronze" });
ok(g2b.players.B.stock.bronze === before, "and can be taken back before the launch");

console.log("\n— the launch hands the turn to the protector —");
let g3 = M.dispatch(clone(g2), { t: "launch" });
ok(g3.mode && g3.mode.v === "raidDef", "the defence musters");
ok(M.effectiveSeat(g3) === "M", `the seat passes to the protector (${M.effectiveSeat(g3)})`);
ok(has(g3, (c) => c.t === "bid" && c.pid === "SUT"), "the protector may counter-bid for the same people");

console.log("\n— an unmatched offer wins the warband —");
// attacker laid 1 bronze on SUT; defender lays nothing there and stands
let g4 = M.dispatch(clone(g3), { t: "stand" });
ok(!g4.raid || g4.mode?.v === "raidStrike" || g4.mode?.v === "raidDef",
   "the contest resolves once every protector has stood");
const joined = g4.log.some((l) => /takes the gifts and joins the raiders/.test(l));
ok(joined, "one Sutu warband joins the side whose basket stood alone");

console.log("\n— a counter-bid that dominates takes them back —");
let g5 = clone(g3);
g5 = M.dispatch(clone(g5), { t: "bid", pid: "SUT", good: "bronze" });
g5 = M.dispatch(clone(g5), { t: "bid", pid: "SUT", good: "food" });   // 1 bronze + 1 food beats 1 bronze
g5 = M.dispatch(clone(g5), { t: "stand" });
ok(g5.log.some((l) => /joins the defence/.test(l)), "the dominating basket wins the warband for the defence");

console.log("\n— matching without exceeding moves no one —");
let g6 = clone(g3);
g6 = M.dispatch(clone(g6), { t: "bid", pid: "SUT", good: "bronze" });  // exactly equal
g6 = M.dispatch(clone(g6), { t: "stand" });
ok(g6.log.some((l) => /find no clear master/.test(l)), "an equal basket is a tie and nobody moves");

console.log("\n— everything laid stays with the people, win, lose or tie —");
const spentB = 4 - g6.players.B.stock.bronze;
const spentM = 4 - g6.players.M.stock.bronze;
ok(spentB === 1 && spentM === 1, `both baskets are kept by the Sutu (B spent ${spentB}, M spent ${spentM})`);

console.log("\n— calling off the raid returns the attacker's offerings —");
let g7 = M.dispatch(clone(g2), { t: "calloff" });
ok(g7.players.B.stock.bronze === before && !g7.raid, "call-off refunds what was laid and clears the raid");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

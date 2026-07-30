// Coverage for the RAID CONTEST — the part of the engine the random walk barely touches
// (6 seeds x 30 rounds fired 3 bids and 1 strike). These drive a real raid on Qadesh, which
// borders two wild peoples, through actual dispatch commands, and pin the bidding outcomes.
// TODO: tests that encode constraints instead of exercising code — "goods leave the stores" and
// "everything laid stays with the people" are instances of dispatch's conservation assertion;
// "the contest resolves once every protector has stood" admits three outcomes, one of which is
// nothing having happened. The bidding outcomes — dominate, tie, unmatched — stay.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const has = (g, pred) => M.availableCommands(g).some(pred);

// ---- scenario: Babylon raids Qadesh by land. Sutu and Apiru sit adjacent and biddable. ----
// The board is AUTHORED, never poked: Babylon seated first, its stables at home (reach 3 to
// Qadesh), Mitanni protecting Qadesh at Friend so there is a defender, goods all round to bid.
function scenario(opts = {}) {
  return M.initState(F.variant(
    F.seatFirst("B"),
    F.addWork("BAB", { type: "stables", crown: "B" }),
    ...(opts.defender !== false ? [F.standing("M", "QAD", "friend", 3)] : []),
    F.stocks({ food: 4, bronze: 4, cloth: 4, pottery: 4 }),
  ));
}

function openRaid(g) {
  // activate the stables, choose the raid verb, target Qadesh. The menu itself says what
  // stands where (`c.b`), so nothing here reads `g`.
  const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === "BAB" && c.b === "stables");
  g = M.dispatch(fork(g), act);
  g = M.dispatch(fork(g), { t: "verb", v: "raid" });
  g = M.dispatch(fork(g), { t: "region", rid: "QAD" });
  return g;
}

console.log("\n— the raid opens and the peoples are biddable —");
let g = openRaid(scenario());
ok(g.raid && g.raid.t === "QAD", "a raid on Qadesh is under way");
ok(g.mode && g.mode.v === "raidCommit", "assembly is open");
const lots = new Set(M.availableCommands(g).filter((c) => c.t === "bid").map((c) => c.pid));
ok(lots.has("SUT") && lots.has("APR"), `both peoples take bids (${[...lots].join(", ")})`);

console.log("\n— goods leave the stores the moment they are laid down —");
let g2 = fork(g);
const before = g2.players.B.stock.bronze;
g2 = M.dispatch(fork(g2), { t: "bid", pid: "SUT", good: "bronze" });
ok(g2.players.B.stock.bronze === before - 1, "a laid good is deducted immediately");
ok(g2.contest.lots.SUT.atk.bronze === 1, "and lands in the attacker's basket for that people");
let g2b = M.dispatch(fork(g2), { t: "bidTake", pid: "SUT", good: "bronze" });
ok(g2b.players.B.stock.bronze === before, "and can be taken back before the launch");

console.log("\n— the launch hands the turn to the protector —");
let g3 = M.dispatch(fork(g2), { t: "launch" });
ok(g3.mode && g3.mode.v === "raidDef", "the defence musters");
ok(M.effectiveSeat(g3) === "M", `the seat passes to the protector (${M.effectiveSeat(g3)})`);
ok(has(g3, (c) => c.t === "bid" && c.pid === "SUT"), "the protector may counter-bid for the same people");

console.log("\n— an unmatched offer wins the warband —");
// attacker laid 1 bronze on SUT; defender lays nothing there and stands
let g4 = M.dispatch(fork(g3), { t: "stand" });
ok(!g4.raid || g4.mode?.v === "raidStrike" || g4.mode?.v === "raidDef",
   "the contest resolves once every protector has stood");
const joined = g4.log.some((l) => /takes the gifts and joins the raiders/.test(l));
ok(joined, "one Sutu warband joins the side whose basket stood alone");

console.log("\n— a counter-bid that dominates takes them back —");
let g5 = fork(g3);
g5 = M.dispatch(fork(g5), { t: "bid", pid: "SUT", good: "bronze" });
g5 = M.dispatch(fork(g5), { t: "bid", pid: "SUT", good: "food" });   // 1 bronze + 1 food beats 1 bronze
g5 = M.dispatch(fork(g5), { t: "stand" });
ok(g5.log.some((l) => /joins the defence/.test(l)), "the dominating basket wins the warband for the defence");

console.log("\n— matching without exceeding moves no one —");
let g6 = fork(g3);
g6 = M.dispatch(fork(g6), { t: "bid", pid: "SUT", good: "bronze" });  // exactly equal
g6 = M.dispatch(fork(g6), { t: "stand" });
ok(g6.log.some((l) => /find no clear master/.test(l)), "an equal basket is a tie and nobody moves");

console.log("\n— everything laid stays with the people, win, lose or tie —");
const spentB = 4 - g6.players.B.stock.bronze;
const spentM = 4 - g6.players.M.stock.bronze;
ok(spentB === 1 && spentM === 1, `both baskets are kept by the Sutu (B spent ${spentB}, M spent ${spentM})`);

console.log("\n— calling off the raid returns the attacker's offerings —");
let g7 = M.dispatch(fork(g2), { t: "calloff" });
ok(g7.players.B.stock.bronze === before && !g7.raid, "call-off refunds what was laid and clears the raid");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

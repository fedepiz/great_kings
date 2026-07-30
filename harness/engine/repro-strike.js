// TODO: a province's works defend it — the reproduction for that section. This is a REPRO, not
// a suite: it states the rules of §9 that a raid's resolution must satisfy, and two of them are
// false in the engine as written, so it exits non-zero and run-all.sh does not list it. When the
// fix lands, rename it test-strike.js and add it to run-all.sh's list.
//
// Everything here is driven through dispatch, because random play reaches a strike about once in
// eight seeds and reaches an UNDEFENDED target — the one the plunder branch needs — never.
const M = require("../new.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const clone = (g) => JSON.parse(JSON.stringify(g));
const said = (g, re) => g.log.find((l) => re.test(l));

// ---- the board: Babylon raids Qadesh, which is adjacent to Babylon's own home. -------------
// Babylon's stables (reach 3) opens the raid; Amurru is Babylon's Subject and adjacent to
// Qadesh, so its garrisons are the dial on the attacker's strength.
function scenario({ strength = 1, qadesh = ["garrison", "farm"], tapped = [], protectors = {} } = {}) {
  const g = M.initState();
  g.turn = "B";
  g.b.BAB[g.b.BAB.findIndex((x) => x == null)] = { t: "stables", o: "B", tap: false };
  g.rel.B.AMU = { i: 10, s: "subject", strained: false };
  for (let k = 0; k < M.R.AMU.slots.length; k++)   // the stables is one; Amurru supplies the rest
    g.b.AMU[k] = k < strength - 1 ? { t: "garrison", o: "AMU", tap: false } : null;
  // a province's works run parallel to its slots — see checkWorld
  g.b.QAD = M.R.QAD.slots.map((s, i) => (qadesh[i] ? { t: qadesh[i], o: "QAD", tap: tapped.includes(i) } : null));
  for (const q of Object.keys(protectors)) g.rel[q].QAD = { i: protectors[q], s: protectors[q] >= 5 ? "ally" : "friend", strained: false };
  return g;
}
function openRaid(g) {
  const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === "BAB" && g.b.BAB[c.i].t === "stables");
  g = M.dispatch(clone(g), act);
  g = M.dispatch(clone(g), { t: "verb", v: "raid" });
  g = M.dispatch(clone(g), { t: "region", rid: "QAD" });
  for (const c of M.availableCommands(g).filter((c) => c.t === "slot"))
    if (!g.raid.atk.some((u) => u.rid === c.rid && u.i === c.i)) g = M.dispatch(clone(g), c);
  return g;
}
const launch = (g) => {                       // launch, then let every protector stand in turn
  g = M.dispatch(clone(g), { t: "launch" });
  while (g.mode && g.mode.v === "raidDef") g = M.dispatch(clone(g), { t: "stand" });
  return g;
};
const strike = (g, want) => {                 // strike the first slot matching `want`
  const c = M.availableCommands(g).filter((x) => x.t === "slot").find((x) => want(g.b[x.rid][x.i], x.i));
  return c ? M.dispatch(clone(g), c) : g;
};

// ---- 1. what the target may put in the field ------------------------------------------------
console.log("\n— a province's militia is its garrisons, not its works —");
{
  // Qadesh holds one garrison and one farm and answers to nobody: its militia is ONE unit.
  let g = launch(openRaid(scenario({ strength: 2 })));
  ok(/militia stands alone: 1 garrison/.test(said(g, /militia stands alone/) || ""),
     `the militia is the garrison alone — "${said(g, /militia stands alone/)}"`);
  ok(!g.b.QAD[1].tap, "the farm is not conscripted, so it is not tapped");
  ok(g.mode && g.mode.v === "raidStrike", `2 against 1 carries the field (${said(g, /REPELLED|sweeps/)})`);
}

console.log("\n— an untapped fortress adds its walls, and view says so —");
{
  // Qadesh is inside Mitanni's writ and an untapped fortress of Mitanni's stands there.
  const g0 = scenario({ qadesh: ["garrison", "farm", "fortress"] });
  g0.b.QAD[2].o = "M";
  g0.rel.M.QAD = { i: 10, s: "subject", strained: false };
  const g = openRaid(g0);
  const col = M.view(g).panels.find((p) => p.id === "field").columns[1];
  const after = launch(clone(g));
  ok(/\+1/.test(said(after, /walls of/) || ""), `the ledger counts the walls — "${said(after, /walls of/)}"`);
  ok(col.total === "defence 1", `and view reports the same defence the ledger will count (view said "${col.total}")`);
}

// ---- 2. the two strike outcomes ---------------------------------------------------------------
console.log("\n— an untapped producer is overrun, and surrenders its full yield —");
{
  // No protector, so the militia stands. Three raiders carry the field either way — what is at
  // stake is only whether the farm is still standing untapped when the strikes are chosen.
  let g = launch(openRaid(scenario({ strength: 3 })));
  const before = g.players.B.stock.food;
  g = strike(g, (bd) => bd.t === "farm");
  ok(g.players.B.stock.food - before === M.R.QAD.f,
     `the farm's whole yield reaches the raider's stores (${g.players.B.stock.food - before} of ${M.R.QAD.f} food)`);
  ok(g.b.QAD[1] && g.b.QAD[1].tap, "the overrun farm is tapped, and still stands");
}

console.log("\n— an already-tapped work is destroyed, and the foremost answers for it —");
{
  // Mitanni at 6 and Egypt at 3 protect Qadesh; both its works stand tapped, so both strikes
  // must destroy. The launch tests the foremost for 1, each demolition for 2.
  let g = launch(openRaid(scenario({ strength: 2, tapped: [0, 1], protectors: { M: 6, E: 3 } })));
  ok(g.raid && g.raid.strikes === 2, `2 against 0 wins two strikes (${said(g, /sweeps/)})`);
  ok(M.infOf(g, "M", "QAD") === 5, `the launch costs the foremost 1 (Mitanni ${M.infOf(g, "M", "QAD")})`);
  g = strike(g, () => true);
  ok(!g.b.QAD.some((bd) => bd && bd.t === "garrison"), "the exhausted garrison is torn down");
  ok(M.infOf(g, "M", "QAD") === 3 && M.infOf(g, "E", "QAD") === 3,
     `and shames the foremost 2 more (Mitanni ${M.infOf(g, "M", "QAD")}, Egypt ${M.infOf(g, "E", "QAD")})`);
  g = strike(g, () => true);
  ok(M.infOf(g, "M", "QAD") === 1 && M.infOf(g, "E", "QAD") === 1,
     `the foremost is reckoned afresh, so the second blow falls on the tie (Mitanni ${M.infOf(g, "M", "QAD")}, Egypt ${M.infOf(g, "E", "QAD")})`);
}

// ---- 3. the branch that no state reaches -------------------------------------------------------
console.log("\n— every composition of an undefended target, every strength —");
{
  const KINDS = [null, "garrison", "farm", "wsB", "market"];
  let won = 0, plundering = 0, raids = 0;
  for (const a of KINDS) for (const b of KINDS) for (const c of KINDS) {
    if (!a && !b && !c) continue;
    for (let strength = 1; strength <= 4; strength++) {
      raids++;
      let g = launch(openRaid(scenario({ strength, qadesh: [a, b, c] })));
      if (!(g.mode && g.mode.v === "raidStrike")) continue;
      won++;
      const before = g.players.B.stock.food;
      while (g.mode && g.mode.v === "raidStrike") {          // take the plunder first if there is any
        const next = strike(g, (bd, i) => !!M.yieldOf(g, "QAD", i));
        g = next.mode && next.mode.v === "raidStrike" && next.raid.strikes === g.raid.strikes ? strike(g, () => true) : next;
      }
      if (g.players.B.stock.food > before) plundering++;
    }
  }
  ok(plundering > 0, `of ${raids} raids on an unprotected Qadesh, ${won} were won and ${plundering} plundered anything`);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

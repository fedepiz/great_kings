// WAR, FROM ASSEMBLY TO THE LAST STRIKE — §9 driven through dispatch: who may take the field and
// on what terms, and the two things a won raid does to a work.
//
// A walk will not do here and never has. Random play fires roughly one strike per eight seeds,
// and reaches an UNDEFENDED target — the only board on which the overrun branch is decided —
// never at all: the differential stayed 10/10 identical across a change that turned 0 of 196 won
// raids into 185 plundering ones. Every board below is built and every command issued by hand.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const said = (g, re) => g.log.find((l) => re.test(l));

// ---- the board: Babylon raids Qadesh, which is adjacent to Babylon's own home. -------------
// Babylon's stables (reach 3) opens the raid; Amurru is Babylon's Subject and adjacent to
// Qadesh, so its garrisons are the dial on the attacker's strength. The board is AUTHORED —
// a scenario through initState's validating door, never a poke at `g` — and `...edits` takes
// any further authoring a block needs.
function scenario({ strength = 1, bands = strength - 1, amu = { rung: "subject", influence: 10 },
                    qadesh = ["garrison", "farm"], tapped = [], protectors = {} } = {}, ...edits) {
  const amuSlots = F.region(F.CANON, "AMU").slots.length;
  return M.initState(F.variant(
    F.seatFirst("B"),
    F.addWork("BAB", { type: "stables", crown: "B" }),
    F.standing("B", "AMU", amu.rung, amu.influence),
    F.setWorks("AMU", Array.from({ length: amuSlots }, (_, k) => (k < bands ? "garrison" : null))),
    F.setWorks("QAD", qadesh.map((t, i) => t && (typeof t === "string"
      ? { type: t, ...(tapped.includes(i) ? { tapped: true } : null) } : t))),
    ...Object.entries(protectors).map(([q, n]) => F.standing(q, "QAD", n >= 5 ? "ally" : "friend", n)),
    ...edits,
  ));
}
function assemble(g) {                        // activate the stables and open the assembly
  const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === "BAB" && c.b === "stables");
  g = M.dispatch(fork(g), act);
  g = M.dispatch(fork(g), { t: "verb", v: "raid" });
  return M.dispatch(fork(g), { t: "region", rid: "QAD" });
}
function commitAll(g) {
  for (const c of M.availableCommands(g).filter((c) => c.t === "slot"))
    if (!g.raid.atk.some((u) => u.rid === c.rid && u.i === c.i)) g = M.dispatch(fork(g), c);
  return g;
}
const openRaid = (g) => commitAll(assemble(g));
const launch = (g) => {                       // launch, then let every protector stand in turn
  g = M.dispatch(fork(g), { t: "launch" });
  while (g.mode && g.mode.v === "raidDef") g = M.dispatch(fork(g), { t: "stand" });
  return g;
};
const strike = (g, want) => {                 // strike the first slot matching `want`
  const c = M.availableCommands(g).filter((x) => x.t === "slot").find((x) => want(g.b[x.rid][x.i], x.i));
  return c ? M.dispatch(fork(g), c) : g;
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

console.log("\n— an allied region answers a call with one band, for 1 influence —");
{
  // Amurru is Babylon's ALLY, not its Subject, and two garrisons stand there.
  const open = assemble(scenario({ bands: 2, amu: { rung: "ally", influence: 5 } }));
  const before = M.infOf(open, "B", "AMU");
  ok(M.availableCommands(open).filter((c) => c.t === "slot" && c.rid === "AMU").length === 1,
     "the assembly offers Amurru one band and no more, though two garrisons stand there");
  const g = commitAll(open);
  const called = g.raid.atk.find((u) => u.rid === "AMU");
  ok(called && called.terms === "allied" && called.paidInf === 1,
     `the call is priced in influence (terms ${called && called.terms}, paid ${called && called.paidInf})`);
  ok(M.infOf(g, "B", "AMU") === before - 1, `and the influence leaves Amurru (${before} → ${M.infOf(g, "B", "AMU")})`);
  ok(g.b.AMU[called.i].tap, "a called unit is tapped, its year spent");
}

console.log("\n— a protector musters its own reachable units, and never more —");
{
  // Qadesh is Mitanni's Subject and three garrisons stand there; two raiders demand two.
  const g0 = scenario({ strength: 2, qadesh: ["garrison", "garrison", "garrison"] },
    F.standing("M", "QAD", "subject", 10));
  const g = M.dispatch(fork(openRaid(g0)), { t: "launch" });      // the muster runs on the launch
  ok(g.raid.defC.length === 2, `the muster meets the deficit exactly (${g.raid.defC.length} against 2)`);
  ok(g.raid.defC.every((c) => c.terms === "own"), "and what stands is the protector's own");
  ok(g.b.QAD.filter((bd) => bd && !bd.tap).length === 1, "the third garrison keeps its year");
  ok(/REPELLED: 2 against 2/.test(said(M.dispatch(fork(g), { t: "stand" }), /REPELLED/) || ""),
     "matching the attack repels it");
}

console.log("\n— an untapped fortress adds its walls, and view says so —");
{
  // Qadesh is inside Mitanni's writ and an untapped fortress of Mitanni's stands there.
  const g0 = scenario({ qadesh: ["garrison", "farm", { type: "fortress", crown: "M" }] },
    F.standing("M", "QAD", "subject", 10));
  const g = openRaid(g0);
  const col = M.view(g).panels.find((p) => p.id === "field").columns[1];
  const after = launch(fork(g));
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
  const qadFarm = F.region(F.CANON, "QAD").farm;
  ok(g.players.B.stock.food - before === qadFarm,
     `the farm's whole yield reaches the raider's stores (${g.players.B.stock.food - before} of ${qadFarm} food)`);
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

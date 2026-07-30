// =====================================================================
// test-query.js — the third door answers truthfully, and only truthfully
// =====================================================================
// query(g, q) is how anything outside the engine asks WHAT IS TRUE. This suite is the door's
// own proof, and it plays by the door's rules: positions are AUTHORED (scenarios) or DRIVEN
// (commands), and every fact is read back through query — never off `g`.
//
// Four claims, each falsifiable:
//   1. a known authored position answers with the authored facts, capitals read "home", and
//      the bd.o overload never leaks (no owner is ever a region id);
//   2. `foremost` agrees with a brute-force argmax over `influence` — two asks answered by
//      different internal paths, so agreement means something — at every sampled state of a
//      walk, every region; and a contest's turnOrder is ascending by influence wherever
//      influence is static (assembly, muster, bidding);
//   3. a malformed query THROWS — every validation branch is seen firing, because a query
//      that answers undefined is an assertion that cannot fail;
//   4. answers are VALUES — mutating one moves nothing.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const Q = (g, q) => M.query(g, q);
const D = (g, c) => M.dispatch(F.fork(g), c);
const J = JSON.stringify;

// ---- an authored position, read back through the door ----
console.log("\n— a known position answers with the authored facts —");
const sc = F.variant(
  F.seatFirst("H"),
  F.standing("H", "KIZ", "ally", 8),
  F.standing("M", "KIZ", "friend", 5),
  F.standing("E", "KIZ", "friend", 3),
  F.standing("M", "QAD", "friend", 3, true),          // strained, authored
  F.standing("H", "KAS", "ally", 5),                  // a wild people with a patron
  F.standing("E", "UGA", "friend", 2),                // ties H's canon Friend 2 at Ugarit
  F.addWork("HAT", { type: "chancery", crown: "H" }),
);
let g = M.initState(sc);

ok(Q(g, { ask: "year" }) === 1 && Q(g, { ask: "turn" }) === "H" && Q(g, { ask: "desk" }) === "H",
   "the clock: year 1, Hatti's turn, Hatti's desk");
ok(J(Q(g, { ask: "seated" })) === J(["H", "M", "B", "E", "Y"]), "all five sit, in seating order");
ok(Q(g, { ask: "passed", power: "H" }) === false, "nobody has passed");

ok(Q(g, { ask: "influence", power: "H", region: "KIZ" }) === 8, "influence reads the authored ladder");
ok(Q(g, { ask: "standing", power: "H", region: "KIZ" }) === "ally", "standing names the rung");
ok(Q(g, { ask: "strained", power: "M", region: "QAD" }) === true
   && Q(g, { ask: "strained", power: "H", region: "KIZ" }) === false, "strained is the authored latch");
ok(Q(g, { ask: "standing", power: "H", region: "HAT" }) === "home", "A CAPITAL READS HOME");
ok(Q(g, { ask: "standing", power: "E", region: "HAT" }) === "none"
   && Q(g, { ask: "influence", power: "E", region: "HAT" }) === 0, "a rival holds no ledger in it");

ok(J(Q(g, { ask: "foremost", region: "KIZ" })) === J(["H"]), "the foremost stands alone at 8");
ok(J(Q(g, { ask: "foremost", region: "UGA" }).sort()) === J(["E", "H"]), "a tie names both, ties included");
ok(Q(g, { ask: "patron", region: "KAS" }) === "H" && Q(g, { ask: "patron", region: "SUT" }) === null,
   "a wild people's patron, or null");

const bab = Q(g, { ask: "works", region: "BAB" });
ok(J(bab.map((w) => [w.slot, w.type, w.owner, w.answers])) ===
   J([[0, "palace", "B", "B"], [1, "farm", null, "province"], [2, "market", null, "province"]]),
   "works: the crown decoded, the province's own answering the province");
ok(bab[1].yield && bab[1].yield.good === "food" && bab[1].yield.n === F.region(F.CANON, "BAB").farm,
   "a producer's yield rides its row");
ok(Q(g, { ask: "works", region: "HAT" }).some((w) => w.type === "chancery" && w.owner === "H"),
   "the authored chancery stands, crowned");
{
  let leaks = 0;
  for (const r of sc.regions)
    for (const w of Q(g, { ask: "works", region: r.id }))
      if (w.owner !== null && !J(Q(g, { ask: "seated" })).includes(w.owner)) leaks++;
  ok(leaks === 0, "the bd.o overload never leaks: every owner is a power or null, all regions");
}

ok(Q(g, { ask: "coastal", region: "MYC" }) === true && Q(g, { ask: "coastal", region: "HAT" }) === false,
   "coastal is the ground's own fact");
ok(J(Q(g, { ask: "neighbours", region: "HAT" }).sort()) === J(["ISU", "KAS", "PLA"]),
   "neighbours are the authored roads");

ok(J(Q(g, { ask: "stock", power: "H" })) === J({ food: 2, bronze: 1, cloth: 0, pottery: 0 }),
   "a court's whole stores");
ok(Q(g, { ask: "stock", power: "H", good: "bronze" }) === 1, "or one good of them");
ok(Q(g, { ask: "foodStore", power: "E" }) === 3, "Egypt's store: palace 1 + granary 2");
ok(J(Q(g, { ask: "upkeepDue", power: "H" })) === J({ food: 2 }), "two organs of state, two mouths");

ok(Q(g, { ask: "engagement" }) === null && Q(g, { ask: "raid" }) === null && Q(g, { ask: "contest" }) === null,
   "no engagement at the opening");

// ---- engagements, driven by commands and read back ----
console.log("\n— a raid and a subversion, as the door reports them —");
{
  let r = M.initState(F.variant(
    F.seatFirst("B"),
    F.addWork("BAB", { type: "stables", crown: "B" }),
    F.standing("M", "QAD", "friend", 3),
    F.stocks({ food: 4, bronze: 4, cloth: 4, pottery: 4 }),
  ));
  r = D(r, M.availableCommands(r).find((c) => c.t === "activate" && c.rid === "BAB" && c.b === "stables"));
  r = D(r, { t: "verb", v: "raid" });
  r = D(r, { t: "region", rid: "QAD" });
  const e = Q(r, { ask: "engagement" });
  ok(J(e) === J({ kind: "raid", phase: "assembly", region: "QAD" }), `the assembly is an engagement (${J(e)})`);
  const rr = Q(r, { ask: "raid" });
  ok(rr.target === "QAD" && rr.by === "land" && rr.attackers.length >= 1 && rr.strikes === null,
     `the raid reports its field (${rr.attackers.length} attacker(s), by land, no strikes yet)`);
  ok(rr.attackers.every((u) => ["own", "allied", "militia", "hire"].includes(u.terms)),
     "every commitment carries its terms");
  r = D(r, { t: "launch" });
  ok(Q(r, { ask: "engagement" }).phase === "muster" && Q(r, { ask: "desk" }) === "M",
     "the launch opens the muster at the protector's desk");
}
let sub = D(g, M.availableCommands(g).find((c) => c.t === "activate" && c.rid === "HAT" && c.b === "chancery"));
sub = D(sub, { t: "verb", v: "subvert" });
sub = D(sub, { t: "region", rid: "KIZ" });
const e2 = Q(sub, { ask: "engagement" });
ok(J(e2) === J({ kind: "subversion", phase: "bidding", region: "KIZ" }), `a bidding is an engagement (${J(e2)})`);
const c2 = Q(sub, { ask: "contest" });
ok(J(c2.turnOrder) === J(["E", "M", "H"]) && c2.region === "KIZ" && c2.binding === true,
   "the contest reports its order, its lot, and that a subversion binds from the first word");
ok(J(Q(sub, { ask: "desk" })) === J("E"), "and the desk stands with the poorest bidder");

// ascending-by-influence, held where influence is static — the non-vacuous instance
const asc = (gg) => {
  const c = Q(gg, { ask: "contest" });
  const inf = c.turnOrder.map((p) => Q(gg, { ask: "influence", power: p, region: c.region }));
  return inf.every((v, k) => k === 0 || inf[k - 1] <= v);
};
ok(asc(sub), "a contest is fought in ascending order of investment (E 3 ≤ M 5 ≤ H 8)");

// ---- the cross-oracle, over the engine's own play ----
console.log("\n— foremost ≡ argmax(influence), every region, every sampled state —");
{
  let s = 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let compared = 0, wrong = 0, contests = 0, unordered = 0;
  const REGIONS = F.CANON.regions.map((r) => r.id);
  for (const seed of [11, 22, 33]) {
    s = seed >>> 0;
    let w = M.initState(F.CANON);
    for (let i = 0; i < 1200 && Q(w, { ask: "year" }) <= 10; i++) {
      if (i % 7 === 0) {
        const seatedNow = Q(w, { ask: "seated" });
        for (const rid of REGIONS) {
          const inf = seatedNow.map((p) => Q(w, { ask: "influence", power: p, region: rid }));
          const best = Math.max(0, ...inf);
          const expect = best > 0 ? seatedNow.filter((p, k) => inf[k] === best) : [];
          compared++;
          if (J(Q(w, { ask: "foremost", region: rid }).sort()) !== J(expect.sort())) wrong++;
        }
      }
      const e = Q(w, { ask: "engagement" });
      if (e && ["assembly", "muster", "bidding"].includes(e.phase)) { contests++; if (!asc(w)) unordered++; }
      const menu = M.availableCommands(w).filter((c) => c.t !== "forfeit");
      if (!menu.length) break;
      w = M.dispatch(F.fork(w), menu[Math.floor(rnd() * menu.length)]);
    }
  }
  ok(compared > 5000 && wrong === 0, `foremost agrees with the oracle (${compared} comparisons)`);
  ok(contests > 0 && unordered === 0,
     `every contest the walk reached was fought in ascending order (${contests} states)`);
}

// ---- malformed queries throw, and every refusal has been seen firing ----
console.log("\n— a malformed query throws; silence is not an answer —");
const throws = (q, why) => {
  try { Q(g, q); ok(false, `MISSED: ${why} (${J(q)})`); }
  catch (e) { ok(/^query:/.test(e.message), `${why} — "${e.message}"`); }
};
throws({ ask: "coastl", region: "MYC" }, "an unknown ask");
throws(null, "no query at all");
throws({ ask: "influence", power: "H" }, "a missing argument");
throws({ ask: "influence", power: "Z", region: "KIZ" }, "a power that is not seated");
throws({ ask: "coastal", region: "ATLANTIS" }, "a region off the map");
throws({ ask: "stock", power: "H", good: "gold" }, "a good the game does not trade");
throws({ ask: "year", region: "MYC" }, "an argument the ask does not take");

// ---- answers are values ----
console.log("\n— answers are values: mutating one moves nothing —");
{
  const before = M.fingerprint(sub);
  Q(sub, { ask: "works", region: "BAB" }).forEach((w) => { w.tapped = true; w.owner = "Z"; });
  Q(sub, { ask: "stock", power: "H" }).food = 99;
  const lots = Q(sub, { ask: "contest" }).lots; lots.KIZ = { H: { bronze: 9 } };
  ok(Q(sub, { ask: "works", region: "BAB" }).every((w) => !w.tapped && w.owner !== "Z"),
     "a defaced works row leaves the works standing");
  ok(Q(sub, { ask: "stock", power: "H" }).food === 2, "a defaced purse leaves the stores full");
  ok(J(Q(sub, { ask: "contest" }).lots) !== J(lots), "a defaced lot leaves the baskets alone");
  ok(M.fingerprint(sub) === before, "and the position never moved");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

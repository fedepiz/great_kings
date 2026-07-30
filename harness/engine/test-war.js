// TODO: tests that encode constraints instead of exercising code — "the foremost, and ties" is
// three hand-built argmax tables; test-query.js holds `foremost` to a brute-force oracle over
// a walk, so what earns these their place is only the `except` cases the oracle does not reach.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass=0, fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log("  ✓",m);} else {fail++;console.log("  ✗ FAIL:",m);} };
const Q = (g, q) => M.query(g, q);

console.log("\n— the foremost, and ties —");
// each ladder is an AUTHORED opening on Ugarit; the rung is whatever the influence earns
const rungOf = (n) => (n >= 10 ? "subject" : n >= 5 ? "ally" : n >= 2 ? "friend" : "none");
const ladder = (rows) => M.initState(F.variant(
  ...Object.entries(rows).map(([p, n]) => F.standing(p, "UGA", rungOf(n), n))));
let g = ladder({ H: 8, E: 3, M: 8, B: 1 });
let f = Q(g, { ask: "foremost", region: "UGA", except: "Y" }).sort();
ok(JSON.stringify(f)===JSON.stringify(["H","M"]), `both leaders at 8 are foremost (got ${f})`);

g = ladder({ H: 9, E: 3, M: 8, B: 1 });
f = Q(g, { ask: "foremost", region: "UGA", except: "Y" });
ok(JSON.stringify(f)===JSON.stringify(["H"]), `a single leader is foremost alone (got ${f})`);

ok(Q(g, { ask: "foremost", region: "UGA", except: "H" }).sort().join()==="M",
   "the excluded power is never foremost");

console.log("\n— nobody invested, nobody shamed —");
// the canon gives Hatti a Friend's stake at Ugarit; this world removes it, so nobody stands
let g2 = M.initState(F.variant(F.noStanding("H", "UGA")));
ok(Q(g2, { ask: "foremost", region: "UGA", except: "Y" }).length===0,
   "at zero influence all round, no one answers");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail?1:0);

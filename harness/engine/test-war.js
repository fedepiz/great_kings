// TODO: tests that encode constraints instead of exercising code — "the foremost, and ties" is
// three hand-built argmax tables where a brute-force oracle over a walk would do.
// Strike damage walking down the ladder lives in test-strike.js, where the strike code runs.
const M = require("../new.cjs");
let pass=0, fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log("  ✓",m);} else {fail++;console.log("  ✗ FAIL:",m);} };

console.log("\n— the foremost, and ties —");
let g = M.initState();
const t0 = "UGA";
const set=(p,n)=>{ g.rel[p][t0] = { i:n, s: n>=10?"subject":n>=5?"ally":n>=2?"friend":"none", strained:false }; };
set("H",8); set("E",3); set("M",8); set("B",1);
let f = M.foremostIn(g, t0, "Y").sort();
ok(JSON.stringify(f)===JSON.stringify(["H","M"]), `both leaders at 8 are foremost (got ${f})`);

set("H",9);
f = M.foremostIn(g, t0, "Y");
ok(JSON.stringify(f)===JSON.stringify(["H"]), `a single leader is foremost alone (got ${f})`);

ok(M.foremostIn(g, t0, "H").sort().join()==="M", "the excluded power is never foremost");

console.log("\n— nobody invested, nobody shamed —");
let g2 = M.initState();
for (const p of M.PLAYERS) g2.rel[p][t0] = { i:0, s:"none", strained:false };
ok(M.foremostIn(g2, t0, "Y").length===0, "at zero influence all round, no one answers");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail?1:0);

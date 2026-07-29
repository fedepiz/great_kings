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

console.log("\n— damage walks down the ladder —");
// simulate three strikes: leader takes 2 each time, recomputed
let g3 = M.initState();
const s3=(p,n)=>{ g3.rel[p][t0]={i:n,s:"friend",strained:false}; };
s3("H",6); s3("E",5); s3("M",2); s3("B",0);
const seq=[];
for (let k=0;k<3;k++){
  const lead = M.foremostIn(g3, t0, "Y");
  seq.push(lead.join("+") + "(" + M.infOf(g3, lead[0], t0) + ")");
  for (const q of lead) g3.rel[q][t0].i = Math.max(0, g3.rel[q][t0].i - 2);
}
ok(seq[0]==="H(6)" && seq[1]==="E(5)" && seq[2]==="H(4)",
   `three strikes walk the ladder: ${seq.join(" → ")}`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail?1:0);

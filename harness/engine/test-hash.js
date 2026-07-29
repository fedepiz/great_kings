#!/usr/bin/env node
// Coverage for THE WORLD HASH — the core's protection against a command written against a
// world that no longer exists. This is what lets slow agents act safely on shared state.
const M = require("../new.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const clone = (g) => JSON.parse(JSON.stringify(g));
const first = (g) => M.availableCommands(g).find((c) => c.t !== "forfeit");
const K = (c) => JSON.stringify([c.t, c.rid ?? "", c.i ?? "", c.v ?? "", c.bt ?? "", c.good ?? "", c.pid ?? ""]);

console.log("\n— the chain —");
let g0 = M.initState();
ok(typeof g0.chain === "string" && g0.chain.length > 0, `a fresh world carries a hash (${g0.chain})`);
const c0 = first(g0);
const g1 = M.dispatch(clone(g0), c0);
ok(g1.chain !== g0.chain, "an accepted command advances it");
ok(M.dispatch(clone(g0), c0).chain === g1.chain, "the same command on the same world gives the same hash");

console.log("\n— refusals leave the chain alone —");
ok(M.dispatch(clone(g1), { t: "nonsense" }).chain === g1.chain, "an unknown command does not advance it");
ok(M.dispatch(clone(g1), {}).chain === g1.chain, "a malformed command does not advance it");
const notOffered = { t: "buildType", bt: "granary" };
ok(M.dispatch(clone(g1), notOffered).chain === g1.chain, "a command that is not on offer does not advance it");

console.log("\n— stale commands are refused —");
const nxt = first(g1);
const staleOut = M.dispatch(clone(g1), { ...nxt, chain: g0.chain });   // stamped with the PREVIOUS world
ok(staleOut.chain === g1.chain, "a command stamped with an older world is refused");
ok(/arrives too late/.test(staleOut.log[0]), "and says so in the chronicle");
const freshOut = M.dispatch(clone(g1), { ...nxt, chain: g1.chain });
ok(freshOut.chain !== g1.chain, "a correctly stamped command is accepted");

console.log("\n— unstamped commands still work, so replays and tests are unaffected —");
ok(M.dispatch(clone(g1), nxt).chain !== g1.chain, "a bare command is accepted and advances the chain");

console.log("\n— the case validCmd cannot catch: legal, but a different act —");
// {region NIP} is legal under BUILD and under ENTREAT, meaning different things
let g = M.initState(); g.turn = "B";
g = M.dispatch(g, M.availableCommands(g).find((c) => c.t === "activate" && c.rid === M.HOME.B));
const asBuild = M.dispatch(clone(g), { t: "verb", v: "build" });
const asEntreat = M.dispatch(clone(g), { t: "verb", v: "entreat" });
const inBoth = M.availableCommands(asBuild).filter((c) => c.t === "region")
  .map((c) => c.rid).filter((r) => M.availableCommands(asEntreat).some((c) => c.t === "region" && c.rid === r));
ok(inBoth.length > 0, `a region is legal under both verbs (${inBoth.join(",")})`);
if (inBoth.length) {
  const cmd = { t: "region", rid: inBoth[0] };
  ok(M.validCmd(asEntreat, cmd), "validCmd passes it under the OTHER verb — it cannot tell the difference");
  const misapplied = M.dispatch(clone(asEntreat), { ...cmd, chain: asBuild.chain });
  ok(misapplied.chain === asEntreat.chain, "but the stamp refuses it: the world it was chosen for is gone");
}

console.log("\n— a seat change is a command, so it advances the chain —");
let g2 = M.initState();
const before = g2.chain, seatBefore = M.effectiveSeat(g2);
let guard = 0;
while (M.effectiveSeat(g2) === seatBefore && guard++ < 200) {
  const menu = M.availableCommands(g2).filter((c) => c.t !== "forfeit");
  if (!menu.length) break;
  g2 = M.dispatch(clone(g2), menu[0]);
}
ok(g2.chain !== before, "after the desk moves, the hash has moved too — no special handling needed");

console.log("\n— the fingerprint: the OTHER digest —");
let f0 = M.initState();
const noisy = clone(f0); noisy.log = ["chatter", "more chatter"]; noisy.chain = "deadbeef";
ok(M.fingerprint(noisy) === M.fingerprint(f0), "it ignores the log and the chain — the record, not the world");
const f1 = M.dispatch(clone(f0), first(f0));
ok(M.fingerprint(f1) !== M.fingerprint(f0), "it sees a real change to the board");
ok(f1.chain !== f0.chain, "and the chain moves too, but for a different reason");

console.log("\n— and they answer DIFFERENT questions —");
// walk until a position offers two gifts, then lay them in both orders
let routeA = null, routeB = null, ss = 99 >>> 0;
const rnd2 = () => { ss ^= ss << 13; ss >>>= 0; ss ^= ss >> 17; ss ^= ss << 5; ss >>>= 0; return ss / 4294967296; };
outer:
for (const seed of [7, 21, 99, 1234]) {
  ss = seed >>> 0;
  let w = M.initState();
  for (let i = 0; i < 2000; i++) {
    const gifts = M.availableCommands(w).filter((c) => c.t === "giftToggle");
    if (gifts.length >= 2) {
      // compare at the ACTION BOUNDARY. Mid-action the mode holds scratch state — the gift
      // list is an array holding a set — so two equivalent routes can differ there. Once the
      // embassy is sent the scratch is gone and the positions must agree.
      const send = (g) => { const s = M.availableCommands(g).find((c) => c.t === "giftSend"); return s ? M.dispatch(clone(g), s) : g; };
      routeA = send(M.dispatch(M.dispatch(clone(w), gifts[0]), gifts[1]));
      routeB = send(M.dispatch(M.dispatch(clone(w), gifts[1]), gifts[0]));
      break outer;
    }
    const menu = M.availableCommands(w).filter((c) => c.t !== "forfeit");
    if (!menu.length || w.round > 10) break;
    w = M.dispatch(clone(w), menu[Math.floor(rnd2() * menu.length)]);
  }
}
ok(!!routeA, "found a position offering two gifts");
if (routeA) {
  ok(M.fingerprint(routeA) === M.fingerprint(routeB), "the same two gifts in either order: SAME position");
  ok(routeA.chain !== routeB.chain, "the same two gifts in either order: DIFFERENT trajectory");
  ok(true, "  → the fingerprint is route-independent; the chain is route-dependent. That is the whole distinction.");
}

console.log("\n— the exclusion is justified: the record cannot change what is legal —");
let checked = 0, broke = 0, gw = M.initState(), s = 4242 >>> 0;
const rr = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
for (let i = 0; i < 900; i++) {
  const menu = M.availableCommands(gw).filter((c) => c.t !== "forfeit");
  if (!menu.length || gw.round > 8) break;
  const wiped = clone(gw); wiped.log = []; wiped.chain = "deadbeef";
  const a = M.availableCommands(gw).map(K).sort().join("|");
  const b = M.availableCommands(wiped).map(K).sort().join("|");
  checked++; if (a !== b) broke++;
  gw = M.dispatch(clone(gw), menu[Math.floor(rr() * menu.length)]);
}
ok(broke === 0, `wiping the record never changed a legal move (${checked} states)`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
// Coverage for THE WORLD HASH — the core's protection against a command written against a
// world that no longer exists. This is what lets slow agents act safely on shared state.
//
// The record's exclusion from the fingerprint is proven on REAL transitions only: `refuse`
// asserts (armed for this whole suite) that a refusal writes the log and moves nothing, and
// the route-pair at the foot reaches one position by two different command streams and
// demands equal fingerprints and equal menus. No state is hand-corrupted here — a state no
// rule produced proves nothing about the game.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const fork = F.fork;
const Q = (g, q) => M.query(g, q);
const chainOf = (g) => Q(g, { ask: "chain" });
const first = (g) => M.availableCommands(g).find((c) => c.t !== "forfeit");
const K = (c) => JSON.stringify([c.t, c.rid ?? "", c.i ?? "", c.v ?? "", c.bt ?? "", c.good ?? "", c.pid ?? ""]);
const menuOf = (g) => M.availableCommands(g).map(K).sort().join("|");

console.log("\n— the chain —");
let g0 = M.initState(F.CANON);
ok(typeof chainOf(g0) === "string" && chainOf(g0).length > 0, `a fresh world carries a hash (${chainOf(g0)})`);
const c0 = first(g0);
const g1 = M.dispatch(fork(g0), c0);
ok(chainOf(g1) !== chainOf(g0), "an accepted command advances it");
ok(chainOf(M.dispatch(fork(g0), c0)) === chainOf(g1), "the same command on the same world gives the same hash");

console.log("\n— refusals leave the chain alone, and the position where it stood —");
// the position-unmoved half is `refuse`'s own ASSERT, armed for this whole suite
ok(chainOf(M.dispatch(fork(g1), { t: "nonsense" })) === chainOf(g1), "an unknown command does not advance it");
ok(chainOf(M.dispatch(fork(g1), {})) === chainOf(g1), "a malformed command does not advance it");
const notOffered = { t: "buildType", bt: "granary" };
ok(chainOf(M.dispatch(fork(g1), notOffered)) === chainOf(g1), "a command that is not on offer does not advance it");

console.log("\n— stale commands are refused —");
const nxt = first(g1);
const staleOut = M.dispatch(fork(g1), { ...nxt, chain: chainOf(g0) });   // stamped with the PREVIOUS world
ok(chainOf(staleOut) === chainOf(g1), "a command stamped with an older world is refused");
ok(M.fingerprint(staleOut) === M.fingerprint(g1), "and the position stands exactly where it stood");
const freshOut = M.dispatch(fork(g1), { ...nxt, chain: chainOf(g1) });
ok(chainOf(freshOut) !== chainOf(g1), "a correctly stamped command is accepted");

console.log("\n— unstamped commands still work, so replays and tests are unaffected —");
ok(chainOf(M.dispatch(fork(g1), nxt)) !== chainOf(g1), "a bare command is accepted and advances the chain");

console.log("\n— the case validCmd cannot catch: legal, but a different act —");
// {region NIP} is legal under BUILD and under ENTREAT, meaning different things.
// The board seats Babylon first — authored, not poked.
let g = M.initState(F.variant(F.seatFirst("B")));
g = M.dispatch(g, M.availableCommands(g).find((c) => c.t === "activate" && c.rid === F.home("B")));
const asBuild = M.dispatch(fork(g), { t: "verb", v: "build" });
const asEntreat = M.dispatch(fork(g), { t: "verb", v: "entreat" });
const inBoth = M.availableCommands(asBuild).filter((c) => c.t === "region")
  .map((c) => c.rid).filter((r) => M.availableCommands(asEntreat).some((c) => c.t === "region" && c.rid === r));
ok(inBoth.length > 0, `a region is legal under both verbs (${inBoth.join(",")})`);
if (inBoth.length) {
  const cmd = { t: "region", rid: inBoth[0] };
  ok(M.validCmd(asEntreat, cmd), "validCmd passes it under the OTHER verb — it cannot tell the difference");
  const misapplied = M.dispatch(fork(asEntreat), { ...cmd, chain: chainOf(asBuild) });
  ok(chainOf(misapplied) === chainOf(asEntreat), "but the stamp refuses it: the world it was chosen for is gone");
}

console.log("\n— a seat change is a command, so it advances the chain —");
let g2 = M.initState(F.CANON);
const before = chainOf(g2), seatBefore = Q(g2, { ask: "desk" });
let guard = 0;
while (Q(g2, { ask: "desk" }) === seatBefore && guard++ < 200) {
  const menu = M.availableCommands(g2).filter((c) => c.t !== "forfeit");
  if (!menu.length) break;
  g2 = M.dispatch(fork(g2), menu[0]);
}
ok(chainOf(g2) !== before, "after the desk moves, the hash has moved too — no special handling needed");

console.log("\n— the fingerprint: the OTHER digest —");
let f0 = M.initState(F.CANON);
const f1 = M.dispatch(fork(f0), first(f0));
ok(M.fingerprint(f1) !== M.fingerprint(f0), "it sees a real change to the board");
ok(chainOf(f1) !== chainOf(f0), "and the chain moves too, but for a different reason");

console.log("\n— one position, two routes: the whole distinction, on real play —");
// walk until a position offers two gifts, then lay them in both orders
let routeA = null, routeB = null, ss = 99 >>> 0;
const rnd2 = () => { ss ^= ss << 13; ss >>>= 0; ss ^= ss >> 17; ss ^= ss << 5; ss >>>= 0; return ss / 4294967296; };
outer:
for (const seed of [7, 21, 99, 1234]) {
  ss = seed >>> 0;
  let w = M.initState(F.CANON);
  for (let i = 0; i < 2000; i++) {
    const gifts = M.availableCommands(w).filter((c) => c.t === "giftToggle");
    if (gifts.length >= 2) {
      // compare at the ACTION BOUNDARY. Mid-action the mode holds scratch state — the gift
      // list is an array holding a set — so two equivalent routes can differ there. Once the
      // embassy is sent the scratch is gone and the positions must agree.
      const send = (s2) => { const c = M.availableCommands(s2).find((x) => x.t === "giftSend"); return c ? M.dispatch(fork(s2), c) : s2; };
      routeA = send(M.dispatch(M.dispatch(fork(w), gifts[0]), gifts[1]));
      routeB = send(M.dispatch(M.dispatch(fork(w), gifts[1]), gifts[0]));
      break outer;
    }
    const menu = M.availableCommands(w).filter((c) => c.t !== "forfeit");
    if (!menu.length || Q(w, { ask: "year" }) > 10) break;
    w = M.dispatch(fork(w), menu[Math.floor(rnd2() * menu.length)]);
  }
}
ok(!!routeA, "found a position offering two gifts");
if (routeA) {
  ok(M.fingerprint(routeA) === M.fingerprint(routeB), "the same two gifts in either order: SAME position");
  ok(chainOf(routeA) !== chainOf(routeB), "the same two gifts in either order: DIFFERENT trajectory");
  ok(menuOf(routeA) === menuOf(routeB), "and the SAME menu — the record cannot change what is legal");
  console.log("     → the fingerprint is route-independent; the chain is route-dependent. That is the whole distinction.");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

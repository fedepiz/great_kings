#!/usr/bin/env node
// =====================================================================
// test-checks.js — THE RULES AS EXECUTABLE SPECIFICATION
// =====================================================================
// Two pure pieces, split so traces can later come from anywhere — other generators, saved
// files, recorded games:
//
//   GENERATE (world, seed, length) → a trace of valid commands. Plays in place, clones
//     nothing, knows nothing about checks.
//   CHECK    (world, trace) → a report. Replays in place; the trace ADDRESSES every state
//     it visits — step N names the world initState(world) + trace[0..N].
//
// CHECKS ARE OBSERVERS of the play, never drivers of it. A check is a rule as a Hoare
// triple, written FROM THE RULEBOOK (each cites its section):
//
//   instantiate(Q) — the precondition with its variables bound against the current state:
//     every (power, region, …) for which the written rule's conditions hold;
//   order(b)       — the intent that binding names, as an ORDER;
//   capture(Q, b)  — the before-facts the postcondition needs, as PLAIN VALUES. This is the
//     rule's declared read-set, and the reason nothing is ever cloned;
//   post(cap, Q, b) — the postcondition, relational over (captured, now).
//
// At every action boundary the checker instantiates all checks into TRACKERS. Each trace
// command is then matched against every live tracker with `Order.allows` — the engine's own
// incremental "does the order license this command?" — and marked or, on divergence,
// dropped (backing out, a different target, a different payment all diverge naturally,
// because such commands are never licensed by the order). A tracker that survives to the
// boundary IS the rule happening: its postcondition runs against the captured before-facts.
//
// The catch that observation buys: a tracker that completes proves the action matched the
// rule's SHAPE — so if the play performs a shaped action for which NO instantiation was
// open, either our precondition is too narrow or THE ENGINE PERMITTED WHAT THE RULEBOOK
// FORBIDS. The uncovered-actions histogram in the report is the visible edge of that: long
// unchecked stretches are the to-do list for the next rule specs.
//
// INVARIANTS are the same idea unconditioned: pair-shaped ones declare a scalar `capture`
// taken when a scoped command arrives (bids, the reckoning); state-shaped ones just ask.
// The refusal invariant lives in the engine (`refuse`'s own ASSERT) — one claim, one home.
//
// Deferred, by decision: negative checks (a refusal never appears in a trace; the
// over-permission direction is covered by shape-matched-without-instantiation), multi-action
// sequences (a raid spans desks), guided generation toward cold checks. See TODO.md.
const M = require("../new.cjs");
const F = require("./fixtures.cjs");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const ask = (g) => (q) => M.query(g, q);
const GOODS = ["food", "bronze", "cloth", "pottery"];
const VERB_MODES = new Set(["build", "remove", "tax", "entreat", "treaty", "subvert", "raid", "searaid", "trade"]);
const sum = (a) => a.reduce((x, y) => x + y, 0);

// ---- the precondition vocabulary, said once ----
const seated = (Q) => Q({ ask: "seated" });
const nobodyHome = (Q, r) => seated(Q).every((q) => Q({ ask: "standing", power: q, region: r }) !== "home");
const stocksOf = (Q, p) => Q({ ask: "stock", power: p });
const allStocks = (Q) => Object.fromEntries(seated(Q).map((q) => [q, stocksOf(Q, q)]));
const producersOf = (Q, r) => Q({ ask: "works", region: r }).filter((w) => w.yield && !w.tapped);
// who could open (or is inside) an action right now, and the palace slot an opening order
// would name — null actor when an activation is already open, so the order names no activate
const actor = (Q) => {
  const p = Q({ ask: "turn" });
  if (Q({ ask: "desk" }) !== p) return null;
  if (Q({ ask: "activation" })) return { p, slot: null };
  const palace = Q({ ask: "works", region: F.home(p) }).find((w) => w.type === "palace" && !w.tapped);
  return palace ? { p, slot: palace.slot } : null;
};
const withActor = (a, order) => (a.slot === null ? order : { actor: { rid: F.home(a.p), i: a.slot }, ...order });
const subsets = (xs) => xs.reduce((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]).filter((s) => s.length);
// THE RULEBOOK'S OWN REACH, restated as spec (§6: envoys range 3; they cross only ground you
// hold at Friend+, and SAIL — a region with a port, tapped or not, reaches every coast in one
// step). Deliberately an independent second statement of the engine's `reach`: if the two
// ever disagree, a shaped action will complete with no open instantiation, or an
// instantiation will never see its action — either way the report shows it.
const allCoastal = (Q) => F.CANON.regions.map((r) => r.id).filter((rid) => Q({ ask: "coastal", region: rid }));
const envoyReach = (Q, p, start, range) => {
  const holds = (x) => ["friend", "ally", "subject", "home"].includes(Q({ ask: "standing", power: p, region: x }));
  const seen = new Set([start]);
  let frontier = [start];
  for (let d = 0; d < range; d++) {
    const next = [];
    for (const x of frontier) {
      if (x !== start && !holds(x)) continue;
      const nbs = [...Q({ ask: "neighbours", region: x })];
      if (Q({ ask: "coastal", region: x }) && Q({ ask: "works", region: x }).some((w) => w.type === "port"))
        for (const y of allCoastal(Q)) if (y !== x) nbs.push(y);
      for (const y of nbs) if (!seen.has(y)) { seen.add(y); next.push(y); }
    }
    frontier = next;
  }
  seen.delete(start);
  return [...seen];
};

// =====================================================================
// THE CHECKS
// =====================================================================
const CHECKS = [
  {
    name: "the levy sweeps one province's untapped producers into the stores",
    cite: "§6 Levy",
    instantiate: (Q) => {
      const a = actor(Q); if (!a) return [];
      const out = [];
      for (const r of [F.home(a.p), ...Q({ ask: "neighbours", region: F.home(a.p) })]) {
        const s = Q({ ask: "standing", power: a.p, region: r });
        if (s !== "home" && s !== "subject") continue;
        if (producersOf(Q, r).length) out.push({ ...a, r });
      }
      return out;
    },
    order: (b) => withActor(b, { verb: "tax", target: { rid: b.r } }),
    capture: (Q, b) => ({ stocks: allStocks(Q), swept: producersOf(Q, b.r).map((w) => ({ slot: w.slot, good: w.yield.good, n: w.yield.n })) }),
    post: (cap, Q, b) => {
      for (const good of GOODS) {
        const want = sum(cap.swept.filter((w) => w.good === good).map((w) => w.n));
        const got = stocksOf(Q, b.p)[good] - cap.stocks[b.p][good];
        if (got !== want) return `stores moved by ${got} ${good}, the swept yields say ${want}`;
      }
      const rows = Q({ ask: "works", region: b.r });
      for (const w of cap.swept) if (!rows.find((x) => x.slot === w.slot).tapped) return `a swept producer (slot ${w.slot}) is not tapped`;
      for (const q of Object.keys(cap.stocks)) if (q !== b.p)
        for (const good of GOODS) if (stocksOf(Q, q)[good] !== cap.stocks[q][good]) return `the levy touched ${q}'s stores`;
      return null;
    },
  },
  {
    name: "an embassy's worth is one influence per distinct gift",
    cite: "§6 Entreat",
    // one instantiation per non-empty subset of the goods held: whatever the play carries,
    // the matching tracker survives. Tap-paid embassies stay uncovered for now (the report
    // will say so) — enumerating tap sponsorships is a later spec.
    instantiate: (Q) => {
      const a = actor(Q); if (!a) return [];
      const held = GOODS.filter((t) => stocksOf(Q, a.p)[t] > 0);
      if (!held.length) return [];
      const out = [];
      for (const r of envoyReach(Q, a.p, F.home(a.p), 3)) {
        if (!nobodyHome(Q, r)) continue;
        if ((Q({ ask: "ledger", power: a.p }).entreat || []).includes(r)) continue;
        for (const goods of subsets(held)) out.push({ ...a, r, goods });
      }
      return out;
    },
    order: (b) => withActor(b, { verb: "entreat", target: { rid: b.r }, pay: "stores", goods: b.goods }),
    capture: (Q, b) => ({
      influence: Q({ ask: "influence", power: b.p, region: b.r }),
      standing: Q({ ask: "standing", power: b.p, region: b.r }),
      stocks: stocksOf(Q, b.p),
    }),
    post: (cap, Q, b) => {
      const now = Q({ ask: "influence", power: b.p, region: b.r });
      if (now - cap.influence !== b.goods.length) return `influence moved ${now - cap.influence}, the gifts numbered ${b.goods.length}`;
      if (cap.standing === "none" && now >= 2 && Q({ ask: "standing", power: b.p, region: b.r }) !== "friend")
        return "the Friend floor was met and ties were not established";
      for (const t of b.goods) if (stocksOf(Q, b.p)[t] !== cap.stocks[t] - 1) return `the gift of ${t} did not leave the stores`;
      if (!(Q({ ask: "ledger", power: b.p }).entreat || []).includes(b.r)) return "the year's ledger did not record the embassy";
      return null;
    },
  },
  {
    name: "a Friend at the Ally floor climbs, unless an incumbent stands higher",
    cite: "§2 Relations · §6 Treaty",
    instantiate: (Q) => {
      const a = actor(Q); if (!a) return [];
      const out = [];
      for (const r of envoyReach(Q, a.p, F.home(a.p), 3)) {
        if (!nobodyHome(Q, r)) continue;
        if (Q({ ask: "standing", power: a.p, region: r }) !== "friend") continue;
        const mine = Q({ ask: "influence", power: a.p, region: r });
        if (mine < 5) continue;
        const blocked = seated(Q).some((q) => q !== a.p
          && ["ally", "subject"].includes(Q({ ask: "standing", power: q, region: r }))
          && Q({ ask: "influence", power: q, region: r }) >= mine);
        if (!blocked) out.push({ ...a, r });
      }
      return out;
    },
    order: (b) => withActor(b, { verb: "treaty", target: { rid: b.r } }),
    capture: (Q, b) => ({
      ladder: Object.fromEntries(seated(Q).map((q) => [q,
        { standing: Q({ ask: "standing", power: q, region: b.r }), influence: Q({ ask: "influence", power: q, region: b.r }) }])),
    }),
    post: (cap, Q, b) => {
      if (Q({ ask: "standing", power: b.p, region: b.r }) !== "ally") return "the climb did not land on Ally";
      for (const [q, was] of Object.entries(cap.ladder)) {
        if (Q({ ask: "influence", power: q, region: b.r }) !== was.influence)
          return `the treaty moved ${q}'s influence — it converts standing, it spends nothing`;
        if (q !== b.p && ["ally", "subject"].includes(was.standing)
            && Q({ ask: "standing", power: q, region: b.r }) !== "friend")
          return `the incumbent ${q} did not collapse to Friend`;
      }
      return null;
    },
  },
];

// =====================================================================
// THE INVARIANTS
// =====================================================================
const INVARIANTS = [
  { name: "a contest mints or burns no goods", cite: "§9", kind: "pair", mustFire: false,
    scope: (cmd) => cmd.t === "bid" || cmd.t === "bidTake",
    capture: (Q) => {
      let n = sum(seated(Q).map((q) => sum(GOODS.map((t) => stocksOf(Q, q)[t]))));
      const c = Q({ ask: "contest" });
      if (c) for (const lot of Object.values(c.lots)) for (const b of Object.values(lot)) n += sum(GOODS.map((t) => b[t] || 0));
      return n;
    },
    holds: (cap, Q) => {
      let n = sum(seated(Q).map((q) => sum(GOODS.map((t) => stocksOf(Q, q)[t]))));
      const c = Q({ ask: "contest" });
      if (c) for (const lot of Object.values(c.lots)) for (const b of Object.values(lot)) n += sum(GOODS.map((t) => b[t] || 0));
      return n === cap ? null : `goods moved from ${cap} to ${n} across a bid`;
    } },
  { name: "the reckoning touches no good but food", cite: "§10 Upkeep", kind: "pair", mustFire: true,
    scope: (cmd) => cmd.t === "resolveUpkeep" || cmd.t === "perish",
    capture: (Q) => Object.fromEntries(seated(Q).map((q) => [q, [stocksOf(Q, q).bronze, stocksOf(Q, q).cloth, stocksOf(Q, q).pottery]])),
    holds: (cap, Q) => {
      for (const [q, was] of Object.entries(cap)) {
        const st = stocksOf(Q, q);
        if (st.bronze !== was[0] || st.cloth !== was[1] || st.pottery !== was[2]) return `the reckoning moved ${q}'s metal, cloth or clay`;
      }
      return null;
    } },
  { name: "a contest is fought in ascending order of investment", cite: "§9", kind: "state", mustFire: true,
    scope: (Q) => { const e = Q({ ask: "engagement" }); return !!e && ["assembly", "muster", "bidding"].includes(e.phase); },
    holds: (Q) => {
      const c = Q({ ask: "contest" });
      const inf = c.turnOrder.map((q) => Q({ ask: "influence", power: q, region: c.region }));
      return inf.every((v, k) => k === 0 || inf[k - 1] <= v) ? null : `turnOrder ${c.turnOrder} carries influences ${inf}`;
    } },
];

// =====================================================================
// THE GENERATOR — (world, seed, length) → a trace of valid commands. Nothing else.
// =====================================================================
// The generator's policy is DATA, not branches: `knobs.reject` is a rejection chance keyed
// by command type. Draw a command uniformly; if its type has a chance and the roll rejects,
// draw again (bounded, so a menu of nothing-but-rejects still terminates). Nothing is named
// specially — even forfeit's exclusion is just a chance of 1. Guidance toward cold checks
// will be further knobs here, not further branches.
function generateRandom(scenario, seed, length, knobs = {}) {
  const reject = knobs.reject || {};
  const rounds = knobs.rounds ?? 8;
  let s = seed >>> 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  let g = M.initState(scenario);
  const trace = [];
  for (let i = 0; i < length; i++) {
    if (M.query(g, { ask: "year" }) > rounds) break;
    const menu = M.availableCommands(g);
    if (!menu.length) break;
    let cmd = menu[Math.floor(rnd() * menu.length)];
    for (let tries = 0; tries < 25; tries++) {
      const chance = reject[cmd.t];
      if (!chance || rnd() >= chance) break;
      cmd = menu[Math.floor(rnd() * menu.length)];
    }
    trace.push(cmd);
    g = M.dispatch(g, cmd);
  }
  return trace;
}

// =====================================================================
// THE CHECKER — (world, trace) → the report. Replays in place; clones nothing.
// =====================================================================
function checkTrace(scenario, trace, report, runLabel) {
  let g = M.initState(scenario);
  let trackers = [];
  let action = [];                       // the current action's {cmd, mode} rows, for labelling
  let actionStart = 0;

  // Order.allows was built for DRIVING, where only sensible candidates arrive; observation
  // feeds it every command, and a contest terminal (stand/launch/endRaid) is vacuously
  // "allowed" by an order with no basket and no units. A command is only a MATCH if the
  // order actually names that kind of thing.
  const relevant = (order, cmd) => {
    switch (cmd.t) {
      case "activate": return !!order.actor;
      case "verb": return !!order.verb;
      case "region": return !!order.target;
      case "buildType": return !!order.buildType;
      case "srcStock": case "srcStockUnit": case "giftToggle": case "giftSend": return order.pay === "stores";
      case "commitTaps": return order.pay === "taps";
      case "slot": return !!(order.tapSlots && order.tapSlots.length) || !!(order.units && order.units.length)
        || !!(order.strikes && order.strikes.length) || !!order.source
        || (order.target && order.target.i !== undefined);
      case "bid": return !!(order.basket && Object.keys(order.basket).length);
      case "stand": case "launch": return !!(order.units && order.units.length) || !!(order.basket && Object.keys(order.basket).length);
      case "endRaid": return !!(order.strikes && order.strikes.length);
      default: return false;
    }
  };
  // Trackers open at action boundaries AND at the engine's own set-down moves: a `verb` or
  // `back` command abandons the previous errand-candidate at an UNCHANGED position and begins
  // a new one, so the tracker set is replaced wholesale there. `offset` records how far into
  // the action a tracker opened, so completion is measured from its own start.
  const openTrackers = (step) => {
    trackers = [];
    for (const check of CHECKS)
      for (const b of check.instantiate(ask(g)))
        trackers.push({ check, bind: b, order: check.order(b), used: [], cap: check.capture(ask(g), b), at: step, offset: action.length });
  };
  const closeAction = (endStep) => {
    if (action.length) {
      const last = action[action.length - 1].cmd.t;
      const verb = M.Order.read(action).verb;                        // a pure fold: no execution
      // an errand exited without spending its command is DITHERING, not the verb it abandoned
      const label = ["endActivation", "cancelActivation", "tradeCancel"].includes(last)
        ? "(abandoned)" : verb || action[0].cmd.t;
      const covered = trackers.filter((t) => t.matched === action.length - t.offset);
      const cov = report.coverage[label] || (report.coverage[label] = { actions: 0, covered: 0 });
      cov.actions++;
      if (covered.length) cov.covered++;
      for (const t of covered) {
        const tally = report.checks[t.check.name];
        const msg = t.check.post(t.cap, ask(g), t.bind);
        if (msg) { tally.no++; tally.failures.push({ run: runLabel, at: t.at, binding: t.bind, reason: msg }); }
        else tally.ok++;
      }
    }
    action = [];
    actionStart = endStep;
    openTrackers(endStep);
  };

  openTrackers(0);
  for (let step = 0; step < trace.length; step++) {
    const cmd = trace[step];
    const Qb = ask(g);
    const mode = Qb({ ask: "mode" });
    const desk0 = Qb({ ask: "desk" });
    const act0 = Qb({ ask: "activation" });
    // pair-invariants take their scalar captures only when the command is in scope
    const pairs = INVARIANTS.filter((inv) => inv.kind === "pair" && inv.scope(cmd))
      .map((inv) => ({ inv, cap: inv.capture(Qb) }));
    // match the command against every live tracker: licensed → marked, otherwise the play
    // has diverged from that instantiation and the tracker is dropped
    trackers = trackers.filter((t) => {
      if (t.bind.p !== desk0) return false;
      // the mode label names the verb currently chosen; a tracker whose order disagrees is
      // tracking an errand the play is not on — without this, a bare `region` command
      // matches ANY same-target order, whatever its verb
      if (VERB_MODES.has(mode) && t.order.verb !== mode) return false;
      if (!relevant(t.order, cmd)) return false;
      if (!M.Order.allows(t.order, cmd, t.used, mode)) return false;
      M.Order.mark(t.order, cmd, t.used, mode);
      t.matched = (t.matched || 0) + 1;
      return true;
    });
    action.push({ cmd, mode });
    g = M.dispatch(g, cmd);
    const Qa = ask(g);

    for (const { inv, cap } of pairs) {
      const tally = report.invariants[inv.name];
      tally.fired++;
      const msg = inv.holds(cap, Qa);
      if (msg) tally.failures.push({ run: runLabel, at: step, reason: msg });
    }
    for (const inv of INVARIANTS) {
      if (inv.kind !== "state" || !inv.scope(Qa)) continue;
      const tally = report.invariants[inv.name];
      tally.fired++;
      const msg = inv.holds(Qa);
      if (msg) tally.failures.push({ run: runLabel, at: step, reason: msg });
    }
    // a verb picked (or an errand set down) is a fresh intent at an unmoved position:
    // replace the tracker set so the play's dithering cannot starve the observers
    if (cmd.t === "verb" || cmd.t === "back") openTrackers(step + 1);
    // the action boundary: a command was spent, the activation closed, or the desk moved
    const actNow = Qa({ ask: "activation" });
    const spent = (act0 && actNow && actNow.left !== null && act0.left !== null && actNow.left < act0.left)
      || (act0 && !actNow) || Qa({ ask: "desk" }) !== desk0;
    if (spent) closeAction(step + 1);
  }
  closeAction(trace.length);
}

// =====================================================================
// THE RUNS
// =====================================================================
const WORLDS = {
  canon: () => F.variant(),
  contests: () => F.variant(F.seatFirst("H"),
    F.standing("H", "KIZ", "ally", 8), F.standing("M", "KIZ", "friend", 5),
    F.addWork("HAT", { type: "chancery", crown: "H" }),
    F.stocks({ food: 4, bronze: 4, cloth: 4, pottery: 4 })),
  // Mitanni seated first with a Friend at the Ally floor next door: the treaty's ground
  treaties: () => F.variant(F.seatFirst("M"),
    F.standing("M", "ASH", "friend", 6), F.standing("M", "CAR", "friend", 7),
    F.stocks({ food: 3, bronze: 3, cloth: 3, pottery: 3 })),
};
const report = { runs: [], coverage: {}, checks: {}, invariants: {} };
for (const c of CHECKS) report.checks[c.name] = { cite: c.cite, ok: 0, no: 0, failures: [] };
for (const i of INVARIANTS) report.invariants[i.name] = { cite: i.cite, fired: 0, failures: [] };

// the run policy: never forfeit; mostly see errands through rather than dither out of them
const KNOBS = { rounds: 8, reject: {
  forfeit: 1,
  back: 0.9, endActivation: 0.9, cancelActivation: 0.9, tradeCancel: 0.9,
  srcToChoose: 0.9, srcBack: 0.9, bidTake: 0.9,
} };

console.log("\n— generate, then check: the trace addresses every state it visits —");
for (const [label, world] of Object.entries(WORLDS)) for (const seed of [5, 17, 23, 41]) {
  const trace = generateRandom(world(), seed, 700, KNOBS);
  report.runs.push({ world: label, seed, steps: trace.length });
  checkTrace(world(), trace, report, `${label}/${seed}`);
  console.log(`   · ${label}/${seed}: ${trace.length} commands replayed`);
}

// ---- the report ----
console.log("\n— the report —");
const failures = [
  ...Object.entries(report.checks).flatMap(([n, t]) => t.failures.map((f) => `${n}: ${f.reason} @ ${f.run} step ${f.at} ${JSON.stringify(f.binding)}`)),
  ...Object.entries(report.invariants).flatMap(([n, t]) => t.failures.map((f) => `INVARIANT ${n}: ${f.reason} @ ${f.run} step ${f.at}`)),
];
for (const v of failures.slice(0, 10)) console.log("   ✗", v);
ok(failures.length === 0, `no observed action broke its rule (${failures.length} failure(s); rebuild any with initState(world) + replay to the step)`);
for (const [name, t] of Object.entries(report.checks))
  ok(t.ok + t.no > 0, `${name} [${t.cite}] — observed ${t.ok + t.no} time(s) (${t.no} failing)`);
for (const inv of INVARIANTS) {
  const t = report.invariants[inv.name];
  if (inv.mustFire) ok(t.fired > 0, `invariant "${inv.name}" [${t.cite}] — watched ${t.fired} time(s)`);
  else console.log(`   · invariant "${inv.name}" [${t.cite}] — watched ${t.fired} time(s) (not required to fire)`);
}
const totals = Object.values(report.coverage).reduce((a, c) => ({ actions: a.actions + c.actions, covered: a.covered + c.covered }), { actions: 0, covered: 0 });
console.log(`\n— coverage: ${totals.covered} of ${totals.actions} actions checked by at least one rule —`);
for (const [label, c] of Object.entries(report.coverage).sort((x, y) => (y[1].actions - y[1].covered) - (x[1].actions - x[1].covered)))
  console.log(`   ${String(c.covered).padStart(4)}/${String(c.actions).padEnd(4)} ${label}${c.covered < c.actions ? "   ← uncovered ground: a rule spec to write" : ""}`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

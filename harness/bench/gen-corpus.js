#!/usr/bin/env node
// =====================================================================
// gen-corpus.js — STEP ONE of the scribe evaluation
// =====================================================================
// Produces harness/corpus.json: everything the eval harness needs, and
// nothing that depends on a model. Re-run it whenever the engine's rules
// change; the corpus is derived from the engine, never hand-written.
//
// WHAT A CASE IS
//   A case is a real activation, reached by real commands from initState.
//   It carries: the command PREFIX that reaches its opening, the ORACLE
//   sequence that plays it out, a directive in three registers, and one
//   record per decision POSITION with everything the harness scores by.
//
// TEACHER FORCING
//   The harness asks the candidate for position i, scores the answer, then
//   THROWS IT AWAY and advances by the oracle. So every position's state is
//   replay(prefix + oracle[0..i-1]) — identical for every candidate and every
//   condition. Nothing here depends on what any candidate predicts.
//
// COHERENCE
//   Random play backtracks: srcBack, reselect, tradeCancel. A directive
//   cannot describe that, so the generating walk never offers those commands.
//   Coherent traces are produced by construction rather than filtered after.
// =====================================================================

const fs = require("fs");
const path = require("path");
const M = require(path.join(__dirname, "..", "new.cjs"));

const clone = (g) => JSON.parse(JSON.stringify(g));
const R = M.R, BT = M.BT, PNAME = M.PNAME, GOODS = M.GOODS;

// Commands that undo, abandon or re-open a choice: never part of a plan — and the identity
// of a command. Both live in the engine, beside the commands they describe. They were copied
// into three harness files apiece and agreed only because they were edited with one regex.

// Which engine the corpus was generated against, stamped into meta so check-chain.js can
// prove it rather than compare mtimes. `cli()` fills it in; it stays null in the published
// bench, which has no filesystem to read and carries the engine inline anyway.
let ENGINE_HASH = null;

// ---------------------------------------------------------------- walk
const BACKTRACK = M.ORDER_NEVER, key = M.cmdKey;
function rng(seed) { let s = seed >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// Play forward, recording every command. Activations are cut out afterwards.
function walk(seed, maxRounds) {
  const rnd = rng(seed);
  let g = M.initState();
  const log = [];                        // { cmd, seat, actBefore, capBefore, capAfter, actAfter, mode }
  let actionSoFar = new Set();           // commands already issued in the action under way
  for (let i = 0; i < 5000; i++) {
    if (g.round > maxRounds) break;
    // a court that has named its verb does not shop for another: offering `verb` again
    // produces traces the directive cannot describe, and would score right answers wrong
    // what the candidate will be shown at eval time: everything legal but backtracking
    const menu = M.availableCommands(g).filter((c) => !BACKTRACK.has(c.t));
    // what the WALK may choose. This shapes the traces only; it never narrows what the
    // candidate is offered.
    //  · a court that has named its verb does not shop for another
    //  · and it never issues the same command twice inside one action, because for every
    //    toggle — a unit committed, a producer tapped, a gift chosen — the second press
    //    UNDOES the first. Only `bid` legitimately repeats: a basket is accumulated.
    const committedToVerb = !!(g.mode && g.mode.v && g.mode.v !== "source");
    let choices = menu.filter((c) => !(committedToVerb && c.t === "verb"))
      .filter((c) => c.t === "bid" || !actionSoFar.has(key(c)));
    // A COURT DOES NOT ANNOUNCE A VERB IT CANNOT CARRY OUT. Naming one whose targets are
    // empty leaves the walk with nothing legal but to name another, and it thrashes —
    // twelve verbs in a row, describing nothing. So look one step ahead and keep only the
    // verbs that actually lead somewhere.
    if (!committedToVerb && choices.some((c) => c.t === "verb")) {
      choices = choices.filter((c) => {
        if (c.t !== "verb") return true;
        try {
          const n = M.dispatch(clone(g), c);
          const lt = M.availableCommands(n).filter((x) => !BACKTRACK.has(x.t) && x.t !== "verb");
          return lt.length > 0;
        } catch (e) { return false; }
      });
    }
    if (!menu.length) {
      const esc = M.availableCommands(g).filter((c) => c.t === "pass" || c.t === "endActivation" || c.t === "resolveUpkeep");
      if (!esc.length) break;
      g = M.dispatch(clone(g), esc[0]);
      log.push({ cmd: esc[0], escape: true });
      continue;
    }
    // nothing coherent left to do: close the activation cleanly rather than thrash
    if (!choices.length) {
      const esc = M.availableCommands(g).find((c) => c.t === "endActivation") || M.availableCommands(g).find((c) => c.t === "pass");
      if (!esc) break;
      g = M.dispatch(clone(g), esc);
      log.push({ cmd: esc, escape: true });
      actionSoFar = new Set();
      continue;
    }
    const cmd = choices[Math.floor(rnd() * choices.length)];
    const seat = M.effectiveSeat(g);
    const rec = {
      cmd, seat,
      actBefore: !!g.act, capBefore: g.act ? g.act.capLeft : null,
      mode: g.mode ? g.mode.v : (g.act ? "verb-choice" : "activate"),
      menuSize: menu.length,
      menu: menu.map((c) => ({ ...c })),
      // what the pending action had gathered at this point: the gifts and taps that
      // an embassy actually carries are only visible here, not in the command stream
      board: null,   // filled below only where a case needs it
      pending: g.mode ? {
        gifts: (g.mode.gifts || []).slice(),
        paid: (g.mode.paid || []).slice(),
        taps: (g.mode.taps || []).map((x) => x[0]),
        tapSlots: (g.mode.taps || []).map((x) => [x[0], x[1]]),   // WHICH producers, not just where
        region: g.mode.region || null,
        extracted: g.mode.extracted || null,   // WHICH good the trade is for
      } : null,
    };
    rec.board = {};
    for (const rid of Object.keys(g.b)) rec.board[rid] = g.b[rid].map((bd) => (bd ? bd.t : null));
    g = M.dispatch(clone(g), cmd);
    rec.actAfter = !!g.act; rec.capAfter = g.act ? g.act.capLeft : null;
    log.push(rec);
    // a spent command, or a closed activation, starts the slate afresh
    const spent = (rec.capBefore != null && rec.capAfter != null && rec.capAfter < rec.capBefore)
      || (rec.actBefore && rec.actAfter === false);
    if (spent) actionSoFar = new Set(); else actionSoFar.add(key(cmd));
  }
  return log;
}

// ---------------------------------------------------------------- cut into activations
function activations(log) {
  const out = [];
  for (let i = 0; i < log.length; i++) {
    if (log[i].escape || log[i].cmd.t !== "activate") continue;
    const start = i;
    let j = i;
    while (j < log.length && !log[j].escape) {
      if (j > start && log[j].cmd.t === "activate") break;      // a new activation began
      if (log[j].actAfter === false) { j++; break; }            // this one closed
      j++;
    }
    const seq = log.slice(start, j).filter((r) => !r.escape);
    if (seq.length >= 2 && seq[seq.length - 1].actAfter === false) {
      // EVERY command before the activation belongs to the prefix, escapes included —
      // they moved the board, and a prefix that omits them replays to a different game
      out.push({ at: start, seq, prefix: log.slice(0, start).map((r) => r.cmd) });
    }
    i = j - 1;
  }
  return out;
}

// split an activation into ACTIONS-PROPER: a palace command spends one of three;
// a market, port or seat building is a single action that ends with the activation
function splitActions(seq) {
  const acts = []; let cur = [];
  for (const r of seq) {
    cur.push(r);
    const spent = (r.capBefore != null && r.capAfter != null && r.capAfter < r.capBefore)
      || (r.actBefore && r.actAfter === false);
    if (spent) { acts.push(cur); cur = []; }
  }
  if (cur.length) acts.push(cur);
  return acts.filter((a) => a.length);
}

// ---------------------------------------------------------------- goals
// Read an action's commands and say, in structured form, what it achieved.
function goalOf(action) {
  const cmds = action.map((r) => r.cmd);
  // the LAST pending snapshot of the action holds what it actually carried
  const last = [...action].reverse().find((r) => r.pending && (r.pending.paid.length || r.pending.gifts.length || r.pending.taps.length));
  const anyPending = [...action].reverse().find((r) => r.pending && r.pending.extracted);
  const g = { verb: null, target: null, goods: [], pay: null, payRegion: null, buildType: null, source: null };
  for (const c of cmds) {
    if (c.t === "verb") g.verb = c.v;
    else if (c.t === "region") g.target = c.rid;
    else if (c.t === "giftToggle") g.goods.push(c.good);
    else if (c.t === "buildType") g.buildType = c.bt;
    else if (c.t === "srcStock" || c.t === "srcStockUnit") g.pay = "stores";
    else if (c.t === "commitTaps") g.pay = "taps";
    else if (c.t === "tapToggle") { g.pay = "taps"; g.payRegion = g.payRegion || c.rid; }
    else if (c.t === "slot" && !g.source) g.source = { rid: c.rid, i: c.i };
    else if (c.t === "activate") g.opened = { rid: c.rid, kind: c.b };
  }
  if (!g.verb && g.opened && (g.opened.kind === "market" || g.opened.kind === "port")) g.verb = "trade";
  if (!g.goods.length && last) g.goods = [...new Set(last.pending.paid.length ? last.pending.paid : last.pending.gifts)];
  // the taps a sourcing arrives at are visible only in the pending mode, never in the
  // command stream — in trade they are `slot` clicks, indistinguishable from anything else
  if (last && last.pending.taps.length) {
    g.pay = "taps";
    g.payRegion = g.payRegion || last.pending.taps[0];
    g.tapSlots = last.pending.tapSlots || [];
  }
  if (anyPending) g.extracted = anyPending.pending.extracted;
  if (!g.target && last && last.pending.region) g.target = last.pending.region;
  // REMOVE and TRADE aim at a slot: name the region it stands in
  if (!g.target && (g.verb === "remove" || g.verb === "trade")) {
    const s = cmds.filter((c) => c.t === "slot").pop();
    if (s) { g.target = s.rid; g.slot = s.i; }
  }
  return g;
}

// THE ORDER lives in the engine — see `Order` in levant-prototype-v25.jsx. The corpus
// only READS orders out of traces and renders them; it defines none of the rules.
const orderOf = M.Order.read;

const nm = (rid) => (R[rid] ? R[rid].n : rid);
// what stands where, as of the case being described
let BUILDINGS = {};
function snapshotFrom(action) {
  const withBoard = [...action].reverse().find((r) => r.board);
  BUILDINGS = withBoard ? withBoard.board : {};
}
const list = (a) => (a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

// ---------------------------------------------------------------- directives, three registers
function phrase(goal, register) {
  const t = nm(goal.target), pay = goal.pay === "taps" && goal.payRegion ? nm(goal.payRegion) : null;
  // NAME THE WORKS THAT PAY. "Tarhuntassa's own producers" does not say which, nor how many,
  // and a scribe told only the province will stop as soon as one tap is down.
  const works = (goal.tapSlots || []).map(([rid, i]) => {
    const bd = (BUILDINGS[rid] || [])[i];
    return bd ? BT[bd].name.toLowerCase() : null;
  }).filter(Boolean);
  const worksTxt = works.length ? list([...works]) : "its own producers";
  const payT = pay ? `by tapping ${pay}'s ${worksTxt}` : "from your stores";
  const payP = pay ? `paying with ${pay}'s ${worksTxt}` : "paying from your stores";
  switch (goal.verb) {
    case "tax": return {
      template: `LEVY ${t}`,
      prose: `Sweep the producers of ${t} into your stores`,
      loose: `Take what ${t} has standing`,
    };
    case "build": return {
      template: `BUILD ${goal.buildType ? BT[goal.buildType].name.toLowerCase() : "a building"} at ${t} (${payT})`,
      prose: `Raise a ${goal.buildType ? BT[goal.buildType].name.toLowerCase() : "building"} at ${t}, ${payP}`,
      loose: `${t} could use a ${goal.buildType ? BT[goal.buildType].name.toLowerCase() : "building"} — ${pay ? `let ${pay} pay for it` : "pay for it yourself"}`,
    };
    case "entreat": return {
      template: `ENTREAT ${t} with ${goal.goods.join(", ") || "gifts"} (${payT})`,
      prose: `Send an embassy to ${t} bearing ${list(goal.goods) || "gifts"}, ${payP}`,
      loose: `Court ${t} — ${list(goal.goods) || "something handsome"} ought to move them${pay ? `, and ${pay} can furnish it` : ""}`,
    };
    case "treaty": return {
      template: `TREATY with ${t}`,
      prose: `Bind ${t} closer with a treaty`,
      loose: `${t} is ready to be held tighter — put it in writing`,
    };
    case "subvert": return {
      template: `SUBVERT ${t}`,
      prose: `Open a bidding for the elite of ${t}`,
      loose: `Buy the great men of ${t} out from under whoever holds them`,
    };
    case "remove": return {
      template: `REMOVE the ${goal.what || "building"} at ${t || "your ground"}`,
      prose: `Pull down the ${goal.what || "work"} standing at ${t || "your ground"}`,
      loose: `The ${goal.what || "building"} at ${t || "home"} has outlived its use — clear it`,
    };
    case "raid": case "searaid": return {
      template: `${goal.verb === "searaid" ? "SEA RAID" : "RAID"} ${t}`,
      prose: `Fall on ${t}${goal.verb === "searaid" ? " from the sea" : ""}`,
      loose: `Put ${t} to the spear${goal.verb === "searaid" ? " — go by ship" : ""}`,
    };
    case "trade": {
      const src = goal.source ? nm(goal.source.rid) : "a source in reach";
      // a province may hold several producers: name the GOOD, or the instruction is ambiguous
      const what = goal.extracted ? `the ${goal.extracted}` : "what is on offer";
      return {
        template: `TRADE: buy ${goal.extracted || "goods"} from ${src} (${payT})`,
        prose: `buy ${what} from ${src}, ${payP}`,
        loose: `${src} has ${what} worth having — go and get it${pay ? `, and let ${pay} cover it` : ""}`,
      };
    }
    default: return { template: `ACT at ${t || "the seat"}`, prose: `Act at ${t || "the seat"}`, loose: `Do what is needed at ${t || "the seat"}` };
  }
}

// joining clauses lower-cases the first word — unless it is a place, which keeps its capital
const PLACE_NAMES = new Set(M.REG.map((r) => r.n.split(" ")[0]));
function lowerUnlessName(s) {
  const first = s.split(/[ ,]/)[0];
  return PLACE_NAMES.has(first) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}
function directive(goals, opened) {
  const parts = goals.map((g) => phrase(g, null));
  const where = opened ? nm(opened.rid) : "the seat";
  const kind = opened && opened.kind === "palace" ? "the palace"
    : opened && BT[opened.kind] ? "the " + BT[opened.kind].name.toLowerCase()
    : opened ? "the " + opened.kind : "the seat";
  // ALWAYS NAME THE ACTOR. Several markets may be open to a court, and a directive that
  // says only what to buy leaves the first decision — which building to open — unanswerable.
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (parts.length === 1) return {
    template: `OPEN ${kind} at ${where}; ` + parts[0].template + ".",
    prose: `Open ${kind} at ${where}. ` + cap(parts[0].prose) + ".",
    loose: `Open up at ${where}. ` + cap(parts[0].loose) + ".",
  };
  return {
    template: parts.map((p, i) => `${i + 1}) ${p.template}`).join("; ") + ".",
    prose: `Open ${kind} at ${where}. ` + parts.map((p, i) => (i ? lowerUnlessName(p.prose) : cap(p.prose))).join(", then ") + ".",
    loose: parts.map((p, i) => (i ? lowerUnlessName(p.loose) : p.loose)).join(". Then ") + ".",
  };
}

// ---------------------------------------------------------------- positions
// WHICH STEPS ARE ORDER-ARBITRARY. Choosing three producers to sponsor a bill, or three
// gifts for an embassy, is a SET: any order reaches the same place, so any order must score.
// But choosing WHICH source to buy from, WHICH building to strike, WHICH work to pull down
// is a decision, and order there is meaning. So it depends on the mode, not the command.
function isCommutative(cmd, mode) {
  if (cmd.t === "giftToggle" || cmd.t === "tapToggle" || cmd.t === "bid") return true;
  if (cmd.t === "slot") return mode === "source" || mode === "raidCommit" || mode === "raidDef";
  return false;
}
const CLASS = (cmd, mode) => {
  if (cmd.t === "activate") return "activate";
  if (cmd.t === "verb") return "verb";
  if (cmd.t === "region") return "target";
  if (cmd.t === "slot") return mode === "source" ? "payment" : "target";
  if (cmd.t === "buildType") return "buildType";
  if (isCommutative(cmd, mode)) return "toggle";
  if (["giftSend", "commitTaps", "stand", "launch", "endRaid"].includes(cmd.t)) return "terminal";
  if (["srcStock", "srcStockUnit", "srcToChoose"].includes(cmd.t)) return "payment";
  return "other";
};

// Commutative runs: within a stretch of consecutive toggles of the same type,
// ANY remaining member of the run is an acceptable answer at each position.
function acceptableSets(oracle, menus, modes) {
  const acc = oracle.map((c) => [c]);
  let i = 0;
  while (i < oracle.length) {
    if (!isCommutative(oracle[i], modes[i])) { i++; continue; }
    let j = i;
    while (j + 1 < oracle.length && oracle[j + 1].t === oracle[i].t && isCommutative(oracle[j + 1], modes[j + 1])) j++;
    const run = oracle.slice(i, j + 1);
    for (let k = i; k <= j; k++) {
      const remaining = run.slice(k - i);
      acc[k] = remaining.filter((c) => menus[k].some((m) => key(m) === key(c)));
      if (!acc[k].length) acc[k] = [oracle[k]];
    }
    i = j + 1;
  }
  return acc;
}

// A TRAP is a legal command here that names a target belonging to a LATER action
// of the same directive — the decoy that made the old scribe pick the wrong noun.
function trapsAt(menu, oracleCmd, laterTargets) {
  return menu.filter((c) => c.rid && c.rid !== oracleCmd.rid && laterTargets.includes(c.rid))
    .map((c) => ({ cmd: c, why: `${nm(c.rid)} belongs to a later step` }));
}

// ---------------------------------------------------------------- build a case
function buildCase(id, act, seedInfo) {
  const actions = splitActions(act.seq);
  if (!actions.length) return null;
  const goals = actions.map((a) => { snapshotFrom(a); return goalOf(a); });
  const opened = goals[0].opened || (act.seq[0].cmd.t === "activate" ? { rid: act.seq[0].cmd.rid, kind: act.seq[0].cmd.b } : null);

  // coherence: every action must have a verb we can describe, and no target repeats
  const targets = goals.map((g) => g.target).filter(Boolean);
  if (goals.some((g) => !g.verb)) return null;
  if (new Set(targets).size !== targets.length) return null;
  // A RAID IS NOT AN ORDINARY ACTION. Its assembly is an accumulation — commit these
  // units, lay that basket — which a one-line directive cannot describe, and scoring a
  // candidate against an assembly it was never told about measures nothing. Raids are a
  // contest case, with a basket-shaped directive, and are built separately.
  if (goals.some((g) => g.verb === "raid" || g.verb === "searaid")) return null;

  const oracle = act.seq.map((r) => r.cmd);
  const menus = act.seq.map((r) => r.menu);
  const acc = acceptableSets(oracle, menus, act.seq.map((r) => r.mode));

  // which action each position belongs to, and what targets come later
  const owner = [];
  actions.forEach((a, ai) => a.forEach(() => owner.push(ai)));

  const positions = act.seq.map((r, i) => {
    const later = goals.slice(owner[i] + 1).map((g) => g.target).filter(Boolean);
    return {
      i,
      action: owner[i],
      mode: r.mode,
      seat: r.seat,
      stepClass: CLASS(r.cmd, r.mode),
      menuSize: r.menuSize,
      oracle: r.cmd,
      acceptable: acc[i],
      traps: trapsAt(r.menu, r.cmd, later),
      // a position where every legal command is acceptable is not a decision: the engine
      // left no choice. Scored positions exclude these, or forced steps flatter the average.
      forced: r.menuSize <= 1 || acc[i].length >= r.menuSize,
    };
  });

  return {
    id,
    class: "ordinary",
    scope: actions.length > 1 ? "activation" : "action",
    seat: act.seq[0].seat,
    source: seedInfo,
    opened,
    prefix: act.prefix,
    oracle,
    actions: actions.map((a, ai) => ({
      index: ai,
      order: orderOf(a),          // the structured pivot: extract → expand, or → render
      goal: goals[ai],
      from: owner.indexOf(ai),
      to: owner.lastIndexOf(ai),
      phrase: { ...phrase(goals[ai], null), order: JSON.stringify(orderOf(a)) },
    })),
    // keyed by the power it speaks for. An ordinary activation is one court's business,
    // so there is one entry; a contest passes the desk around and needs one each.
    directives: { [act.seq[0].seat]: {
      ...directive(goals, opened),
      // the whole activation as structured orders, one per action
      order: JSON.stringify(actions.map((a) => orderOf(a))),
    } },
    positions,
    stats: {
      steps: positions.length,
      scored: positions.filter((p) => !p.forced).length,
      actionCount: actions.length,
      trapped: positions.filter((p) => p.traps.length).length,
      byClass: positions.reduce((a, p) => ((a[p.stepClass] = (a[p.stepClass] || 0) + 1), a), {}),
      // how much a case can tell candidates apart: how far a random legal pick falls
      // short of certainty, summed over the positions that are real decisions
      information: +positions.filter((p) => !p.forced)
        .reduce((a, p) => a + (1 - p.acceptable.length / Math.max(1, p.menuSize)), 0).toFixed(3),
    },
  };
}

// ---------------------------------------------------------------- contest cases (scripted)
// Random play reaches raidCommit ~31 times and subvertBid ~17 in 11,773 states,
// so these are set up deliberately rather than searched for.
// A hand-written oracle can go stale the moment a rule changes — a building that
// auto-selects its only verb never offers `verb` at all. So an intended sequence is
// FOLLOWED against the live engine: steps already taken for us are dropped, and
// anything genuinely illegal is reported rather than silently written into the corpus.
function followIntent(g0, intent) {
  let g = clone(g0); const taken = [];
  for (const want of intent) {
    const menu = M.availableCommands(g).filter((c) => !BACKTRACK.has(c.t));
    const hit = menu.find((c) => key(c) === key(want)) || menu.find((c) => c.t === want.t && c.v === want.v && c.rid === want.rid && c.good === want.good && c.pid === want.pid);
    if (!hit) continue;                       // the engine has already done it, or it never applied
    taken.push(hit); g = M.dispatch(clone(g), hit);
  }
  return taken;
}

function contestCases() {
  const out = [];

  // --- a raid on Qadesh: two wild peoples adjacent, one protector ---
  {
    let g = M.initState(); g.turn = "B";
    const home = M.HOME.B, slot = g.b[home].findIndex((x) => x === null);
    const fixtures = [];
    if (slot >= 0) { g.b[home][slot] = { t: "stables", o: "B", tap: false }; fixtures.push({ what: "stables", rid: home, i: slot }); }
    g.rel.M.QAD = { i: 3, s: "friend", strained: false };
    fixtures.push({ what: "rel", who: "M", rid: "QAD", i: 3, s: "friend" });
    for (const p of M.PLAYERS) g.players[p].stock = { food: 4, bronze: 4, cloth: 4, pottery: 4 };
    fixtures.push({ what: "stock", all: { food: 4, bronze: 4, cloth: 4, pottery: 4 } });

    const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === home && g.b[home][c.i] && g.b[home][c.i].t === "stables");
    const oracle = followIntent(g, [act, { t: "verb", v: "raid" }, { t: "region", rid: "QAD" },
      { t: "bid", pid: "SUT", good: "bronze" }, { t: "bid", pid: "SUT", good: "food" }, { t: "launch" }]);
    const positions = [];
    let cur = clone(g);
    for (let i = 0; i < oracle.length; i++) {
      const menu = M.availableCommands(cur).filter((c) => !BACKTRACK.has(c.t));
      positions.push({
        i, action: 0, mode: cur.mode ? cur.mode.v : (cur.act ? "verb-choice" : "activate"),
        seat: M.effectiveSeat(cur), stepClass: CLASS(oracle[i], cur.mode ? cur.mode.v : null),
        menuSize: menu.length, oracle: oracle[i], forced: menu.length <= 1,
        acceptable: oracle[i].t === "bid"
          ? oracle.filter((c, k) => k >= i && c.t === "bid").filter((c) => menu.some((m) => key(m) === key(c)))
          : [oracle[i]],
        traps: (menu.filter((c) => c.t === "bid" && c.pid === "APR")).map((c) => ({ cmd: c, why: "the Apiru were not to be paid" })),
      });
      cur = M.dispatch(clone(cur), oracle[i]);
    }
    out.push({
      id: "contest-raid-01", class: "contest", scope: "action", seat: "B",
      setup: { base: "initState", turn: "B", fixtures },
      prefix: [], oracle,
      basket: { SUT: { bronze: 1, food: 1 }, APR: {} },
      // NAME THE ACTOR. Without it the first decision — which building opens — cannot be
      // answered, and the model reasonably opens whatever the instruction does name.
      directives: {
        B: {
          order: JSON.stringify([{ actor: { rid: M.HOME.B, i: fixtures.find((f) => f.what === "stables").i },
            verb: "raid", target: { rid: "QAD" }, basket: { SUT: { bronze: 1, food: 1 } } }]),
          template: "OPEN the stables at Babylon; RAID Qadesh. Lay 1 bronze and 1 food before the Sutu; nothing for the Apiru. Then launch.",
          prose: "Muster the stables at Babylon and fall on Qadesh. Buy the Sutu with a bronze and a measure of food — the Apiru can keep to their hills. Then launch the raid.",
          loose: "Get the stables at Babylon moving — Qadesh is worth taking. The Sutu will come for a bronze and some grain; leave the Apiru alone. Then go.",
        },
      },
      actions: [{ index: 0, from: 0, to: positions.length - 1,
        order: { actor: { rid: M.HOME.B, i: fixtures.find((f) => f.what === "stables").i },
          verb: "raid", target: { rid: "QAD" }, basket: { SUT: { bronze: 1, food: 1 } } },
        phrase: { template: "RAID Qadesh, buying the Sutu with a bronze and a food",
          prose: "Muster the stables at Babylon and fall on Qadesh, buying the Sutu with a bronze and a measure of food, then launch",
          loose: "Take Qadesh — the Sutu will come for a bronze and some grain",
          order: JSON.stringify({ actor: { rid: M.HOME.B, i: fixtures.find((f) => f.what === "stables").i },
            verb: "raid", target: { rid: "QAD" }, basket: { SUT: { bronze: 1, food: 1 } } }) } }],
      positions,
      stats: { steps: positions.length, actionCount: 1, trapped: positions.filter((p) => p.traps.length).length,
        byClass: positions.reduce((a, p) => ((a[p.stepClass] = (a[p.stepClass] || 0) + 1), a), {}) },
    });
  }

  // --- a subversion at Kizzuwatna: three powers with standing ---
  {
    let g = M.initState(); g.turn = "H";
    const home = M.HOME.H, slot = g.b[home].findIndex((x) => x === null);
    const fixtures = [];
    if (slot >= 0) { g.b[home][slot] = { t: "chancery", o: "H", tap: false }; fixtures.push({ what: "chancery", rid: home, i: slot }); }
    g.rel.H.KIZ = { i: 8, s: "ally", strained: false };
    g.rel.M.KIZ = { i: 5, s: "friend", strained: false };
    g.rel.E.KIZ = { i: 3, s: "friend", strained: false };
    fixtures.push({ what: "rel", who: "H", rid: "KIZ", i: 8, s: "ally" },
                  { what: "rel", who: "M", rid: "KIZ", i: 5, s: "friend" },
                  { what: "rel", who: "E", rid: "KIZ", i: 3, s: "friend" });
    for (const p of M.PLAYERS) g.players[p].stock = { food: 5, bronze: 5, cloth: 5, pottery: 5 };
    fixtures.push({ what: "stock", all: { food: 5, bronze: 5, cloth: 5, pottery: 5 } });

    const act = M.availableCommands(g).find((c) => c.t === "activate" && c.rid === home && g.b[home][c.i] && g.b[home][c.i].t === "chancery");
    const oracle = followIntent(g, [act, { t: "verb", v: "subvert" }, { t: "region", rid: "KIZ" },
      { t: "stand" }, { t: "stand" }, { t: "bid", pid: "KIZ", good: "cloth" }, { t: "bid", pid: "KIZ", good: "bronze" }, { t: "stand" }]);
    const positions = [];
    let cur = clone(g);
    for (let i = 0; i < oracle.length; i++) {
      const menu = M.availableCommands(cur).filter((c) => !BACKTRACK.has(c.t));
      positions.push({
        i, action: 0, mode: cur.mode ? cur.mode.v : (cur.act ? "verb-choice" : "activate"),
        seat: M.effectiveSeat(cur), stepClass: CLASS(oracle[i], cur.mode ? cur.mode.v : null),
        menuSize: menu.length, oracle: oracle[i], forced: menu.length <= 1, acceptable: [oracle[i]], traps: [],
      });
      cur = M.dispatch(clone(cur), oracle[i]);
    }
    out.push({
      id: "contest-subvert-01", class: "contest", scope: "action", seat: "H",
      setup: { base: "initState", turn: "H", fixtures },
      prefix: [], oracle,
      note: "the seat passes round the table: Egypt and Mitanni are heard before Hatti",
      // A SUBVERSION PASSES THE DESK ROUND THE TABLE, poorest standing first, so three
      // courts decide inside one action. Each answers to its OWN plan; handing Hatti's
      // instruction to Egypt is not a hard case, it is the wrong question.
      directives: {
        H: {
          order: JSON.stringify([{ actor: { rid: M.HOME.H, i: fixtures.find((f) => f.what === "chancery").i },
            verb: "subvert", target: { rid: "KIZ" }, basket: { KIZ: { cloth: 1, bronze: 1 } } }]),
          template: "OPEN the chancery at Hattusa; SUBVERT Kizzuwatna. When your turn comes, lay 1 cloth and 1 bronze, then stand.",
          prose: "Open the chancery at Hattusa and call a bidding for the elite of Kizzuwatna. Let the poorer courts speak first; when your turn comes, lay a cloth and a bronze before them, then stand.",
          loose: "Send the chancery at Hattusa to buy the great men of Kizzuwatna. Wait your turn, then put down cloth and bronze — that should cover anything the others manage.",
        },
        E: {
          order: JSON.stringify([{ verb: "subvert", basket: {} }]),
          template: "Kizzuwatna is not worth your goods. Lay nothing; STAND.",
          prose: "You stand lowest in Kizzuwatna and cannot outbid the others. Lay nothing before its elite and stand.",
          loose: "Kizzuwatna is a lost cause for us — keep the goods, say nothing, stand.",
        },
        M: {
          order: JSON.stringify([{ verb: "subvert", basket: {} }]),
          template: "Do not contest Kizzuwatna. Lay nothing; STAND.",
          prose: "Let Hatti spend on Kizzuwatna. Lay nothing before its elite and stand.",
          loose: "Not our fight. Let them pay for it — stand.",
        },
      },
      positions,
      stats: { steps: positions.length, actionCount: 1, trapped: 0,
        byClass: positions.reduce((a, p) => ((a[p.stepClass] = (a[p.stepClass] || 0) + 1), a), {}) },
    });
  }

  return out;
}

// ---------------------------------------------------------------- main
function main(opts) {
  const SEEDS = (opts && opts.seeds) || [12345, 777, 42, 31337, 555, 8888, 60613, 1, 99991, 2024, 314159, 271828];
  const WANT_SHORT = 40, WANT_LONG = 12;
  const short = [], long = [];
  let scanned = 0, rejected = 0;

  const poolShort = [], poolLong = [];
  for (const seed of SEEDS) {
    const log = walk(seed, 12);
    for (const a of activations(log)) {
      scanned++;
      const c = buildCase("tmp", a, { seed, at: a.at });
      if (!c) { rejected++; continue; }
      if (c.stats.steps < 3 || c.stats.steps > 26) { rejected++; continue; }
      if (c.stats.scored < 2) { rejected++; continue; }        // nothing to measure
      (c.stats.actionCount > 1 ? poolLong : poolShort).push(c);
    }
  }
  // keep the cases that can actually tell candidates apart, and spread them across seeds
  const pick = (pool, want) => {
    const bySeed = new Map();
    for (const c of pool.sort((a, b) => b.stats.information - a.stats.information)) {
      const k = c.source.seed; const arr = bySeed.get(k) || []; arr.push(c); bySeed.set(k, arr);
    }
    const out = []; let round = 0;
    while (out.length < want && round < 40) {
      for (const arr of bySeed.values()) { if (arr[round] && out.length < want) out.push(arr[round]); }
      round++;
    }
    return out;
  };
  for (const [i, c] of pick(poolShort, WANT_SHORT).entries()) { c.id = "short-" + String(i + 1).padStart(2, "0"); short.push(c); }
  for (const [i, c] of pick(poolLong, WANT_LONG).entries()) { c.id = "long-" + String(i + 1).padStart(2, "0"); long.push(c); }

  const cases = [...short, ...long, ...contestCases()];
  const allPos = cases.flatMap((c) => c.positions);
  const byClass = allPos.reduce((a, p) => ((a[p.stepClass] = (a[p.stepClass] || 0) + 1), a), {});
  const byMode = allPos.reduce((a, p) => ((a[p.mode] = (a[p.mode] || 0) + 1), a), {});

  // The random-candidate baseline is computable, not guessed: at each position the
  // chance of a legal pick landing in the acceptable set is |acceptable| / |menu|.
  const scored = allPos.filter((p) => !p.forced);
  const base = (set) => (set.length ? set.reduce((a, p) => a + p.acceptable.length / Math.max(1, p.menuSize), 0) / set.length : 0);
  const randomBaseline = base(scored);
  const baselineByClass = {};
  for (const p of scored) (baselineByClass[p.stepClass] = baselineByClass[p.stepClass] || []).push(p);
  for (const k of Object.keys(baselineByClass)) baselineByClass[k] = { n: baselineByClass[k].length, random: +base(baselineByClass[k]).toFixed(3) };

  const corpus = {
    meta: {
      generated: new Date().toISOString(),
      generator: "gen-corpus.js",
      // WHICH ENGINE THIS WAS GENERATED AGAINST. The build-order checks in check-chain.js
      // compare mtimes, which say nothing on a fresh clone — every file shares one timestamp
      // — and nothing at all about content. A reworded chronicle line once left the pack
      // carrying prose the engine no longer produced, and every count still matched.
      engineHash: ENGINE_HASH,
      note: "Teacher-forced: the harness always advances by `oracle`, never by the candidate's pick.",
      seeds: SEEDS,
      registers: ["template", "prose", "loose"],
      counts: { cases: cases.length, short: short.length, long: long.length, contest: cases.length - short.length - long.length, positions: allPos.length },
      positionsByClass: byClass,
      positionsByMode: byMode,
      trappedPositions: allPos.filter((p) => p.traps.length).length,
      scoredPositions: scored.length,
      forcedPositions: allPos.length - scored.length,
      expectedRandomAccuracy: +randomBaseline.toFixed(4),
      baselineByClass,
      scanned, rejected,
    },
    cases,
  };

  return corpus;
}

// ---- the command line: the only part that touches the disk ----
function cli() {
  ENGINE_HASH = require("crypto").createHash("sha256")
    .update(fs.readFileSync(path.join(__dirname, "..", "..", "levant", "engine.js")))
    .digest("hex").slice(0, 16);
  const corpus = main();
  const allPos = corpus.cases.flatMap((c) => c.positions);
  const byClass = corpus.meta.positionsByClass, byMode = corpus.meta.positionsByMode;
  const scored = allPos.filter((p) => !p.forced);
  const short = corpus.cases.filter((c) => c.id.startsWith("short"));
  const long = corpus.cases.filter((c) => c.id.startsWith("long"));
  const baselineByClass = corpus.meta.baselineByClass;
  const randomBaseline = corpus.meta.expectedRandomAccuracy;
  const scanned = corpus.meta.scanned, rejected = corpus.meta.rejected;
  const outPath = path.join(__dirname, "orders-corpus.json");
  fs.writeFileSync(outPath, JSON.stringify(corpus, null, 1));
  console.log("wrote", outPath);
  console.log("  cases      :", corpus.meta.counts.cases, `(${short.length} short, ${long.length} long, ${corpus.meta.counts.contest} contest)`);
  console.log("  positions  :", allPos.length, "· trapped:", corpus.meta.trappedPositions);
  console.log("  by class   :", JSON.stringify(byClass));
  console.log("  by mode    :", JSON.stringify(byMode));
  console.log("  scored     :", scored.length, "· forced (excluded):", allPos.length - scored.length);
  console.log("  random baseline over scored positions:", (100 * randomBaseline).toFixed(1) + "%");
  console.log("  by class   :", Object.entries(baselineByClass).map(([k, v]) => `${k} n=${v.n} rnd=${(100 * v.random).toFixed(0)}%`).join(" · "));
  console.log("  scanned", scanned, "activations, rejected", rejected);
}

cli();

// =====================================================================
// fixtures.cjs — A FIXTURE IS AN AUTHORED SCENARIO, NEVER A POKE.
// =====================================================================
// A suite never writes a field of `g`. It clones the canon world, edits it in the AUTHOR'S
// vocabulary — standings, works, stocks, seating — and seats it through `initState`, whose
// validation then vouches for the fixture the same way it vouches for the shipped game. A
// hand-poked `g` is a state no rule ever produced and no validator ever saw; an authored
// scenario is a legal world by construction.
//
// Reads of `g` in assertions are a separate seam, tolerated until the query door exists —
// see TODO.md "The suites read facts through eleven exported internals, not a door".
const CANON = require("../scenario.cjs").default;
const clone = (o) => JSON.parse(JSON.stringify(o));

// variant(...edits) — a fresh scenario: the canon, with each edit applied in order.
function variant(...edits) {
  const sc = clone(CANON);
  for (const e of edits) e(sc);
  return sc;
}

// seat `p` first. A ROTATION, not a reorder: the circular order of the table is preserved,
// so who follows whom — and therefore play — is unchanged; only who opens moves.
const seatFirst = (p) => (sc) => {
  const i = sc.powers.findIndex((x) => x.id === p);
  sc.powers = [...sc.powers.slice(i), ...sc.powers.slice(0, i)];
};

// standing(p, rid, rung)            — at the rung's floor
// standing(p, rid, rung, influence) — placed exactly
const standing = (p, rid, rung, influence, strained) => (sc) => {
  sc.standings[p] = sc.standings[p] || {};
  sc.standings[p][rid] = influence == null ? rung
    : { rung, influence, ...(strained ? { strained: true } : null) };
};
const noStanding = (p, rid) => (sc) => { if (sc.standings[p]) delete sc.standings[p][rid]; };

const stock = (p, s) => (sc) => { sc.powers.find((x) => x.id === p).stock = clone(s); };
const stocks = (s) => (sc) => { for (const x of sc.powers) x.stock = clone(s); };

// addWork(rid, work) — on the region's first open ground
const addWork = (rid, work) => (sc) => {
  const slot = region(sc, rid).slots.find((s) => !s.work);
  slot.work = clone(work);
};
// setWorks(rid, list) — the region's works, slot by slot: a type string, a full work object,
// or null for cleared ground. Ground (coast, res) is untouched.
const setWorks = (rid, list) => (sc) => {
  region(sc, rid).slots.forEach((s, i) => {
    const w = list[i];
    if (!w) delete s.work;
    else s.work = typeof w === "string" ? { type: w } : clone(w);
  });
};

function region(sc, rid) { return sc.regions.find((r) => r.id === rid); }
const home = (p) => CANON.powers.find((x) => x.id === p).home;
const players = (sc) => (sc || CANON).powers.map((x) => x.id);

// fork(g) — a NEW TIMELINE from this position, so a test may explore several futures from one
// state. The POSITION is deep-copied; the WORLD is shared, because `g.world` is immutable
// after initState (the engine's own law) and copying what nothing may write is pure waste.
// It is a fork of the game, not a clone of the object — states only; forking a command would
// graft a `world` key onto it.
function fork(g) {
  const { world, ...position } = g;
  return { world, ...JSON.parse(JSON.stringify(position)) };
}

module.exports = { CANON, variant, seatFirst, standing, noStanding, stock, stocks, addWork, setWorks, region, home, players, fork };

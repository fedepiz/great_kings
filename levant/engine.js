// =====================================================================
//  THE GREAT KINGS — THE ENGINE
// =====================================================================
//  No React, no JSX, no DOM. Everything here is the game: the rules, the command layer,
//  the chain and the fingerprint, and the Order namespace. The table (levant/app.jsx) and the
//  harness suites both import THIS FILE — there is one core and no copy of it anywhere.
//
//  Every region is a polity. Relations ladder (Friend 2 / Ally 5 / Subject 10) on per-region
//  influence. Actor's-region availability; markets and ports as passive relay; diplomatic
//  reach as a web. Dispositions are stubbed — everyone behaves "Soft". Hot-seat only.
//
//  The engine's export list is at the foot of this file, and it is deliberately short.
//  Read it before adding to it.
//
//  HOUSE STYLE, THE TWO INVARIANTS, AND HOW TO PROVE A CHANGE ARE IN ../CLAUDE.md.
//  Read them before editing this file. The short version: one general path specialised by
//  data, specialisation as a field rather than a branch, no if-chain that grows an arm per
//  case, dispatch total and gated on availableCommands, flat and short. `npm test` must hold
//  at 10/10 differential seeds unless you meant to change the rules.
// =====================================================================

const REG = [
  // --- Greece & the Balkan hinterland ---
  { id: "ISTR", n: "Ister", x: 70, y: 110, f: 0, wild: 1, slots: [{}, {}] },
  { id: "IOL", n: "Iolkos", x: 70, y: 200, f: 1, slots: [{ c: 1 }, { res: "clay" }, {}] },
  { id: "MYC", n: "Mycenae", x: 40, y: 290, f: 1, slots: [{ c: 1 }, { res: "clay" }, {}, {}] },
  // --- Anatolia ---
  { id: "KAS", n: "Kaska", x: 370, y: 20, f: 0, wild: 1, slots: [{}, {}, {}] },
  { id: "WIL", n: "Wilusa", x: 200, y: 110, f: 1, slots: [{ c: 1 }, {}, {}] },
  { id: "HAT", n: "Hattusa", x: 360, y: 110, f: 1, slots: [{}, {}, {}, {}] },
  { id: "ISU", n: "Isuwa", x: 540, y: 110, f: 1, slots: [{ res: "copper" }, {}, {}] },
  { id: "ARZ", n: "Arzawa", x: 200, y: 200, f: 2, slots: [{ c: 1 }, {}, {}] },
  { id: "PLA", n: "Tarhuntassa", x: 360, y: 200, f: 1, slots: [{ res: "copper" }, {}, {}] },
  { id: "MIL", n: "Millawanda", x: 200, y: 290, f: 1, slots: [{ c: 1 }, { res: "clay" }, {}] },
  { id: "LUK", n: "Lukka", x: 320, y: 290, f: 0, wild: 1, sea: 1, slots: [{ c: 1 }, {}] },
  { id: "KIZ", n: "Kizzuwatna", x: 450, y: 290, f: 2, slots: [{ c: 1 }, {}, {}] },
  // --- Upper Mesopotamia ---
  { id: "WAS", n: "Washukanni", x: 700, y: 110, f: 2, slots: [{}, {}, {}, {}] },
  { id: "CAR", n: "Carchemish", x: 600, y: 200, f: 2, slots: [{}, {}, {}] },
  { id: "ASH", n: "Ashur", x: 740, y: 200, f: 2, slots: [{}, {}, {}] },
  { id: "HAL", n: "Halab", x: 600, y: 290, f: 2, slots: [{ res: "cloth" }, {}, {}] },
  { id: "MAR", n: "Mari", x: 750, y: 290, f: 1, slots: [{}, {}, {}] },
  // --- islands in the water ---
  { id: "KNO", n: "Knossos", x: 80, y: 400, f: 1, slots: [{ c: 1 }, { res: "clay" }, {}] },
  { id: "ALA", n: "Alashiya", x: 290, y: 380, f: 1, slots: [{ res: "copper" }, { c: 1 }, { res: "copper" }] },
  { id: "SHK", n: "Sherden", x: 90, y: 550, f: 0, wild: 1, sea: 1, slots: [{ c: 1 }, { c: 1 }] },
  // --- the Levant: coast road, inland road, desert ---
  { id: "UGA", n: "Ugarit", x: 450, y: 380, f: 1, slots: [{ c: 1 }, { res: "cloth" }, {}] },
  { id: "AMU", n: "Amurru", x: 610, y: 380, f: 2, slots: [{}, {}, {}] },
  { id: "SUT", n: "Sutu", x: 750, y: 380, f: 0, wild: 1, slots: [{}, {}] },
  { id: "BYB", n: "Byblos", x: 450, y: 470, f: 1, slots: [{ c: 1 }, { res: "cloth" }, {}] },
  { id: "QAD", n: "Qadesh", x: 610, y: 470, f: 2, slots: [{}, {}, {}] },
  { id: "BAB", n: "Babylon", x: 740, y: 470, f: 3, slots: [{}, {}, {}, {}] },
  { id: "CAN", n: "Canaan", x: 440, y: 590, f: 2, slots: [{ c: 1 }, {}, { res: "cloth" }, {}] },
  { id: "APR", n: "Apiru", x: 610, y: 560, f: 0, wild: 1, slots: [{}, {}] },
  { id: "NIP", n: "Nippur", x: 740, y: 560, f: 3, slots: [{}, {}, {}, { res: "clay" }] },
  { id: "DER", n: "Der", x: 900, y: 560, f: 1, slots: [{}, {}] },
  { id: "SIN", n: "Sinai", x: 475, y: 680, f: 0, slots: [{ res: "copper" }, {}] },
  { id: "SHA", n: "Shasu", x: 610, y: 650, f: 0, wild: 1, slots: [{}, {}] },
  // --- Egypt ---
  { id: "LIB", n: "Libu", x: 90, y: 700, f: 0, wild: 1, slots: [{}, {}] },
  { id: "LEG", n: "Lower Egypt", x: 260, y: 700, f: 3, slots: [{ c: 1 }, { c: 1 }, {}, {}, {}] },
  { id: "MEG", n: "Middle Egypt", x: 230, y: 800, f: 3, slots: [{}, {}, {}] },
  { id: "UEG", n: "Upper Egypt", x: 360, y: 800, f: 2, slots: [{}, {}, {}] },
];
const R = Object.fromEntries(REG.map((r) => [r.id, r]));
const NB = [
  // Greece
  ["ISTR", "IOL"], ["IOL", "MYC"],
  // Anatolia
  ["KAS", "HAT"], ["KAS", "ISU"], ["HAT", "ISU"], ["HAT", "PLA"],
  ["WIL", "ARZ"], ["ARZ", "MIL"], ["ARZ", "PLA"], ["MIL", "LUK"], ["LUK", "PLA"], ["PLA", "KIZ"],
  // Upper Mesopotamia & the desert caravan
  ["ISU", "WAS"], ["WAS", "CAR"], ["WAS", "ASH"], ["CAR", "HAL"], ["ASH", "MAR"], ["MAR", "SUT"], ["SUT", "QAD"],
  // the Levant: coast road, inland road
  ["KIZ", "UGA"], ["KIZ", "HAL"], ["HAL", "AMU"], ["UGA", "AMU"], ["UGA", "BYB"],
  ["AMU", "QAD"], ["QAD", "APR"], ["APR", "BYB"], ["APR", "SHA"], ["APR", "NIP"], ["BYB", "CAN"],
  ["CAN", "SIN"], ["SHA", "SIN"],
  // Mesopotamia
  ["QAD", "BAB"], ["BAB", "NIP"], ["BAB", "DER"],
  // Egypt
  ["CAN", "LEG"], ["SIN", "LEG"], ["LEG", "MEG"], ["MEG", "UEG"], ["LIB", "LEG"],
];
const ADJ = {};
NB.forEach(([a, b]) => { (ADJ[a] = ADJ[a] || []).push(b); (ADJ[b] = ADJ[b] || []).push(a); });
function rdist(a, b) {
  if (a === b) return 0;
  const seen = { [a]: 0 }; const q = [a];
  while (q.length) {
    const x = q.shift();
    for (const y of ADJ[x] || []) if (!(y in seen)) { seen[y] = seen[x] + 1; if (y === b) return seen[y]; q.push(y); }
  }
  return 99;
}
const isCoastal = (rid) => R[rid].slots.some((s) => s.c);
const COASTAL = REG.filter((r) => isCoastal(r.id)).map((r) => r.id);

const PLAYERS = ["Y", "H", "M", "B", "E"]; // turn order, west to east
const HOME = { E: "LEG", H: "HAT", M: "WAS", B: "BAB", Y: "MYC" };
const PCOL = { E: "#C9A227", H: "#8C4A2F", M: "#6B4A8C", B: "#177268", Y: "#B01E3C" };
const PNAME = { E: "Egypt", H: "Hatti", M: "Mitanni", B: "Babylon", Y: "Mycenae" };
const live = (g) => PLAYERS.filter((q) => !g.out[q]);
function nextPlayer(g, from) {
  const i = PLAYERS.indexOf(from);
  for (let k = 1; k <= PLAYERS.length; k++) {
    const q = PLAYERS[(i + k) % PLAYERS.length];
    if (!g.out[q]) {
      // TODO: vestigial fields — counts the rounds within a year, maintained here and reset at
      // finishUpkeep, but nothing reads it.
      if (PLAYERS.indexOf(q) <= i) g.rot = (g.rot || 1) + 1;
      return q;
    }
  }
  return from;
}
function others(g, p) { return live(g).filter((q) => q !== p); }
const GOODS = ["food", "bronze", "cloth", "pottery"];
const RANK = { none: 0, friend: 1, ally: 2, subject: 3 };
const FLOOR = { none: 0, friend: 2, ally: 5, subject: 10 };
const SLETTER = { none: "", friend: "F", ally: "A", subject: "S" };

// The building table: every stat the engine reads lives HERE, not in scattered logic.
// Absent means "no" — the engine reads fields, it never switches on building type.
//   name       — the words the chronicle uses. NOT a display glyph; that is the table's.
//   yields     — a producer's good. The amount is the region's farm yield when `byRegion`
//                is set (farms alone), otherwise 1.
//   issues     — tapping draws 1 of this good from the stockpile into the local channel
//   unit       — { reach, sea }: may join battles at overland reach; sea-capable embarks via ports
//   walls      — untapped, adds this to its own region's defense without joining
//   capBonus   — adds to the Food Store of whoever commands the province it stands in
//   trades     — "land" (range 3 overland) or "sea" (far harbours)
//   annex      — an organ of state: belongs to a crown, eats 1 food, seats a government
const BT = {
  palace: { name: "Royal palace" },
  farm: { name: "Farm", yields: "food", byRegion: true },
  market: { name: "Market", trades: "land" },
  port: { name: "Port", trades: "sea" },
  garrison: { name: "Garrison", unit: { reach: 1, sea: false } },
  granary: { name: "Granary", capBonus: 2, issues: "food" },
  wsB: { name: "Bronze works", yields: "bronze" },
  wsC: { name: "Dye works", yields: "cloth" },
  wsP: { name: "Potteries", yields: "pottery" },
  chancery: { name: "Chancery", annex: 1 },
  stables: { name: "Stables", annex: 1, unit: { reach: 3, sea: false } },
  steward: { name: "Steward", annex: 1 },
  fortress: { name: "Fortress", annex: 1, walls: 1 },
  warrior: { name: "Warriors", annex: 1, unit: { reach: 2, sea: true } },
};


function initState() {
  const rel = {};
  const homes = PLAYERS.map((q) => HOME[q]);
  for (const q of PLAYERS) {
    rel[q] = {};
    for (const r of REG) if (!homes.includes(r.id)) rel[q][r.id] = { i: 0, s: "none" };
  }
  const sub = (q, rid) => (rel[q][rid] = { i: 10, s: "subject" });
  const frd = (q, rid) => (rel[q][rid] = { i: 2, s: "friend" });
  sub("E", "MEG"); sub("E", "UEG"); frd("E", "BYB");
  sub("H", "ISU"); sub("H", "PLA"); sub("H", "KIZ"); frd("H", "UGA");
  sub("M", "HAL"); sub("M", "CAR"); frd("M", "ASH");
  sub("B", "NIP"); sub("B", "DER"); frd("B", "MAR");
  sub("Y", "KNO"); sub("Y", "IOL"); frd("Y", "MIL");
  const band = (rid, n) => Array.from({ length: n }, () => ({ t: "warrior", o: rid }));
  const pad = (rid, arr) => { const out = arr.slice(); while (out.length < R[rid].slots.length) out.push(null); return out; };
  const B = {
    // wild peoples
    ISTR: band("ISTR", 2), KAS: band("KAS", 3), LUK: band("LUK", 2), SUT: band("SUT", 2),
    APR: band("APR", 2), SHA: band("SHA", 2), LIB: band("LIB", 2), SHK: band("SHK", 2),
    // Mycenae
    MYC: [{ t: "port", o: "MYC" }, { t: "wsP", o: "MYC" }, { t: "palace", o: "Y" }, { t: "farm", o: "MYC" }],
    KNO: [{ t: "port", o: "KNO" }, { t: "wsP", o: "KNO" }, null],
    IOL: [{ t: "port", o: "IOL" }, null, { t: "farm", o: "IOL" }],
    // Hatti
    HAT: [{ t: "palace", o: "H" }, { t: "farm", o: "HAT" }, { t: "garrison", o: "HAT" }, null],
    ISU: [{ t: "wsB", o: "ISU" }, null, null],
    PLA: [{ t: "wsB", o: "PLA" }, { t: "farm", o: "PLA" }, { t: "market", o: "PLA" }],
    KIZ: [{ t: "port", o: "KIZ" }, { t: "farm", o: "KIZ" }, null],
    // Mitanni
    WAS: [{ t: "palace", o: "M" }, { t: "farm", o: "WAS" }, { t: "garrison", o: "WAS" }, null],
    HAL: [{ t: "wsC", o: "HAL" }, { t: "farm", o: "HAL" }, { t: "market", o: "HAL" }],
    CAR: [{ t: "farm", o: "CAR" }, { t: "market", o: "CAR" }, null],
    // Babylon
    BAB: [{ t: "palace", o: "B" }, { t: "farm", o: "BAB" }, { t: "market", o: "BAB" }, null],
    NIP: [{ t: "farm", o: "NIP" }, { t: "granary", o: "NIP" }, null, { t: "wsP", o: "NIP" }],
    DER: [{ t: "farm", o: "DER" }, null],
    // Egypt
    LEG: [{ t: "port", o: "LEG" }, null, { t: "palace", o: "E" }, { t: "farm", o: "LEG" }, null],
    MEG: [{ t: "farm", o: "MEG" }, { t: "granary", o: "MEG" }, null],
    UEG: [{ t: "farm", o: "UEG" }, { t: "market", o: "UEG" }, null],
    // independents
    ALA: [{ t: "wsB", o: "ALA" }, { t: "port", o: "ALA" }, { t: "wsB", o: "ALA" }],
    UGA: [{ t: "port", o: "UGA" }, { t: "wsC", o: "UGA" }, { t: "farm", o: "UGA" }],
    BYB: [{ t: "port", o: "BYB" }, { t: "wsC", o: "BYB" }, { t: "farm", o: "BYB" }],
    AMU: [{ t: "garrison", o: "AMU" }, null, null],
    QAD: [{ t: "garrison", o: "QAD" }, { t: "farm", o: "QAD" }],
    CAN: [{ t: "garrison", o: "CAN" }, { t: "farm", o: "CAN" }, null, null],
    ASH: [{ t: "garrison", o: "ASH" }, { t: "farm", o: "ASH" }, null],
    MAR: [{ t: "market", o: "MAR" }, { t: "farm", o: "MAR" }],
    ARZ: [{ t: "garrison", o: "ARZ" }, { t: "farm", o: "ARZ" }, null],
    WIL: [{ t: "port", o: "WIL" }, { t: "garrison", o: "WIL" }],
    MIL: [{ t: "port", o: "MIL" }, null, { t: "market", o: "MIL" }],
    SIN: [null, null],
  };
  const b = {};
  for (const r of REG) b[r.id] = pad(r.id, B[r.id] || []);
  const players = {}, passed = {}, out = {}, spent = {};
  for (const q of PLAYERS) {
    players[q] = { stock: { food: 2, bronze: 0, cloth: 0, pottery: 0 } };
    passed[q] = false; out[q] = false; spent[q] = {};
  }
  players.H.stock.bronze = 1;
  players.Y.stock.pottery = 1;
  players.M.stock.cloth = 1;
  return {
    round: 1,
    turn: PLAYERS[0],
    passed, out, rel, b, players, spent,
    act: null, mode: null, shortfall: null,
    chain: "00000000",                     // running hash of the command stream: see THE CHAIN
    step: 0,                               // interaction-step counter: see THE STEP
    rot: 1,
    log: [`Year 1. ${PNAME[PLAYERS[0]]} to act. (Everyone's disposition is Soft for now.)`],
  };
}

// ---- relation helpers ----
function rank(g, p, rid) {
  if (rid === HOME[p]) return 4;
  const rr = g.rel[p][rid];
  return rr ? RANK[rr.s] : 0;
}
function infOf(g, p, rid) { return g.rel[p]?.[rid]?.i ?? 0; }
// THE FOREMOST — whoever stands highest in a province at this instant, ties included. War
// falls on the most invested: the launch tests them, and every work torn down shames them.
// Recomputed at each blow, so a raid's damage walks down the ladder as leaders are brought low.
function foremostIn(g, rid, except) {
  const cand = live(g).filter((q) => q !== except);
  const best = cand.reduce((a, q) => Math.max(a, infOf(g, q, rid)), 0);
  return best > 0 ? cand.filter((q) => infOf(g, q, rid) === best) : [];
}
// WHOSE IS IT? Only the royal palace and the five seat buildings belong to a crown. Every
// other work on the map — farms, workshops, markets, ports, granaries, garrisons — belongs to
// the region it stands in, whoever paid to raise it, and serves whichever power the province
// serves. So a building is at your command if it is your own organ of state, or if it stands
// on ground inside your writ.
//
// THE `bd.o` OVERLOAD, stated once here because everything downstream depends on it. That one
// field holds two kinds of thing: a POWER LETTER for a crown building, and the REGION'S OWN ID
// for everything else — every province work, and every wild people's warband. The test below
// leans on it: a region id can never equal a power letter, so `bd.o === p` can never hand a
// king command of a warband. It is load-bearing in here and it MUST NOT LEAVE — anything
// outside the engine reading `bd.o` would be decoding a sentinel by knowing that two
// namespaces happen not to collide. `view` converts it to a king or null.
function usable(g, p, rid, bd) {
  if (!bd) return false;
  if (isCrown(bd)) return bd.o === p;
  return rid === HOME[p] || rank(g, p, rid) >= 3;
}
const readyB = (bd) => bd && !bd.tap;
// hasBuilding asks whether one is STANDING THERE AT ALL, not whether it has acted — a tapped
// port still relays, which is what makes markets and ports a passive web rather than an action.
function hasBuilding(g, rid, t) { return (g.b[rid] || []).some((bd) => bd && bd.t === t); }

// ---- logistics ----
// GOODS HAVE NO GEOGRAPHY; ACTIONS DO. The treasury is the king's abstract purse — it pays
// anywhere and receives from anywhere. What is geometric is what you can see: action ranges,
// and the covering tap, which must lie within the acting building's own reach.
//
// REACH — one walk for every question of "how far from here?", for goods, armies and envoys
// alike. It crosses only ground you hold at Friend+ (the origin always counts), stops at
// `maxd` steps, and takes ship only when asked to: a coastal region with an active port
// reaches every coast in a single step. The two flags ARE the difference between an army's
// road and an envoy's route — cargo and soldiers walk, letters sail. Keeping them as
// arguments makes that a statement rather than an accident.
function reach(g, p, start, maxd, opts) {
  const bySea = !!(opts && opts.bySea), withStart = !!(opts && opts.withStart);
  const seen = { [start]: 0 }; const q = [start];
  while (q.length) {
    const x = q.shift();
    if (seen[x] >= maxd) continue;
    if (!(x === start || rank(g, p, x) >= 1)) continue;
    const nbs = [...(ADJ[x] || [])];
    if (bySea && isCoastal(x) && hasBuilding(g, x, "port")) for (const y of COASTAL) if (y !== x) nbs.push(y);
    for (const y of nbs) if (!(y in seen)) { seen[y] = seen[x] + 1; q.push(y); }
  }
  const out = new Set(Object.keys(seen));
  if (!withStart) out.delete(start);
  return out;
}
// the two named routes over that walk: overland here, diploReach (bySea) further down
function overland(g, p, start, maxd) { return reach(g, p, start, maxd, { withStart: true }); }
// A port carries ONE thing across the water per tap: one cargo, or one warrior.
function portIn(g, rid) { return (g.b[rid] || []).findIndex((bd) => bd && bd.t === "port" && readyB(bd)); }
function overseasPorts(g, exceptRid) {
  return REG.filter((r) => r.id !== exceptRid && isCoastal(r.id) && hasBuilding(g, r.id, "port")).map((r) => r.id);
}
// ============================ THE ACTIONS TABLE ============================
// Every verb declares its range and its cost HERE. Ranges are per-actor; costs are specs
// interpreted by ONE sourcing pipeline (stockpile OR one-region taps — the standard routine).
// Adding a cost to an action, or changing a range, is an edit to this table and nothing else.
const ACTIONS = {
  build: {
    range: () => 1, seatRange: () => Infinity,
    cost: { pay: "fixed", need: { food: 1 } },
    // ordinary works go up within a step of the actor on Friend+ ground; an organ of state
    // may be seated anywhere inside your own writ, but only by the king's own hand
    targets: (g, p, m, out) => {
      if (m.region) return out;                       // the region is chosen; the type comes next
      const bR = overland(g, p, g.act.palace, ACTIONS.build.range(g, g.act));
      const seatAnywhere = ACTIONS.build.seatRange(g, g.act) === Infinity && !g.act.steward;
      for (const r of REG) {
        if (r.wild) continue;                          // the hills accept no foreign stones
        if (!g.b[r.id].some((s) => s === null)) continue;
        if (!canFeedBuild(g, p, r.id)) continue;
        const ordinary = bR.has(r.id) && rank(g, p, r.id) >= 1;
        const seat = seatAnywhere && (rank(g, p, r.id) >= 3 || r.id === HOME[p]);
        if (ordinary || seat) out.regions.add(r.id);
      }
      return out;
    },
    commit: (g, p, rid) => { g.mode = { v: "build", region: rid }; },
  },
  tax: {
    range: (g, act) => (act.steward || act.palace === HOME[g.turn] ? 1 : 0),
    cost: null,
    // one province of your own writ, within the levy's short reach
    targets: (g, p, m, out) => {
      const range = ACTIONS.tax.range(g, g.act);
      for (const rid of Object.keys(g.b))
        if (rdist(g.act.palace, rid) <= range
            && g.b[rid].some((bd, i) => readyB(bd) && usable(g, p, rid, bd) && yieldOf(g, rid, i)))
          out.regions.add(rid);
      return out;
    },
    // the levy sweeps every untapped producer there at once
    commit: (g, p, rid) => {
      const takes = works(g, (bd, r, i) => r === rid && readyB(bd) && usable(g, p, r, bd) && yieldOf(g, r, i))
        .map((e) => { g.b[e[0]][e[1]].tap = true; return yieldOf(g, e[0], e[1]); });
      g.log.unshift(`${PNAME[p]} sends the levy through ${R[rid].n}: every untapped producer is swept.`);
      for (const y of takes) gain(g, p, y.good, y.n, `levy of ${R[rid].n}`);
      spend(g);
    },
  },
  entreat: {
    range: (g, act) => (act.chancery ? 2 : 3), cost: { pay: "gifts" }, oncePerYear: true,
    // any province in diplomatic reach not yet courted this year, if you have anything to give
    targets: (g, p, m, out) => {
      const stockAny = GOODS.some((tt) => g.players[p].stock[tt] > 0);
      const prodAny = GOODS.some((tt) => producersOf(g, p, g.act.palace, tt).length > 0);
      if (!stockAny && !prodAny) return out;
      for (const rid of diploReach(g, p, g.act.palace, ACTIONS.entreat.range(g, g.act)))
        if (g.rel[p][rid] && !usedOn(g, p, "entreat", rid)) out.regions.add(rid);
      return out;
    },
    commit: (g, p, rid) => {
      g.mode = { v: "source", kind: "entreat", region: rid, actor: g.act.palace, phase: "choose", gifts: [], paid: [] };
    },
  },
  treaty: {
    range: () => 3, cost: null,
    // the climb: the floor met, and no incumbent standing higher
    targets: (g, p, m, out) => {
      for (const rid of diploReach(g, p, g.act.palace, ACTIONS.treaty.range(g, g.act))) {
        const rr = g.rel[p][rid]; if (!rr) continue;
        const higher = (min) => others(g, p)
          .filter((q) => RANK[g.rel[q][rid].s] >= min)
          .sort((a, b) => infOf(g, b, rid) - infOf(g, a, rid))[0];
        if (rr.s === "friend" && rr.i >= FLOOR.ally) {
          const inc = higher(2);
          if (!inc || rr.i > infOf(g, inc, rid)) out.regions.add(rid);
        }
        if (rr.s === "ally" && !R[rid].wild && rr.i >= FLOOR.subject) {
          const inc = others(g, p).filter((q) => g.rel[q][rid].s === "subject")
            .sort((a, b) => infOf(g, b, rid) - infOf(g, a, rid))[0];
          if (!inc || rr.i > infOf(g, inc, rid)) out.regions.add(rid);
        }
      }
      return out;
    },
    commit: (g, p, rid) => {
      const rr = g.rel[p][rid];
      if (rr.s === "friend") {
        for (const q of others(g, p)) if (RANK[g.rel[q][rid].s] >= 2) {
          g.log.unshift(`${PNAME[q]}'s standing in ${R[rid].n} collapses to Friend.`); setStatus(g, q, rid, "friend");
        }
        setStatus(g, p, rid, "ally");
        g.log.unshift(`${PNAME[p]} and ${R[rid].n} swear alliance. The roads open.`);
      } else if (rr.s === "ally") {
        if (R[rid].wild) { g.log.unshift(`The ${R[rid].n} bow to no one — the wild folk ally, never submit.`); return; }
        for (const q of others(g, p)) if (g.rel[q][rid].s === "subject") {
          g.log.unshift(`${PNAME[q]} loses its subject!`); setStatus(g, q, rid, "friend");
        }
        setStatus(g, p, rid, "subject");
        g.log.unshift(`${R[rid].n} bows to ${PNAME[p]} as subject.`);
      }
      spend(g);
    },
  },
  subvert: {
    range: (g, act) => (act.chancery ? 2 : 3), cost: null, oncePerYear: true,
    // somewhere you already stand, where somebody else has something to lose
    targets: (g, p, m, out) => {
      for (const rid of diploReach(g, p, g.act.palace, ACTIONS.subvert.range(g, g.act))) {
        if (!g.rel[p][rid]) continue;
        if (infOf(g, p, rid) >= 2 && !usedOn(g, p, "subvert", rid)
            && live(g).some((q) => q !== p && infOf(g, q, rid) > 0)) out.regions.add(rid);
      }
      return out;
    },
    // the command buys the opportunity, not the outcome
    commit: (g, p, rid) => {
      const order = live(g).filter((q) => infOf(g, q, rid) > 0)
        .sort((a, b) => (infOf(g, a, rid) - infOf(g, b, rid)) || (PLAYERS.indexOf(a) - PLAYERS.indexOf(b)));
      const party = {}; for (const q of order) party[q] = q;
      contestOpen(g, "subvert", rid, order, party, [rid], { opener: p, binding: true });
      markUsed(g, p, "subvert", rid);
      g.mode = { v: "subvertBid" };
      g.log.unshift(`${PNAME[p]} opens a bidding for the elite of ${R[rid].n}: ${order.map((q) => `${PNAME[q]} (${infOf(g, q, rid)})`).join(", then ")}. Poorest standing bids first.`);
    },
  },
  trade: {
    range: () => 3, cost: { pay: "match" }, // match: m.need goods, none of m.extracted
    // a market reaches overland; a port reaches quay to quay. Either way the SOURCE is a slot,
    // not a region, so this fills `slots` where the other verbs fill `regions`.
    targets: (g, p, m, out) => {
      if (m.src) return out;
      const reach = new Set();
      if (g.act.port) { for (const far of overseasPorts(g, g.act.port[0])) if (rank(g, p, far) >= 1) reach.add(far); }
      else for (const rid of overland(g, p, g.act.market[0], ACTIONS.trade.range(g, g.act))) reach.add(rid);
      for (const rid of reach) {
        if (!(rid in g.b)) continue;
        g.b[rid].forEach((bd, i) => {
          const y = yieldOf(g, rid, i);
          if (!readyB(bd) || !y) return;
          if (g.act.market && rid === g.act.market[0] && i === g.act.market[1]) return;
          if (!(usable(g, p, rid, bd) || rank(g, p, rid) >= 1)) return;
          if (tradeAfford(g, p, tradeSeat(g), y)) out.slots.add(rid + ":" + i);
        });
      }
      return out;
    },
  },
  raid: {
    range: () => 3, cost: null,
    // any ground holding something not yours, that your ready forces can actually reach
    targets: (g, p, m, out) => {
      const mode = m.v === "searaid" ? "sea" : "land";
      for (const r of REG) {
        if (!g.b[r.id].some((bd) => bd && !usable(g, p, r.id, bd))) continue;
        if (eligibleAttackers(g, p, r.id, mode).length) out.regions.add(r.id);
      }
      return out;
    },
    // the raid opens its contest; the assembly is refundable until the launch
    commit: (g, p, rid, m) => {
      const mode = m.v === "searaid" ? "sea" : "land";
      g.raid = { t: rid, atk: [], defC: [], mode };
      contestOpen(g, "raid", rid, [p], { [p]: "atk" }, biddablePeoples(g).map((x) => x.pid), { opener: p, binding: false });
      for (const u of eligibleAttackers(g, p, rid, mode)) if (u.fixed && (mode !== "sea" || u.port >= 0)) commitUnit(g, "atk", u, null);
      g.mode = { v: "raidCommit" };
      g.log.unshift(`${PNAME[p]} plans a raid on ${R[rid].n} — commit forces (click units), then launch.`);
    },
  },
};
ACTIONS.searaid = ACTIONS.raid;   // one verb, two elements — the mode is read from m.v
ACTIONS.remove = {
  range: () => 1, cost: null,
  // pull down a work within your own writ — anything but the palace itself
  targets: (g, p, m, out) => {
    for (const e of works(g, (bd, rid) => bd.t !== "palace" && usable(g, p, rid, bd)
        && (rank(g, p, rid) >= 3 || rid === HOME[p])))
      out.slots.add(e[0] + ":" + e[1]);
    return out;
  },
};
// What a set of selected taps delivers. A producer gives its yield; a granary ISSUES,
// drawing one good from the stores into the local channel. This is a RULE, not a display
// calculation: `availableCommands` reads it to decide whether the bill is covered, so an
// interface that worked the same sum out for itself would be a second, ungated answer.
function tapYields(g, m) {
  const out = { food: 0, bronze: 0, cloth: 0, pottery: 0 };
  for (const [rid, i] of (m.taps || [])) {
    const bd = g.b[rid] && g.b[rid][i];
    if (!bd) continue;
    const y = yieldOf(g, rid, i) || (BT[bd.t].issues ? { good: BT[bd.t].issues, n: 1 } : null);
    if (y) out[y.good] += y.n;
  }
  return out;
}

// ---- cost-spec interpreters: the ONLY code that knows what a cost means ----
function costStockCovers(spec, m, st) {
  if (spec.pay === "fixed") return GOODS.every((t) => st[t] >= (spec.need[t] || 0));
  if (spec.pay === "match") { let sum = 0; for (const t of GOODS) if (t !== m.extracted) sum += st[t]; return sum >= m.need; }
  return GOODS.some((t) => st[t] > 0); // gifts
}
function costTapDead(spec, m, y) {
  if (spec.pay === "fixed") return !(spec.need[y.good] > 0);
  if (spec.pay === "match") return y.good === m.extracted;
  return false;
}
function costTapCovered(spec, m, yields) {
  if (spec.pay === "fixed") return GOODS.every((t) => yields[t] >= (spec.need[t] || 0));
  if (spec.pay === "match") { let sum = 0; for (const t of GOODS) if (t !== m.extracted) sum += yields[t]; return sum >= m.need; }
  return GOODS.some((t) => yields[t] > 0);
}
function costTakePaid(spec, m, yields) {
  const paid = [];
  if (spec.pay === "fixed") {
    for (const t of GOODS) for (let k = 0; k < (spec.need[t] || 0); k++) { paid.push(t); yields[t]--; }
  } else if (spec.pay === "match") {
    let need = m.need;
    for (const t of GOODS) { if (t === m.extracted) continue; const use = Math.min(need, yields[t]); need -= use; yields[t] -= use; for (let k = 0; k < use; k++) paid.push(t); }
  } else {
    for (const t of GOODS) if (yields[t] > 0) { paid.push(t); yields[t]--; } // one gift per distinct good
  }
  return paid;
}
// WHAT IS STILL OWED, in goods. costTapCovered answers yes or no; a player wants the
// difference, and only the cost interpreters know what a cost means.
function costShortfall(spec, m, yields) {
  if (spec.pay === "fixed")
    return GOODS.filter((t) => yields[t] < (spec.need[t] || 0))
      .map((t) => `${(spec.need[t] || 0) - yields[t]} ${t}`);
  if (spec.pay === "match") {
    let sum = 0; for (const t of GOODS) if (t !== m.extracted) sum += yields[t];
    return sum >= m.need ? [] : [`${m.need - sum} good${m.need - sum > 1 ? "s" : ""} other than ${m.extracted}`];
  }
  return GOODS.some((t) => yields[t] > 0) ? [] : ["something to carry"];
}

function costStockPayFixed(g, p, spec) {
  for (const t of GOODS) for (let k = 0; k < (spec.need[t] || 0); k++) g.players[p].stock[t]--;
}
function costCaption(spec, m) {
  if (spec.pay === "fixed") return GOODS.filter((t) => spec.need[t]).map((t) => `${spec.need[t]} ${t}`).join(", ");
  if (spec.pay === "match") return `${m.need} good${m.need > 1 ? "s" : ""}, any ≠ ${m.extracted}`;
  return "gifts for the embassy";
}
const specOf = (m) => ACTIONS[m.kind === "build" ? "build" : m.kind].cost;
// ===========================================================================
// SOURCING — every cost is paid one of two ways: wholly from the stockpile, or by TAPS FROM
// ONE REGION. The tappable regions are the actor's own and those adjacent to it, and only
// where your writ runs (home or Subject). A single province sponsors the action; tap as many
// of its producers as the bill takes. No mixing purse and taps in one action.
function tapRegionsOf(g, p, actorRid) {
  return [actorRid, ...(ADJ[actorRid] || [])].filter((rid) => rid === HOME[p] || rank(g, p, rid) >= 3);
}
function tapProducers(g, p, rid) {
  const out = [];
  (g.b[rid] || []).forEach((bd, i) => {
    if (!readyB(bd) || !usable(g, p, rid, bd)) return;
    const y = yieldOf(g, rid, i);
    if (y) out.push([rid, i, y]);
    // a granary ISSUES: tap it to draw 1 food from the stockpile into the local channel
    else if (BT[bd.t].issues && g.players[p].stock[BT[bd.t].issues] > 0) out.push([rid, i, { good: BT[bd.t].issues, n: 1, issue: true }]);
  });
  return out;
}
function producersOf(g, p, actorRid, good) {
  const out = [];
  for (const rid of tapRegionsOf(g, p, actorRid))
    for (const [r2, i, y] of tapProducers(g, p, rid)) if (y.good === good) out.push([r2, i, y]);
  return out;
}
function tradeSeat(g) { return (g.act.market || g.act.port)[0]; }
function regionTapSum(g, p, rid, exclude) {
  return tapProducers(g, p, rid).reduce((a, [, , y]) => a + (y.good === exclude ? 0 : y.n), 0);
}
function tradeAfford(g, p, marketRid, y) {
  let stockSumEligible = 0;
  for (const t of GOODS) if (t !== y.good) stockSumEligible += g.players[p].stock[t];
  if (stockSumEligible >= y.n) return true;
  return tapRegionsOf(g, p, marketRid).some((rid) => regionTapSum(g, p, rid, y.good) >= y.n);
}
// ---- diplomacy: reach of envoys ----
function diploReach(g, p, palR, range) { return reach(g, p, palR, range, { bySea: true }); }

function yieldOf(g, rid, i) {
  const bd = g.b[rid][i];
  if (!bd || !BT[bd.t].yields) return null;
  // TODO: vestigial fields — nothing ever writes `bd.capGoods`, so this branch is always 1.
  // Left in place because deleting it moves the fingerprint and wants its own commit. Do not
  // build on it: a per-building yield needs a rule, not just a field.
  return { good: BT[bd.t].yields, n: BT[bd.t].byRegion ? R[rid].f : bd.capGoods || 1 };
}
// WHAT WINTER TAKES — the food above the store that will spoil, reckoned AFTER the year's
// upkeep is paid. A rule, not a forecast for a panel: the interface reports this number, it
// does not compute it, or it would drift the first time the reckoning changed.
function foodRots(g, p) {
  const have = g.players[p].stock.food;
  const due = upkeepDue(g, p).food;
  const keep = foodStore(g, p);
  return Math.max(0, Math.min(have, have - due) - keep);
}

// THE FOOD STORE — what survives the turning of the year. Grain does not keep: the palace
// holds 1, and every granary at your command holds 2 more. Everything above it spoils at the
// reckoning. Bronze, cloth and pottery keep without limit, and nothing is capped during the year.
function foodStore(g, p) {
  const palaces = works(g, (bd) => bd.t === "palace" && bd.o === p).length;
  const granaries = works(g, (bd, rid) => BT[bd.t].capBonus && usable(g, p, rid, bd));
  return palaces + granaries.reduce((a, e) => a + BT[e[2].t].capBonus, 0);
}
function gain(g, p, good, n, why) {
  let shelved = 0, queued = 0;
  g.players[p].stock[good] += n; shelved = n;   // nothing is turned away during the year
  g.log.unshift(`${PNAME[p]} gains ${n} ${good}${why ? " (" + why + ")" : ""}${shelved ? ` — ${shelved} to the stores` : ""}${queued ? `; ${queued} finds no room — choose` : ""}.`);
}
function myPalaces(g, p) { return works(g, (bd) => bd.t === "palace" && bd.o === p); }
// every organ of state eats one; garrisons are militia and eat nothing
function upkeepDue(g, p) { return { food: works(g, (bd) => isCrown(bd) && bd.o === p).length }; }
function hasAnnex(g, p, rid, t) { return works(g, (bd, r) => r === rid && bd.t === t && bd.o === p).length > 0; }
// WORKS — one walk over everything standing on the map. Every question of the form "which
// buildings are…?" is this walk plus a predicate, so the walk is written once.
function works(g, pred) {
  const out = [];
  for (const rid of Object.keys(g.b)) {
    const row = g.b[rid];
    for (let i = 0; i < row.length; i++) {
      const bd = row[i];
      if (bd && pred(bd, rid, i)) out.push([rid, i, bd]);
    }
  }
  return out;
}
const isCrown = (bd) => bd.t === "palace" || BT[bd.t].annex;   // an organ of state, not a province's work
function capacityOf(g, p, rid) { return rid === HOME[p] ? 3 : 1; }
// THE YEAR'S LEDGER — which targets a power has already spent a once-per-year verb on.
// One structure for every such verb: ACTIONS[v].oncePerYear declares the rule, these read it.
function usedOn(g, p, verb, rid) { return (((g.spent[p] || {})[verb]) || []).includes(rid); }
function markUsed(g, p, verb, rid) {
  g.spent[p] = g.spent[p] || {};
  (g.spent[p][verb] = g.spent[p][verb] || []).push(rid);
}
// ---- legality ----
// Which of your buildings can open an activation right now, and what it becomes.
// Every seat building's whole specification, including WHICH VERBS IT OFFERS — the one
// place that knows. `verb` (the verb auto-selected on activation) is derived, not stored:
// a building with exactly one verb selects it, a building with several waits to be told.
const PALACE_VERBS = ["build", "remove", "tax", "entreat", "treaty", "subvert", "raid", "searaid"];
const ANNEX_ACTORS = {
  chancery: { verbs: ["entreat", "subvert"], blurb: "entreat/subvert r2", doTxt: "opens its archive" },
  stables: { verbs: ["raid"], blurb: "raid r3 by land", doTxt: "musters a raid" },
  warrior: { verbs: ["raid", "searaid"], blurb: "raid r2 · sea raid", doTxt: "takes up its spears" },
  steward: { verbs: ["tax", "build"], blurb: "levy/build r1", doTxt: "takes up the province's affairs" },
};
for (const k of Object.keys(ANNEX_ACTORS)) {
  const v = ANNEX_ACTORS[k].verbs;
  ANNEX_ACTORS[k].verb = v.length === 1 ? v[0] : null;
}
// which kind of actor an open activation is, and therefore which verbs it may use
function actorKind(act) { return Object.keys(ANNEX_ACTORS).find((k) => act && act[k]) || null; }
function verbsOf(act) { const k = actorKind(act); return k ? ANNEX_ACTORS[k].verbs : PALACE_VERBS; }
function tradeSourcesExist(g, p, seat, isPort) {
  const reach = new Set();
  if (isPort) {
    for (const far of overseasPorts(g, seat)) {
      if (rank(g, p, far) < 1) continue;
      reach.add(far); // quay to quay
    }
  } else for (const rid of overland(g, p, seat, ACTIONS.trade.range(g, g.act || {}))) reach.add(rid);
  for (const rid of reach) {
    if (!(rid in g.b)) continue;
    for (let i = 0; i < g.b[rid].length; i++) {
      const bd = g.b[rid][i];
      const y = yieldOf(g, rid, i);
      if (!readyB(bd) || !y) continue;
      if (!(usable(g, p, rid, bd) || rank(g, p, rid) >= 1)) continue;
      if (tradeAfford(g, p, seat, y)) return true;
    }
  }
  return false;
}
function activatable(g, p) {
  const out = [];
  for (const rid of Object.keys(g.b))
    (g.b[rid] || []).forEach((bd, i) => {
      if (!bd || !readyB(bd)) return;
      if (isCrown(bd)) {
        if (bd.o !== p) return;                              // the crown's own organs
        if (bd.t === "palace" && rid === HOME[p]) out.push({ rid, i, kind: "palace" });
        else if (ANNEX_ACTORS[bd.t]) out.push({ rid, i, kind: bd.t });
        return;
      }
      // a market or a port belongs to its region: any power at Ties+ may open it, but it taps
      if (!(rid === HOME[p] || rank(g, p, rid) >= 1)) return;
      if (bd.t === "market" && tradeSourcesExist(g, p, rid, false)) out.push({ rid, i, kind: "market" });
      else if (bd.t === "port" && tradeSourcesExist(g, p, rid, true)) out.push({ rid, i, kind: "port" });
    });
  return out;
}
function beginActivation(g, rid, i) {
  const p = g.turn;
  const a = activatable(g, p).find((x) => x.rid === rid && x.i === i);
  if (!a) return;
  g.b[rid][i].tap = true;
  for (const q of PLAYERS) g.passed[q] = false;
  if (a.kind === "palace") {
    const cap = capacityOf(g, p, rid);
    g.act = { palace: rid, palIdx: [rid, i], capLeft: cap, cap0: cap };
    g.log.unshift(`${PNAME[p]} activates the royal palace of ${R[rid].n} (${cap} command${cap !== 1 ? "s" : ""}).`);
  } else if (a.kind === "market" || a.kind === "port") {
    g.act = a.kind === "port" ? { port: [rid, i] } : { market: [rid, i] };
    g.mode = { v: "trade" };
    g.log.unshift(a.kind === "port"
      ? `${PNAME[p]}'s port of ${R[rid].n} sends a ship out (sea trade).`
      : `${PNAME[p]}'s market of ${R[rid].n} opens for trade (range 3).`);
  } else {
    const def = ANNEX_ACTORS[a.kind];
    g.act = { palace: rid, palIdx: [rid, i], capLeft: 1, cap0: 1, [a.kind]: true };
    g.mode = def.verb ? { v: def.verb } : null;
    g.log.unshift(`${PNAME[p]}'s ${BT[a.kind].name.toLowerCase()} of ${R[rid].n} ${def.doTxt}.`);
  }
}
// Which half of the interface the current step belongs to: the MAP (click a region, a
// building, a unit) or the PANEL (choose a verb, pay a bill, bid for spears). The phone
// uses this to get out of its own way — the sheet drops to a peek whenever the work is
// on the map, and rises when the work is in the panel.
function mapOnlyStep(g) {
  if (g.shortfall) return false;
  if (!g.act) return !live(g).every((q) => g.passed[q]) && myPalaces(g, g.turn).length > 0;
  const m = g.mode;
  if (!m) return false;                     // the verb grid lives in the panel
  if (m.v === "source") return false;       // paying is panel work
  if (m.v === "build") return !m.region;    // the region is picked on the map, the type in the panel
  if (m.v === "raidCommit" || m.v === "raidDef" || m.v === "subvertBid") return false; // assembly and bidding
  return true;                              // levy, entreat, treaty, subvert, raid, remove, trade, strikes
}

// Where an errand may land. Every VERB answers out of ACTIONS — its reach, its cost, its
// `targets` and its `commit` — so the chains below are not a fallback for verbs but the
// handling for the interaction MODES that are not verbs at all: paying a bill (`source`),
// assembling a field (`raidCommit`/`raidDef`), and sacking what was won (`raidStrike`).
//
// NOT THE MENU. legalTargets knows where a verb may land; it does NOT know every gate that
// stands in front of a command. Once all have passed, the only thing on offer is the
// reckoning, yet this function still reports every activatable slot. Anything that asks
// "what may be done here" — the view above all — must read `availableCommands` instead, or it
// will offer what the gate refuses. Only the suites may call this, and only to compare.
function legalTargets(g) {
  const out = { regions: new Set(), slots: new Set() };
  if (!g.act && !g.shortfall) {
    for (const a of activatable(g, g.turn)) out.slots.add(a.rid + ":" + a.i);
    return out;
  }
  if (!g.act || !g.mode) return out;
  const p = g.turn; const m = g.mode; const palR = g.act.palace;
  if (!palR && m.v !== "trade" && m.v !== "source") return out;
  const spec = ACTIONS[m.v];
  if (spec && spec.targets) return spec.targets(g, p, m, out);

  if (m.v === "source" && m.phase === "choose") {
    for (const rid of tapRegionsOf(g, p, m.actor)) {
      if (m.tapRegion && m.tapRegion !== rid) continue;
      for (const [r2, i, y] of tapProducers(g, p, rid))
        if (!(m.kind === "trade" && y.good === m.extracted)) out.slots.add(r2 + ":" + i);
    }
  }
  if (m.v === "raidCommit" || m.v === "raidDef") {
    const side = m.v === "raidCommit" ? "atk" : "def";
    const who = sidePlayer(g, side);
    for (const u of battleUnits(g, who, g.raid.t, side, g.raid.mode)) {
      const price = unitPrice(u);
      const affordable =
        price.kind === "none" ? true :
        price.kind === "influence" ? infOf(g, who, u.rid) >= price.n :
        GOODS.some((t) => g.players[who].stock[t] > 0);
      if (affordable || isCommitted(g, side, u.rid, u.i)) out.slots.add(u.rid + ":" + u.i);
    }
    for (const c of sideList(g, side)) out.slots.add(c.rid + ":" + c.i);
  }
  if (m.v === "raidStrike") {
    for (const [t, i] of hostilesIn(g, p, g.raid.t)) out.slots.add(t + ":" + i);
  }

  return out;
}

// ---- resolution ----
function spend(g) {
  g.mode = null;
  g.act.capLeft--;
  if (g.act.capLeft <= 0) endActivation(g);
}
function forfeit(g, p) {
  // The apparatus of state falls; the country remains. Palaces and organs are pulled down —
  // they are what influence paid for. Farms, workshops, markets, ports and garrisons were
  // always the province's own, and simply carry on.
  const fallen = works(g, (bd) => bd.o === p && isCrown(bd));
  for (const e of fallen) g.b[e[0]][e[1]] = null;
  const razed = fallen.length;
  // the fallen realm's home becomes ordinary ground, courtable by whoever remains
  for (const q of PLAYERS) if (q !== p && !g.rel[q][HOME[p]]) g.rel[q][HOME[p]] = { i: 0, s: "none", strained: false };
  for (const rid of Object.keys(g.rel[p])) g.rel[p][rid] = { i: 0, s: "none", strained: false };
  g.players[p] = { stock: { food: 0, bronze: 0, cloth: 0, pottery: 0 } };
  g.out[p] = true;
  g.passed[p] = true;
  g.act = null; g.mode = null; g.raid = null;
  g.log.unshift(`${PNAME[p]} FORFEITS. ${razed} seat(s) of state are pulled down; the provinces keep their own works and go their own way, and the name is struck from the correspondence of kings.`);
  if (live(g).length === 0) { g.log.unshift("No kings remain."); return; }
  if (g.turn === p) g.turn = nextPlayer(g, p);
}
// ============================== THE COMMAND LAYER ==============================
// The game is driven ONLY by commands: the UI dispatches them, and any headless
// driver (a test, an AI, a network peer) dispatches the very same ones. The state
// is plain data and the rules are deterministic, so a command list IS a full game.

// =====================================================================
//                            THE ORDER
// =====================================================================
// A court gives an ORDER: one action-proper, fully specified. It is how the engine states what
// an action WAS, independently of the keystrokes that produced it:
//
//   commands ──Order.read──▶ ORDER ──Order.commands──▶ commands   (exact, no model)
//
// THIS LIVES IN THE ENGINE, beside ACTIONS and describeCmd, because it is knowledge ABOUT
// COMMANDS and must change whenever they do. Order.commands is the inverse of
// availableCommands; if a command is added that no order can drive, the round-trip test
// fails and says so — a rules defect, not a harness defect.
//
// ONE FIELD PER DECISION, and no field doing two jobs. Fields are filled by the MODE a
// command arrives in, never by its type alone, because `slot` means "buy from here",
// "tap this", "pull this down", "strike this" or "commit this" according to where it lands.
//
//   actor     {rid,i}    which building opens the activation
//   verb      string     what it does
//   target    {rid,i?}   the province (or slot) the verb acts upon
//   source    {rid,i}    trade only: the producer bought from
//   buildType string     build only
//   goods     [good]     entreat only: the gifts carried
//   pay       stores|taps
//   payGoods  [good]     paying from stores: which goods leave them
//   tapSlots  [[rid,i]]  which producers furnish the bill
//   basket    {pid:{good:n}}  contests: what is laid before whom
//   units     [[rid,i]]  contests: which units take the field
//   strikes   [[rid,i]]  a raid that wins: which works are pulled down
//
// `mode` is an explicit argument rather than read from the state, so a caller may ask what
// an order WOULD license at a recorded position without a live world in hand.
// =====================================================================

// The modes named for a verb: entering one IS choosing that verb, whether by an explicit
// command or because the building had only the one errand. Taken from ACTIONS so it cannot
// drift from the verbs the engine actually offers.
const ORDER_VERB_MODES = new Set(Object.keys(ACTIONS));

function orderRead(action) {
  const o = { actor: null, verb: null, target: null, source: null, buildType: null,
              goods: [], pay: null, payGoods: [], tapSlots: [], basket: {}, strikes: [] };
  for (const r of action) {
    const c = r.cmd, mode = r.mode;
    switch (c.t) {
      case "activate": o.actor = { rid: c.rid, i: c.i }; break;
      case "verb": o.verb = c.v; break;
      case "region": o.target = { rid: c.rid }; break;
      case "buildType": o.buildType = c.bt; break;
      case "giftToggle": if (!o.goods.includes(c.good)) o.goods.push(c.good); break;
      case "srcStock": o.pay = "stores"; break;
      case "srcStockUnit": o.pay = "stores"; o.payGoods = (o.payGoods || []).concat(c.good); break;
      case "commitTaps": o.pay = "taps"; break;
      case "bid": (o.basket[c.pid] = o.basket[c.pid] || {})[c.good] = (o.basket[c.pid][c.good] || 0) + 1; break;
      case "slot":
        // ONE command, five meanings — told apart by the moment it arrives in, never by its
        // own fields. Each lands in a DIFFERENT order field; none of them share one.
        if (mode === "trade") o.source = { rid: c.rid, i: c.i };
        else if (mode === "source") o.tapSlots.push([c.rid, c.i]);
        else if (mode === "remove") o.target = { rid: c.rid, i: c.i };
        // A STRIKE IS NOT THE TARGET: the raid's target is the province, a strike names one
        // work inside it, and there may be several. They need their own field or the last
        // strike overwrites the province the raid was aimed at.
        else if (mode === "raidStrike") (o.strikes = o.strikes || []).push([c.rid, c.i]);
        else if (mode === "raidCommit" || mode === "raidDef") (o.units = o.units || []).push([c.rid, c.i]);
        break;
      default: break;
    }
  }
  // A BUILDING WITH ONE ERRAND SELECTS ITS OWN VERB, so no `verb` command appears in the
  // trace — a stables raids, a market trades. Recover it from the MODE, which is named for the
  // verb it serves. Never default to a particular verb: an order that names the wrong verb
  // licenses the wrong commands, silently.
  if (!o.verb) {
    const r = action.find((x) => ORDER_VERB_MODES.has(x.mode));
    if (r) o.verb = r.mode;
  }
  if (o.tapSlots.length) o.pay = "taps";
  return o;
}

function orderAllows(order, c, used, mode) {
  // `used` is a LIST, not a set: a basket may hold two bronze, so the TALLY matters
  const u = (k) => used.includes(k);
  const n = (k) => used.filter((x) => x === k).length;
  switch (c.t) {
    case "activate":  return !!order.actor && c.rid === order.actor.rid && c.i === order.actor.i;
    case "verb":      return c.v === order.verb;
    case "region":    return !!order.target && c.rid === order.target.rid;
    case "buildType": return c.bt === order.buildType;
    case "giftToggle":return (order.goods || []).includes(c.good) && !u("g:" + c.good);
    case "giftSend":  return (order.goods || []).length > 0 && (order.goods || []).every((x) => u("g:" + x));
    case "srcStock":  return order.pay === "stores";
    case "srcStockUnit":
      // paying from stores still asks WHICH goods leave them
      return order.pay === "stores" && (!order.payGoods || !order.payGoods.length
        || ((order.payGoods).includes(c.good) && n("p:" + c.good) < order.payGoods.filter((x) => x === c.good).length));
    case "commitTaps":return order.pay === "taps" && (order.tapSlots || []).every(([r, i]) => u(`t:${r}:${i}`));
    case "bid":       { const want = (order.basket || {})[c.pid];
                        return !!want && !!want[c.good] && n(`b:${c.pid}:${c.good}`) < want[c.good]; }
    // A TERMINAL WAITS FOR EVERYTHING THE ORDER NAMES — the basket laid AND the units
    // committed. Gate one of them on the basket alone and it competes with the very
    // commitments it is waiting for, so the walk can close the contest early.
    case "stand":     return Object.entries(order.basket || {}).every(([pid, gs]) =>
                        Object.entries(gs).every(([gd, k]) => n(`b:${pid}:${gd}`) >= k))
                        && (order.units || []).every(([r, i]) => u(`u:${r}:${i}`));
    case "launch":    return (order.verb === "raid" || order.verb === "searaid")
                        && Object.entries(order.basket || {}).every(([pid, gs]) =>
                          Object.entries(gs).every(([gd, k]) => n(`b:${pid}:${gd}`) >= k))
                        && (order.units || []).every(([r, i]) => u(`u:${r}:${i}`));
    case "endRaid":   // the sack is over when every work the order named has been struck
                      return (order.strikes || []).every(([r, i]) => u(`k:${r}:${i}`));
    // A `slot` MEANS DIFFERENT THINGS IN DIFFERENT MODES — buy from here, tap this, pull
    // this down, strike this, commit this. The extraction reads the mode; so must this, or
    // an order licenses a payment where a purchase was meant.
    case "slot":
      if (mode === "trade")
        return !!order.source && c.rid === order.source.rid && c.i === order.source.i && !u("src");
      if (mode === "source")
        return (order.tapSlots || []).some(([r, i]) => r === c.rid && i === c.i && !u(`t:${r}:${i}`));
      if (mode === "remove")
        return !!order.target && order.target.i !== undefined && c.rid === order.target.rid && c.i === order.target.i && !u("tgt");
      if (mode === "raidStrike")
        return (order.strikes || []).some(([r, i]) => r === c.rid && i === c.i && !u(`k:${r}:${i}`));
      if (mode === "raidCommit" || mode === "raidDef")
        return (order.units || []).some(([r, i]) => r === c.rid && i === c.i && !u(`u:${r}:${i}`));
      return false;
    default: return false;
  }
}

function orderMark(order, c, used, mode) {
  if (c.t === "giftToggle") used.push("g:" + c.good);
  else if (c.t === "srcStockUnit") used.push("p:" + c.good);
  else if (c.t === "bid") used.push(`b:${c.pid}:${c.good}`);
  else if (c.t === "slot") {
    if (mode === "trade") used.push("src");
    else if (mode === "source") used.push(`t:${c.rid}:${c.i}`);
    else if (mode === "remove") used.push("tgt");
    else if (mode === "raidStrike") used.push(`k:${c.rid}:${c.i}`);
    else used.push(`u:${c.rid}:${c.i}`);
  }
  return used;
}

// EXPAND an order into the commands that carry it out. The executor, the dry-run validator
// and the specification checker are all this one walk. It never assumes what comes next: it
// reads the live menu and keeps whatever the order licenses. Exactly one → forced. None →
// the order is spent, or wrong. Several of the SAME kind → their sequence is free (three
// gifts, two taps). Several of DIFFERENT kinds → the order does not say enough, and it says so.
function orderCommands(g0, order, limit = 20) {
  const commands = [], used = [];
  let g = JSON.parse(JSON.stringify(g0));
  // ONE ACTION-PROPER, then stop. Three boundaries end it, and all three are arithmetic
  // rather than judgement: a command is spent, the activation closes, or THE DESK PASSES to
  // another court (a raid hands the field to its defenders long before its command is spent).
  const capOf = (s) => (s.act ? s.act.capLeft : null);
  let baseline = capOf(g);
  const hadAct = !!g.act;
  const desk = effectiveSeat(g);
  for (let k = 0; k < limit; k++) {
    const mode = g.mode ? g.mode.v : (g.act ? "verb-choice" : "activate");
    const menu = availableCommands(g).filter((c) => !ORDER_NEVER.has(c.t));
    const cand = menu.filter((c) => orderAllows(order, c, used, mode));
    if (!cand.length) return { commands, done: true };
    // WHEN IS AMBIGUITY BENIGN? Not "when the kinds match" — that was a proxy. The real
    // property is whether the order named the candidates as a SET. Gifts, bids, taps and
    // committed units are collections whose sequence is free; a verb, a target, a build type
    // or a payment route is a single choice. So several set-shaped candidates mean "any
    // order will do"; anything else means the order does not say enough.
    if (cand.length > 1 && !cand.every((c) => orderSetShaped(c, mode))) return { commands, ambiguous: cand };
    orderMark(order, cand[0], used, mode);
    commands.push(cand[0]);
    g = dispatch(JSON.parse(JSON.stringify(g)), cand[0]);
    if (effectiveSeat(g) !== desk) return { commands, done: true };
    if (hadAct || baseline !== null) {
      if (!g.act) return { commands, done: true };
      if (baseline != null && capOf(g) < baseline) return { commands, done: true };
    } else if (g.act) baseline = capOf(g);
  }
  return { commands, done: true };
}
// commands that undo or abandon: never part of an order
const ORDER_NEVER = new Set(["srcBack", "tradeCancel", "cancelActivation", "bidTake", "calloff", "endActivation", "pass", "forfeit"]);
// Which commands the order names as members of a SET rather than as a single choice.
function orderSetShaped(c, mode) {
  if (c.t === "giftToggle" || c.t === "bid" || c.t === "srcStockUnit") return true;
  return c.t === "slot" && (mode === "source" || mode === "raidCommit" || mode === "raidDef" || mode === "raidStrike");
}

const Order = { read: orderRead, allows: orderAllows, mark: orderMark, commands: orderCommands };

// =====================================================================
//                             THE VIEW
// =====================================================================
// TWO CONSUMERS ASK TWO DIFFERENT QUESTIONS, and neither gets the other's answer reshaped:
//
//   a model asks  "what may I do?"   → availableCommands(g)   commands, nothing else
//   the table asks "what do I show?"  → view(g)                one structure, drawn as-is
//
// The table does no reasoning. It does not check whether a payment suffices, count what is
// left, or know that commands have types. It reads panels, draws them, and ships back the
// payload attached to whatever was clicked. Everything it needs to say is said here.
//
// THE VOCABULARY IS PRESENTATIONAL, NEVER DOMAIN. There is no "raid panel" and no "embassy
// panel": there are choices, facts, sides, notes and a map. A raid and an embassy differ in
// what they put in those, not in what kind of thing they are — which is what lets a new verb
// appear on the table without the table being taught about it.
//
// AN OPTION carries facts, never appearance:
//   label, gloss   what it is called, and what it does
//   cmd            the command to dispatch — NULL when the option is blocked, so a table
//                  cannot offer what the engine would refuse
//   state          chosen · available · idle · blocked   what it is doing now
//                  (idle: permitted, but it will not serve — say why)
//   category       a checkable string: seat, work, producer, issuer, own, mercenary,
//                  bid, target, abandon, verb, building, terminal, aside
//   why            when blocked, the reason. A player is owed that; the model is not.
//   rank           primary when this is THE thing to do here
//   subject        what it concerns: a region, a power, a good, a building type
//
// A PANEL belongs to a BAND. The bands are a fixed skeleton, always in this order, each
// absent only when it holds nothing — so nothing moves under the hand between steps:
//
//   actor     which building acts
//   errand    what it does
//   standing  the situation: a raid's two columns, a bidding's standings, the bill
//   detail    the particulars: where, what kind, which producers, which goods
//   commit    settle · launch · call off · back
//   notice    why a thing can or cannot be done, and what it will be worth
//   turn      pass · forfeit · resolve the year
//
// Two bands are NOT drawn in the column, because the shell places them itself: `map` (the
// board) and `chronicle` (a dialog on a desk, folded into the sheet on a phone).
//
// A LIST SHOWS EVERY MEMBER IT WILL EVER SHOW during a step. availableCommands naturally
// drops what has been taken or cannot serve; the view puts those back, marked `chosen` or
// `blocked`, so a list never grows or shrinks under the pointer.
//
// A PANEL carries `pick`, which says what the options are TO EACH OTHER:
//   one     mutually exclusive alternatives      (verbs, build types)
//   many    a set to build up                    (sponsors, gifts, units)
//   repeat  increments, choosable again          (bids)
//   act     a single act                         (launch, stand, the reckoning)
// and `state: "satisfied"` where a terminal's condition is met.
//
//   { kind: "notice",  level, text }                    a word from the state to the player:
//                                                        info · ok · warning · problem
//   { kind: "note",    text }                            a line of prose
//   { kind: "choices", id, label, options[] }            options: { label, gloss, cmd, weight }
//   { kind: "facts",   id, label, rows[] }               rows:    { label, value, warn }
//   { kind: "sides",   id, label, columns[] }            a contest: opposed totals
//   { kind: "map",     id, regions{} }                   the same options, indexed by PLACE
//   { kind: "chronicle", id, lines[] }                  lines: { text, fresh }
//
// THE MAP is the sixth kind, and the only one that is not a list. A panel is read top to
// bottom; a province is drawn ONCE and may host several options at once — build here, entreat
// here, levy here — so the map cannot consume a flat list of choices. It gets the same facts
// keyed by region:
//
//   regions: { NIP: { options[], slots: { 0: options[] }, works[], relations[], subject: {…} }, … }
//
// `options` and `slots` are what may be DONE here. `works`, `relations` and `subject` are what
// IS here — one entry per slot for what is built, one per power for who stands where, and the
// province's own standing. All three belong in the view for the same reason the options do: an
// interface reading them off `g` instead would be a second source of the same facts.
//
// The options are the IDENTICAL shape used everywhere else, so "click the map" and "click the
// panel" are the same act, and a province out of reach is an option with `cmd: null` and a
// `why`, exactly as a blocked sponsor is.
//
// `subject` carries FACTS, never appearance: who holds the province, at what rung, whether it
// is coastal. `PCOL[holder]` is the table's reading of that, and belongs to the table. What
// the map does NOT carry is where a province sits: `REG` holds x/y because that is a fact
// about the world, like which regions border it. The table owns the transform — pan, zoom,
// pixels, colour — and nothing else.
//
// `cmd` on an option is the command to dispatch, verbatim. The table never builds one.
// =====================================================================
// goods, short enough for a card that must not wrap
const SHORTGOOD = { food: "food", bronze: "brz", cloth: "cloth", pottery: "pot" };
// "a and b" reads better than "a, b" in a sentence meant for a person
const andList = (a) => (a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
function view(g) {
  const p = g.turn;
  const av = availableCommands(g);
  const only = (t) => av.filter((c) => c.t === t);
  // A LABEL IS A NAME, NOT AN EXPLANATION. describeCmd writes for the model, in sentences;
  // a button needs two or three words and the sentence on hover. Where a command has no
  // obvious short name, it is given one here.
  // the verbs, named. ACTIONS carries no display name, so the fallback was to SHOUT.
  const VERB = { build: "Build", remove: "Remove", tax: "Levy", entreat: "Entreat",
    treaty: "Treaty", subvert: "Subvert", raid: "Raid", searaid: "Sea raid", trade: "Trade" };
  const SHORT = {
    pass: "Pass", forfeit: "Forfeit", endActivation: "End activation",
    cancelActivation: "Cancel", srcBack: "Back", tradeCancel: "Cancel trade", back: "Back",
    calloff: "Call it off", launch: "Launch", stand: "Stand", endRaid: "Withdraw",
    resolveUpkeep: "Resolve upkeep", restoreCourt: "Restore the court",
    srcStock: "From the stockpile", commitTaps: "Settle", srcToChoose: "Back",
    giftSend: "Send the embassy",
  };
  const opt = (c, label, more) => ({ label: label || SHORT[c.t] || describeCmd(g, c), gloss: describeCmd(g, c),
    cmd: c, state: "available", ...(more || {}) });
  // an option the court may NOT take, and why. The model never sees these; a player is owed
  // the reason a producer cannot pay, or a province is closed to them.
  const blocked = (label, why, more) => ({ label, gloss: why, cmd: null, state: "blocked", why, ...(more || {}) });
  const panels = [];

  // ---- where things stand ----
  const bothPassed = PLAYERS.every((q) => g.out[q] || g.passed[q]);
  // Only the exceptional is announced. A routine turn needs no running commentary — the
  // bands themselves say where things stand.
  if (g.shortfall) panels.push({ kind: "note", band: "standing",
    text: `${PNAME[g.shortfall.p]} — famine, choose what to abandon` });
  else if (bothPassed) panels.push({ kind: "note", band: "standing",
    text: "All have passed — resolve the year" });
  if (g.act && g.act.capLeft !== undefined)
    panels.push({ kind: "facts", band: "standing", id: "activation", label: "",
      rows: [{ label: "", value: `${g.act.capLeft} command${g.act.capLeft === 1 ? "" : "s"} left of ${g.act.cap0}` }] });

  // ---- a famine: which works are given up ----
  if (g.shortfall) {
    const rows = only("perish").map((c) => {
      const bd = g.b[c.rid][c.i];
      return opt(c, `${BT[bd.t].name} in ${R[c.rid].n}`);
    });
    if (rows.length) panels.push({ kind: "choices", band: "detail", id: "abandon", pick: "many",
      label: "", options: rows });
  }

  // ---- the year closes ----
  for (const c of only("resolveUpkeep"))
    panels.push({ kind: "choices", band: "turn", id: "upkeep", pick: "act", label: "",
      options: [opt(c, "Resolve upkeep", { category: "terminal", rank: "primary" })] });

  // ---- a court with no palace rebuilds one ----
  for (const c of only("restoreCourt"))
    panels.push({ kind: "choices", band: "turn", id: "restore", pick: "act", label: "",
      options: [opt(c, "Restore the court", { category: "terminal", rank: "primary" })] });

  // ---- open a building ----
  const acts = only("activate").map((c) => {
    const bd = g.b[c.rid][c.i];
    return opt(c, `${BT[bd.t].name} — ${R[c.rid].n}`,
      { category: BT[bd.t].annex ? "seat" : "building", subject: { building: bd.t, region: c.rid } });
  });
  if (acts.length) panels.push({ kind: "choices", band: "actor", id: "activate", pick: "one", label: "", options: acts });

  // ---- name the errand ----
  // EVERY ERRAND THE BUILDING MAY NAME, in the same order every time. availableCommands
  // drops the one already chosen and any that lead nowhere; both go back in, marked, so the
  // grid never reflows under the hand.
  if (g.act) {
    const offered = new Map(only("verb").map((c) => [c.v, c]));
    const errands = verbsOf(g.act).map((v) => {
      // while a cost is being paid the mode is `source`; the errand it serves is in `kind`
      const chosenVerb = g.mode && (g.mode.v === "source" ? g.mode.kind : g.mode.v);
      if (chosenVerb === v)
        return { label: VERB[v] || v, gloss: `${VERB[v] || v} — chosen`, cmd: null,
                 state: "chosen", category: "verb", subject: { verb: v } };
      const c = offered.get(v);
      if (c) return opt(c, VERB[v] || v, { category: "verb", subject: { verb: v } });
      return blocked(VERB[v] || v, "nothing within reach for this", { category: "verb", subject: { verb: v } });
    });
    if (errands.length) panels.push({ kind: "choices", band: "errand", id: "verb", pick: "one",
      label: "", options: errands });
  }

  // ---- where the errand falls ----
  const tgts = only("region");
  if (tgts.length) panels.push({ kind: "choices", band: "detail", id: "target", pick: "one", label: "",
    options: tgts.map((c) => opt(c, R[c.rid].n, { category: "place", subject: { region: c.rid } })) });

  // ---- the board: the same options, indexed by place ----
  // THE MAP DRAWS FROM `av`, the menu itself — never from `legalTargets`, which knows where a
  // verb may land but not every gate in front of it (see the note there). A board drawn from
  // the looser answer lights things the gate will refuse: no rule breaks, but the board says a
  // thing can be done that cannot, which is the same disease one step earlier.
  //
  // The target panel above lists the same provinces. That duplication is DELIBERATE: a list
  // is easier to hit on a phone, a map easier to reason about on a desk. Both are drawn from
  // this one menu, so they cannot come to disagree.
  {
    const regions = {};
    // which slots may be clicked, and with which command — `activate` opens a building,
    // `slot` picks one inside an activation. The engine decides which; the map only asks.
    const slotCmds = av.filter((c) => c.t === "activate" || c.t === "slot");
    const tgtBy = new Map(tgts.map((c) => [c.rid, c]));
    for (const r of REG) {
      const rid = r.id;
      const options = [];
      if (tgtBy.has(rid))
        options.push(opt(tgtBy.get(rid), R[rid].n, { category: "place", subject: { region: rid } }));
      // A PROVINCE OUT OF REACH IS AN OPTION, NOT AN ABSENCE. Only while an errand is looking
      // for ground: with nothing to target there is nothing a province could be refused for,
      // and every region would carry a reason answering a question nobody asked.
      else if (tgts.length)
        options.push(blocked(R[rid].n, rejectReason(g, { t: "region", rid }, av),
          { category: "place", subject: { region: rid } }));

      const slots = {};
      for (const c of slotCmds) {
        if (c.rid !== rid) continue;
        (slots[c.i] = slots[c.i] || []).push(
          opt(c, R[rid].n, { category: "work", subject: { region: rid, slot: c.i } }));
      }

      // WHOSE WRIT RUNS HERE. A home province is held by its king outright; otherwise the
      // highest rung takes it, and an ally shows only where nobody holds it. These are the
      // facts. That a subject province is drawn in its holder's colour, and an ally's in a
      // dashed line, is the table's reading of them.
      const home = PLAYERS.find((q) => HOME[q] === rid) || null;
      const holder = home || live(g).find((q) => rank(g, q, rid) >= 3) || null;
      const ally = holder ? null : live(g).find((q) => rank(g, q, rid) === 2) || null;

      // WHAT STANDS HERE. One entry per slot, in slot order, so `works[i]` lines up with the
      // ground `REG` describes at `slots[i]` — the engine pads g.b to slot count at initState,
      // so the two are always the same length. An empty slot is `{ building: null }`.
      //
      // `power` IS THE OWNING KING, OR NULL — this is where the `bd.o` overload is decoded and
      // stopped (see `usable`). Null means the owner is the containing province, which the
      // caller already knows: it asked for this region.
      const works = (g.b[rid] || []).map((bd) => (!bd ? { building: null } : {
        building: bd.t,
        label: BT[bd.t].name,
        power: PLAYERS.includes(bd.o) ? bd.o : null,
        spent: !!bd.tap,
      }));

      // WHO STANDS HERE, DIPLOMATICALLY. Facts only: the rung is named, not abbreviated, and
      // `strained` is a flag rather than the "!" the table happens to draw.
      //
      // EMITTED FOR CAPITALS TOO, deliberately. A capital is not exempt from a rival holding
      // influence inside it, and reporting only "home" there would hide that. Whether to say
      // "home" instead is the table's call, and `subject.home` is what it decides from.
      const relations = [];
      for (const q of live(g)) {
        const rr = g.rel[q] && g.rel[q][rid];
        if (rr && (rr.i > 0 || rr.s !== "none"))
          relations.push({ power: q, influence: rr.i, rung: rr.s, strained: !!rr.strained });
      }

      regions[rid] = { options, slots, works, relations, subject: {
        region: rid, home, holder, ally,
        rank: holder ? rank(g, holder, rid) : 0,
        coastal: isCoastal(rid), wild: !!r.wild,
        acting: !!(g.act && g.act.palace === rid),
      } };
    }
    panels.push({ kind: "map", band: "map", id: "map", regions });
  }

  // ---- what to raise, once the ground is chosen ----
  const bts = only("buildType");
  if (bts.length) panels.push({ kind: "choices", band: "detail", pick: "one",
    id: "buildType", label: "",
    options: bts.map((c) => opt(c, BT[c.bt].name + (BT[c.bt].annex ? " ⌂" : ""),
      { category: BT[c.bt].annex ? "seat" : "work", subject: { buildType: c.bt } })) });

  // ---- paying for it: the bill, and who may settle it ----
  if (g.mode && g.mode.v === "source" && g.mode.phase === "choose") {
    const m = g.mode, spec = specOf(m);
    // NO RUNNING TALLY. What is owed is implied by the step; what is laid is the sponsors
    // lit; and "the bill is met" is exactly when Settle appears. A panel that grows and
    // shrinks as you tap only shifts the buttons under your hand.

    // EVERY SPONSOR IN REACH, whether it may serve or not. A producer that cannot pay this
    // particular bill, or a province closed because the sponsors must come from one place,
    // is still worth showing — the player is owed the reason. The model asks a different
    // question and never sees these: a blocked option carries no command.
    const offered = new Set(only("slot").map((c) => c.rid + ":" + c.i));
    for (const rid of tapRegionsOf(g, p, m.actor)) {
      const prods = tapProducers(g, p, rid);
      if (!prods.length) continue;
      const shut = m.tapRegion && m.tapRegion !== rid;
      const options = prods.map(([r2, i, y]) => {
        const bd = g.b[r2][i];
        const label = `${BT[bd.t].name}${y ? ` · ${y.n} ${y.good}` : ""}`;
        const cat = y && y.issue ? "issuer" : "producer";
        if (shut) return blocked(label, `the sponsors must all come from ${R[m.tapRegion].n}`,
          { category: cat, subject: { region: r2, good: y && y.good } });
        if (!offered.has(r2 + ":" + i)) return blocked(label,
          costTapDead(spec, m, y) ? `${y.good} cannot settle ${costCaption(spec, m)}` : "not available here",
          { category: cat, subject: { region: r2, good: y && y.good } });
        const c = only("slot").find((x) => x.rid === r2 && x.i === i);
        // the engine permits selecting a producer whose good cannot settle THIS bill — it is
        // legal, merely useless, and a player should be told so rather than discover it at
        // the settling. (Whether it should be offered at all is a rules question, unsettled.)
        const useless = costTapDead(spec, m, y);
        return opt(c, label, { category: cat, subject: { region: r2, good: y && y.good },
          why: useless ? `${y.good} cannot settle ${costCaption(spec, m)}` : undefined,
          state: (m.taps || []).some(([sr, si]) => sr === r2 && si === i) ? "chosen"
            : useless ? "idle" : "available" });
      });
      panels.push({ kind: "choices", band: "detail", id: "sponsor:" + rid, pick: "many",
        label: R[rid].n, state: shut ? "closed" : undefined, options });
    }

    // THE PURSE IS ALWAYS DRAWN, whether it may serve or not — the same courtesy the sponsors
    // above are shown. A button that vanishes when the stores run dry, or the moment a
    // producer is tapped, reads as "this was never an option here"; a button that stays and
    // says why reads as the refusal it is, and names what to do about it. It also stops the
    // row below it from moving under the hand as sponsors go on and off.
    const purse = only("srcStock")[0];
    panels.push({ kind: "choices", band: "detail", id: "purse", pick: "act", label: "",
      options: [purse ? opt(purse, "From the stockpile", { category: "terminal" })
        // the two gates availableCommands keeps on it, said in the order a player meets them
        : blocked("From the stockpile",
            (m.taps || []).length
              ? "the bill is being met from the provinces — set those sponsors aside to pay from the stores instead"
              : `your stores cannot cover ${costCaption(spec, m)}`,
            { category: "terminal" })] });
    for (const c of only("commitTaps"))
      panels.push({ kind: "choices", band: "commit", id: "settle", pick: "act", label: "", state: "satisfied",
        options: [opt(c, "Settle the bill", { category: "terminal", rank: "primary" })] });
  }

  // ---- and paying from the stores: WHICH goods leave them ----
  // The choose phase above draws the sponsors; THIS PHASE MUST DRAW THE PURSE. `srcStock` on a
  // bill that names no fixed goods — an embassy's gifts, a trade's matching payment — settles
  // nothing on its own: it opens a second question, which goods. The commands that answer it
  // (`giftToggle`, `giftSend`, `srcStockUnit`) are on the menu here, so a panel must carry them
  // or "From the stockpile" is a dead end with no way out but ending the activation. The
  // menu-coverage check in test-view.js is what holds every step to that.
  if (g.mode && g.mode.v === "source" && g.mode.phase === "stock") {
    const m = g.mode;
    // EVERY GOOD, ALWAYS. An empty store is shown as an empty store rather than left out, so
    // the row does not grow under the hand as the stores change. A good that cannot serve
    // says WHY: an empty store and a good that is the very thing being bought are different
    // refusals, and reading "no pottery in the stockpile" while holding pottery is a lie.
    const goodsPanel = (id, label, offered, why, stateOf) =>
      panels.push({ kind: "choices", band: "detail", id, pick: "many", label,
        options: GOODS.map((t) => {
          const c = offered.get(t);
          if (!c) return blocked(t, why(t), { category: "producer", subject: { good: t } });
          return opt(c, t, { category: "producer", subject: { good: t }, state: stateOf(t) });
        }) });
    const bare = (t) => `no ${t} in the stockpile`;

    if (m.kind === "entreat") {
      goodsPanel("gifts", "the embassy carries",
        new Map(only("giftToggle").map((c) => [c.good, c])), bare,
        (t) => ((m.gifts || []).includes(t) ? "chosen" : "available"));
      for (const c of only("giftSend"))
        panels.push({ kind: "choices", band: "commit", id: "send", pick: "act", label: "", state: "satisfied",
          options: [opt(c, "Send the embassy", { category: "terminal", rank: "primary" })] });
    } else {
      // a unit at a time, and each one is SPENT as it is laid — there is no basket to confirm
      goodsPanel("purse", "lay from the stores",
        new Map(only("srcStockUnit").map((c) => [c.good, c])),
        (t) => (t === m.extracted ? `${t} is what you are buying — pay in something else` : bare(t)),
        () => "available");
    }
  }

  // ---- a word to the player: what is owed, what is forecast, what stands in the way ----
  const say = (level, text) => panels.push({ kind: "notice", band: "notice", level, text });

  // an embassy's worth is worth knowing before it is sent, whoever is carrying the gifts —
  // the provinces that sponsor it or the stores it is drawn from. entreatRemark writes for
  // the model, in capitals; the level carries the urgency here, so the words need not shout.
  const sayEmbassyWorth = (rid, nGoods) => {
    const remark = nGoods ? entreatRemark(g, p, rid, nGoods) : null;
    if (remark) say(/⚠|WARNING/.test(remark) ? "warning" : "ok",
      remark.replace(/^⚠\s*/, "").replace(/^WARNING:\s*/, "")
            .replace(/\bBELOW\b/g, "below").replace(/\bNOTHING\b/g, "nothing"));
  };

  if (g.mode && g.mode.v === "source" && g.mode.phase === "choose") {
    const m = g.mode, spec = specOf(m);
    const owed = costCaption(spec, m) + (m.kind === "build" && m.bt ? ` for a ${BT[m.bt].name.toLowerCase()} at ${R[m.region].n}` : "");
    if (!(m.taps || []).length) say("info", `The cost is ${owed}.`);
    else {
      const short = costShortfall(spec, m, tapYields(g, m));
      if (short.length) say("problem", `Still owed: ${andList(short)}.`);
      else say("ok", `The bill is met — ${owed}.`);
    }
    if (m.kind === "entreat" && (m.taps || []).length) {
      const goods = new Set();
      for (const [r2, i2] of m.taps) { const y = yieldOf(g, r2, i2); const bd = g.b[r2][i2];
        if (y) goods.add(y.good); else if (bd && BT[bd.t].issues) goods.add(BT[bd.t].issues); }
      sayEmbassyWorth(m.region, goods.size);
    }
  }

  // the same word, for a bill being settled out of the stores rather than off the land
  if (g.mode && g.mode.v === "source" && g.mode.phase === "stock") {
    const m = g.mode;
    if (m.kind === "entreat") {
      const n = (m.gifts || []).length;
      if (!n) say("info", "Choose the goods the embassy carries — one distinct good is +1 influence, to a maximum of +4.");
      else say("ok", `The embassy carries ${andList(m.gifts)}.`);
      sayEmbassyWorth(m.region, n);
    } else {
      // paying unit by unit: what is still owed is a COUNT, and each good laid is gone
      const left = m.need - (m.paid || []).length;
      if (left > 0) say("info", `${left} more good${left > 1 ? "s" : ""} to lay, any but ${m.extracted}. Each is spent as it is laid.`);
    }
  }

  if (g.raid && g.mode && g.mode.v === "raidCommit") {
    const s = raidStrength(g);
    if (s < 1) say("problem", "Nothing is mustered — the raid cannot go.");
    else say("ok", `The muster stands at ${s}.`);
  }
  if (g.shortfall) say("problem", `${g.shortfall.deficit} more must be abandoned.`);

  // ---- the courts, as they stand ----
  for (const q of live(g)) {
    const st = g.players[q].stock;
    const due = upkeepDue(g, q).food;
    const keep = foodStore(g, q);
    const short = st.food < due;
    const rots = foodRots(g, q);
    const rows = [
      { label: "", value: GOODS.map((k) => `${st[k]} ${SHORTGOOD[k] || k}`).join(" · ") },
      { label: "due", value: short ? `${due} food — ${due - st.food} short, mouths will be lost` : `${due} food`, warn: short },
    ];
    if (!short && rots > 0) rows.push({ label: "winter", value: `${rots} food will rot (the store holds ${keep})`, warn: true });
    panels.push({ kind: "facts", band: "courts", id: "court:" + q, label: PNAME[q] + (g.out[q] ? " — fallen" : ""),
      subject: { power: q, self: q === p, store: keep }, rows });
  }

  // ---- a contest: two sides, and whatever may still be laid before them ----
  if (g.raid && g.mode && ["raidCommit", "raidDef", "raidStrike"].includes(g.mode.v)) {
    // the raider is the court that opened the contest; the defence is whoever is protecting
    const raider = (g.contest && g.contest.opener) || g.turn;
    const named = (list) => (list || []).map((u) => {
      const bd = g.b[u.rid] && g.b[u.rid][u.i];
      return bd ? `${BT[bd.t].name} of ${R[u.rid].n}` : null;
    }).filter(Boolean);
    panels.push({ kind: "sides", band: "standing", id: "field",
      label: `${g.raid.mode === "sea" ? "Sea raid" : "Raid"} on ${R[g.raid.t].n}`,
      columns: [
        { label: PNAME[raider] || "the raiders", rows: named(g.raid.atk), total: `strength ${raidStrength(g)}` },
        { label: R[g.raid.t].n, rows: named(g.raid.defC), total: `defence ${fortressDef(g, g.raid.t)}` },
      ] });

    // the units this court may still put in or take out of the field
    const side = g.mode.v === "raidDef" ? "def" : "atk";
    const seatNow = effectiveSeat(g);
    const units = only("slot").filter((c) => g.mode.v !== "raidStrike");
    if (units.length) panels.push({ kind: "choices", band: "detail", id: "muster", pick: "many",
      label: g.mode.v === "raidDef" ? "Your defence" : "Your muster",
      options: units.map((c) => {
        const bd = g.b[c.rid][c.i];
        const u = battleUnits(g, seatNow, g.raid.t, side, g.raid.mode).find((x) => x.rid === c.rid && x.i === c.i);
        return opt(c, `${BT[bd.t].name} of ${R[c.rid].n}`, {
          category: u && u.terms === "hire" ? "mercenary" : "own",
          subject: { region: c.rid },
          state: isCommitted(g, side, c.rid, c.i) ? "chosen" : "available" });
      }) });

    // the wild peoples, and what is laid before each
    const byPeople = {};
    for (const c of [...only("bid"), ...only("bidTake")]) (byPeople[c.pid] = byPeople[c.pid] || []).push(c);
    for (const pid of Object.keys(byPeople))
      panels.push({ kind: "choices", band: "detail", id: "hire:" + pid, pick: "repeat",
        label: `${R[pid].n} — one warband to the better basket`,
        options: byPeople[pid].map((c) => opt(c, (c.t === "bid" ? "+" : "−") + c.good,
          { category: "bid", subject: { people: pid, good: c.good } })) });

    // what may be struck, once the field is won
    const strikes = g.mode.v === "raidStrike" ? only("slot") : [];
    if (strikes.length) panels.push({ kind: "choices", band: "detail", id: "strike", pick: "many",
      label: `${g.raid.strikes} strike${g.raid.strikes !== 1 ? "s" : ""} left in ${R[g.raid.t].n}`,
      options: strikes.map((c) => opt(c, `${BT[g.b[c.rid][c.i].t].name} in ${R[c.rid].n}`,
        { category: "target", subject: { region: c.rid } })) });

    const enders = [...only("launch"), ...only("stand"), ...only("endRaid"), ...only("calloff")];
    if (enders.length) panels.push({ kind: "choices", band: "commit", id: "resolve", pick: "act", label: "",
      options: enders.map((c) => opt(c, null,
        { category: "terminal", rank: c.t === "launch" || c.t === "endRaid" ? "primary" : undefined })) });
  }

  // ---- a bidding for the elite: the desk goes round the table ----
  if (g.contest && g.mode && g.mode.v === "subvertBid") {
    const c = g.contest, who = contestActor(g);
    panels.push({ kind: "sides", band: "standing", id: "bidding", label: `The elite of ${R[c.rid].n}`,
      columns: c.turnOrder.map((q) => {
        const laid = (c.lots[c.rid] || {})[q] || {};
        return { label: PNAME[q] + (q === who ? " — speaking" : ""),
          rows: GOODS.filter((k) => laid[k]).map((k) => `${laid[k]} ${k}`),
          total: `standing ${infOf(g, q, c.rid)}` };
      }) });
    const mine = [...only("bid"), ...only("bidTake")];
    if (mine.length) panels.push({ kind: "choices", band: "detail", id: "lay", pick: "repeat", label: PNAME[who] + " lays",
      options: mine.map((cc) => opt(cc, (cc.t === "bid" ? "+" : "−") + cc.good,
        { category: "bid", subject: { power: who, good: cc.good } })) });
    for (const cc of only("stand"))
      panels.push({ kind: "choices", band: "commit", id: "resolve", pick: "act", label: "",
        options: [opt(cc, "Stand", { category: "terminal", rank: "primary" })] });
  }

  // ---- leave the table ----
  // calling a raid off belongs with the raid's own resolutions, not here
  const back = ["back", "srcBack", "srcToChoose", "tradeCancel", "cancelActivation", "endActivation"]
    .flatMap((t) => only(t)).map((c) => opt(c, null, { category: "back" }));
  if (back.length) panels.push({ kind: "choices", band: "commit", id: "back", pick: "act", label: "", options: back });

  const turn = ["pass", "forfeit"].flatMap((t) => only(t))
    .map((c) => opt(c, null, { category: c.t === "forfeit" ? "danger" : "aside" }));
  if (turn.length) panels.push({ kind: "choices", band: "turn", id: "turn", pick: "act", label: "", options: turn });

  // THE CHRONICLE. Its own band, because it is not drawn in the column — the shell places it,
  // the way the board places the map. A floating dialog on a desk, folded into the sheet on a
  // phone; both read the same panel. `fresh` marks the line that has just landed, which is a
  // fact about the record; that the table draws the rest at 70% opacity is its reading of it.
  panels.push({ kind: "chronicle", band: "chronicle", id: "chronicle",
    lines: g.log.map((text, i) => ({ text, fresh: i === 0 })) });

  return {
    seat: p,
    effectiveSeat: effectiveSeat(g),
    round: g.round,
    chain: g.chain,          // stamp a command against the view it was chosen from
    step: g.step,            // see THE STEP — compare it, never read it
    mapOnly: mapOnlyStep(g), // the board is the workplace; a phone may drop the panel to a peek
    panels,
  };
}

// ============================== THE CHAIN ==============================
// Every accepted command advances a hash of the COMMAND HISTORY:
//     chain' = H(chain, key(cmd))
// It is not a hash of the state. Chaining the history is cheaper, deterministic, free of
// key-order hazards, and strictly stronger for the job: it detects that SOMETHING HAPPENED
// even where the resulting state coincidentally matches.
//
// WHY IT EXISTS. A command may remain legal while its MEANING changes. `{"t":"region",
// "rid":"NIP"}` is legal under `build` and under `entreat` — one raises a building, the
// other sends an embassy — and the command itself says nothing about which. validCmd
// passes it either way. Only a stamp taken when the command was CHOSEN can tell that the
// world it was chosen for is gone.
//
// THE PROTOCOL. Whoever issues a command carries the chain of the world it was written
// against. The gate refuses it if the world has moved since. Seat changes need no special
// handling: a seat change is itself the result of a command, so it advances the chain.
//
// A command that is REFUSED does not advance the chain — otherwise one bad word would
// invalidate every other agent's work in flight.
//
// COST, accepted deliberately: every accepted command advances the chain, including ones
// nobody cares about. An in-flight answer can be invalidated by something inconsequential.
// The alternative — deciding which commands "count" — is a judgement call that would drift
// and rot. Being over-conservative costs one retry; getting the exemption list wrong costs
// correctness.
function advanceChain(chain, cmd) {
  const s = String(chain) + "|" + cmdKey(cmd);
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
  return x.toString(16).padStart(8, "0");
}

// ======================= THE FINGERPRINT =======================
// TWO DIGESTS, TWO QUESTIONS. Keep them apart or they will be used for each other's job:
//
//   g.chain        hashes the COMMAND STREAM  → "is this the same trajectory?"
//   fingerprint(g) hashes the WORLD           → "is this the same position?"
//
// Three gifts may be chosen in any order and two producers tapped in either: the command
// streams differ, the position does not. So the hash is route-DEPENDENT by design — that is
// what makes it catch a stale command — and the fingerprint is route-INDEPENDENT, which is
// what makes it recognise that two ways round arrived at the same board.
//
// EVERYTHING IN THE STATE IS THE WORLD, and stays serialised with it. NOT_THE_WORLD is the
// only exception, and it holds exactly the fields that record HOW the world was reached rather
// than where the pieces stand: `log` narrates it, `chain` digests the command stream, `step`
// counts the interaction's boundaries. Including any of the three would make the fingerprint
// route-dependent, which is the one thing it must not be.
//
// The exclusion lives HERE, in one list, and nowhere else — so a field added tomorrow is part
// of the world unless somebody deliberately says otherwise. That is the safe default: an
// over-sensitive fingerprint is noisy and obvious, an under-sensitive one quietly reports that
// two different boards are the same. The claim is checked, not asserted —
// harness/engine/test-hash.js wipes the excluded fields across thousands of states and confirms
// the legal moves never change.
//
// ONE CAVEAT, worth knowing before relying on it. Mid-action the mode holds scratch —
// `gifts` is an array holding a set, `taps` likewise — so two routes that have chosen the
// same things in a different order can fingerprint differently UNTIL the action closes and
// the scratch is cleared. Sorting them here would be wrong: other arrays in the state are
// genuine sequences (a contest's bidding order is not a set). So the fingerprint is exact
// at ACTION BOUNDARIES, which is where every user of it compares.
const NOT_THE_WORLD = ["log", "chain", "step"];
function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}
function fingerprint(g) {
  const s = canonical(Object.fromEntries(Object.entries(g).filter(([k]) => !NOT_THE_WORLD.includes(k))));
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
  return x.toString(16).padStart(8, "0");
}

// THE GATE. dispatch is the whole API — the UI, a test, an AI and a network peer all arrive
// here — so it must be TOTAL: any command, in any state, is either carried out or refused,
// never a crash. Rather than scatter null-checks through thirty cases, one gate asks the
// command layer whether this command is on offer at all.
//
// IT ASKS ABOUT EVERY COMMAND, with no exemptions, and there must not be any. An exemption list
// does not buy safety — it lets exempt commands ignore the rules, measurably and in the large.
// The one backstop it provides (exits vanishing from the menu wedging an activation) is
// asserted in test-commands.js instead, which holds the menu to being right rather than
// patching for it being wrong. The table needs no exemption either: it has ONE dispatch site
// and ships `view`'s own commands verbatim, so it never issues anything off-menu.
function dispatch(g, cmd) {
  if (!cmd || typeof cmd.t !== "string") { g.log.unshift("A command arrives malformed and is set aside."); return g; }
  // STALE: written against a world that no longer exists. Checked only when a stamp is
  // present, so replays and tests may dispatch bare commands.
  if (cmd.chain !== undefined && cmd.chain !== g.chain) {
    g.log.unshift("That word arrives too late — the world has moved since it was written.");
    return g;
  }
  if (!validCmd(g, cmd)) {
    g.log.unshift(`That is not on offer now: ${cmd.t}${cmd.rid ? " " + cmd.rid : ""}.`);
    return g;
  }
  // READ THE STEP BEFORE APPLYING. applyCommand mutates in place and returns the SAME object —
  // callers clone before they dispatch — so a stepKey(g) read taken afterwards would compare the
  // new state to itself and the counter would never move. Nothing would catch that: a counter
  // wedged at 0 is still a number, and every assertion about its type still passes.
  const wasStep = stepKey(g);
  const out = applyCommand(g, cmd);
  out.chain = advanceChain(g.chain, cmd);      // accepted: the world moves on
  out.step = g.step + (wasStep === stepKey(out) ? 0 : 1);
  return out;
}

// ======================== THE STEP ========================
// A COUNTER, NOT A VALUE. It increments when the interaction crosses a boundary — an activation
// opens or closes, the errand changes, a target gets named, a sourcing phase turns over, a raid
// strikes, the desk passes — and holds still for everything inside one of those.
//
// The only legal use is `!==` against the value you saw last. It carries no information beyond
// "different", which is deliberate: an interface that could read WHICH step this is would be
// reading the engine's vocabulary, and deciding things from it, which is the whole failure `view`
// exists to prevent. The signature below never leaves this file; only the integer does.
//
// WHY NOT USE `chain`? Because the chain advances on EVERY accepted command, including the ones
// well inside a step — laying a third gift, adding a tap. An interface that re-arranged itself
// on those would be unusable. The step is deliberately coarser.
//
// It cannot be derived by `view`, which is a pure function of one state: counting needs to know
// what came before. So it lives on the state and `dispatch` maintains it, exactly as with the
// chain — and like the chain it is excluded from the fingerprint.
// `mapOnlyStep` is folded in deliberately. It is a richer function of the state than the fields
// above — it also depends on who has passed and on whether the seat still holds a palace — so
// without it the board could stop being the workplace while the counter held still, and an
// interface watching the step would not re-arrange for a layout that had genuinely changed.
// If the answer to "is the board where the work is" changes, that is a step boundary.
const stepKey = (g) => [
  !!g.act, g.act ? g.act.capLeft : "-",
  g.mode ? g.mode.v : "-", g.mode && g.mode.region ? "r" : "", (g.mode && g.mode.phase) || "",
  g.shortfall ? "s" : "", g.raid ? "raid" + g.raid.strikes : "",
  g.contest ? "c" + g.contest.idx : "", effectiveSeat(g), mapOnlyStep(g),
].join("|");
// Everything below is the command itself. It never sees the stamp.
function applyCommand(g, cmd) {
  const p = g.turn;
  // Interrupts must be answered before anything else — the engine enforces what the UI implies.
  if (g.shortfall && cmd.t !== "perish") { g.log.unshift("Famine: abandonments must be chosen first."); return g; }
  switch (cmd.t) {
    case "activate": if (!g.act) beginActivation(g, cmd.rid, cmd.i); return g;
    case "verb": if (g.act) g.mode = { v: cmd.v }; return g;
    // set down the errand. Nothing has been spent — the cost is paid at the source step —
    // so this only forgets what was picked, and the command is not consumed.
    case "back": if (g.act) { g.mode = null; g.log.unshift(`${PNAME[p]} sets the matter aside.`); } return g;
    case "cancelActivation": {
      if (!g.act || !g.act.palIdx) return g;
      const [r, i] = g.act.palIdx;
      g.b[r][i].tap = false; g.act = null; g.mode = null;
      g.log.unshift(`${PNAME[p]} thinks better of it — the activation is undone.`);
      return g;
    }
    case "region": clickRegion(g, cmd.rid); return g;
    case "slot": clickSlot(g, cmd.rid, cmd.i); return g;
    case "buildType": if (g.mode && g.mode.v === "build" && g.mode.region) placeBuild(g, cmd.bt); return g;
    case "srcStock": {
      const spec = specOf(g.mode);
      if (spec.pay === "fixed") {
        costStockPayFixed(g, p, spec);
        g.mode.paid = GOODS.flatMap((t) => Array(spec.need[t] || 0).fill(t));
        g.log.unshift(`${PNAME[p]} pays ${costCaption(spec, g.mode)} from the stockpile.`);
        finishSourcing(g);
      } else g.mode.phase = "stock";
      return g;
    }
    case "srcStockUnit": sourceStockUnit(g, cmd.good); return g;
    // back to the sponsors. The basket of gifts is scratch for the purse and is set down with
    // it — nothing has left the stores, and the choose phase pays off the land, not the store.
    // The mode check is belt-and-braces given the gate above, and is kept deliberately: a case
    // that guards its own ground cannot be re-broken by the gate changing its mind. Without it,
    // `g.mode.phase = …` on a state with no mode throws.
    case "srcToChoose":
      if (!g.mode || g.mode.v !== "source") return g;
      g.mode.phase = "choose";
      if (g.mode.gifts) g.mode.gifts = [];
      return g;
    case "srcBack": {
      const mm = g.mode;
      g.mode = mm.kind === "trade" ? { v: "trade" } : mm.kind === "entreat" ? { v: "entreat" } : { v: "build", region: mm.region };
      return g;
    }
    case "giftToggle": {
      const gl = g.mode.gifts;
      g.mode.gifts = gl.includes(cmd.good) ? gl.filter((x) => x !== cmd.good) : [...gl, cmd.good];
      return g;
    }
    case "giftSend": sourceStockGifts(g); return g;
    case "commitTaps": commitSourceTaps(g); return g;
    case "tradeCancel": {
      const [r, i] = g.act.market || g.act.port;
      g.b[r][i].tap = false; g.act = null; g.mode = null;
      g.log.unshift(`${PNAME[p]}'s market closes without a deal — the tap is undone.`);
      return g;
    }
    case "bid": contestLay(g, cmd.pid, cmd.good, false); return g;
    case "bidTake": contestLay(g, cmd.pid, cmd.good, true); return g;
    case "launch": launchRaid(g); return g;
    case "calloff": {
      const ct = g.contest;
      if (!ct || ct.binding) { g.log.unshift("Nothing can be called off now — what was laid down stays."); return g; }
      if (g.raid) for (const c of [...g.raid.atk]) { if (c.fixed) { g.raid.atk.splice(g.raid.atk.indexOf(c), 1); continue; } uncommitUnit(g, "atk", c.rid, c.i); }
      contestRefund(g, contestPartyOf(g, ct.opener), ct.opener);
      g.raid = null; g.contest = null; g.mode = null;
      g.log.unshift(`${PNAME[ct.opener]} calls it off; all payments are returned.`);
      return g;
    }
    case "stand": {
      const c = g.contest;
      if (c && c.kind === "subvert") {
        if (c.idx < c.turnOrder.length - 1) { c.idx++; g.log.unshift(`${PNAME[contestActor(g)]} is heard next in ${R[c.rid].n}.`); }
        else resolveSubversion(g);
        return g;
      }
      nextDefender(g); return g;
    }
    case "endRaid": if (g.raid) endRaid(g); return g;
    case "endActivation": endActivation(g); return g;
    case "pass": {
      g.passed[p] = true; g.confirmForfeit = null;
      g.log.unshift(`${PNAME[p]} passes.`);
      if (!live(g).every((q) => g.passed[q])) g.turn = nextPlayer(g, p);
      return g;
    }
    // FORFEIT TAKES TWO WORDS, and it is the only command that does: the first arms it, the
    // second carries it out, and any `pass` disarms it. The confirmation lives HERE rather than
    // in a dialog for the usual reason — a guard that only exists in the interface guards
    // nothing that comes through `dispatch`. Note that `availableCommands` offers the same
    // `{t:"forfeit"}` either way, so a caller cannot tell the arming word from the fatal one:
    // anything driving the game must track `confirmForfeit` itself, or send `pass` to be safe.
    // TODO: `forfeit` cannot be told apart from its own confirmation — a real gap the moment
    // anything but the hot seat drives this.
    case "forfeit": {
      if (g.confirmForfeit === p) { forfeit(g, p); g.confirmForfeit = null; }
      else g.confirmForfeit = p;
      return g;
    }
    case "restoreCourt": {
      const capR = HOME[p];
      const idx = g.b[capR].findIndex((sl) => sl === null);
      if (idx >= 0) { g.b[capR][idx] = { t: "palace", o: p, tap: true }; g.log.unshift(`${PNAME[p]} restores the court in ${R[capR].n} (tapped until next round).`); }
      else g.log.unshift("No open ground in the home region.");
      return g;
    }
    case "resolveUpkeep": g.log.unshift("— Upkeep —"); runUpkeep(g, live(g)[0]); return g;
    case "perish": perish(g, cmd.rid, cmd.i); return g;
    default: g.log.unshift(`Unknown command: ${cmd.t}`); return g;
  }
}
// ---- the command layer's interface: enumeration, description, validation ----
// The identity of a command. It MUST name every field that changes what the command does. Omit
// one and two different commands share an identity: `validCmd` cannot tell them apart, and the
// chain advances identically for both, so a stale command differing only in that field is
// accepted. Adding a field to a command means adding it here.
function cmdKey(c) {
  return [c.t, c.rid ?? "", c.i ?? "", c.v ?? "", c.bt ?? "", c.side ?? "", c.good ?? "", c.pid ?? ""].join("|");
}
function validCmd(g, cmd) {
  const avail = availableCommands(g);
  return avail.some((c) => cmdKey(c) === cmdKey(cmd));
}
// `av` is the menu this refusal is judged against. It defaults to the live one; a caller
// that has already walked the menu — `view`, writing a `why` onto every province out of
// reach — passes its own rather than walking it again per region.
function rejectReason(g, cmd, av) {
  const avail = av || availableCommands(g);
  const types = [...new Set(avail.map((c) => c.t))];
  if (cmd.t === "buildType" && g.mode && g.mode.region) {
    const legal = legalBuildTypes(g);
    return `${R[g.mode.region].n} offers only: ${legal.length ? legal.join(", ") : "nothing (no open ground you may build on)"} — "${cmd.bt}" cannot rise there (site missing or occupied, or not permitted)`;
  }
  if (cmd.t === "giftSend") return "no gifts are selected yet — giftToggle at least one good first";
  if (cmd.t === "commitTaps") return "no taps are selected, or the selection does not cover the cost. First select producers with slot commands from LEGAL COMMANDS until their yields cover the bill, THEN commitTaps — or pay from the purse with srcStock instead";
  if (cmd.t === "srcStock") return "your stores cannot cover this cost — tap producers instead";
  if (cmd.t === "activate") {
    const bd = g.b[cmd.rid] && g.b[cmd.rid][cmd.i];
    if (!bd) return "no building stands there";
    if (bd.tap) return `the ${BT[bd.t].name.toLowerCase()} of ${((R[cmd.rid] || {}).n || String(cmd.rid))} is already tapped this round`;
    if (g.act) return "an activation is already in progress — finish or endActivation first";
    return "that building cannot open an activation now (a trade seat needs an affordable source in reach)";
  }
  if (cmd.t === "region" && g.mode && g.mode.v === "entreat" && usedOn(g, g.turn, "entreat", cmd.rid))
    return `${R[cmd.rid] ? ((R[cmd.rid] || {}).n || String(cmd.rid)) : cmd.rid} was already entreated this year`;
  if (cmd.t === "region" && g.mode && g.mode.v === "treaty" && R[cmd.rid]) {
    const rr = g.rel[g.turn] && g.rel[g.turn][cmd.rid];
    if (!rr || rr.s === "none") return `${((R[cmd.rid] || {}).n || String(cmd.rid))} is a stranger — treaty needs Friend standing at 5+ influence`;
    if (rr.s === "friend" && rr.i < 5) return `${((R[cmd.rid] || {}).n || String(cmd.rid))} stands Friend at ${rr.i} — treaty to Ally needs 5+`;
    if (rr.s === "ally" && rr.i < 10) return `${((R[cmd.rid] || {}).n || String(cmd.rid))} stands Ally at ${rr.i} — treaty to Subject needs 10+`;
    if (rr.s === "subject") return `${((R[cmd.rid] || {}).n || String(cmd.rid))} is already your Subject`;
  }
  if (cmd.t === "region") return `${R[cmd.rid] ? ((R[cmd.rid] || {}).n || String(cmd.rid)) : cmd.rid} is not a legal target for "${g.mode && g.mode.v}" (out of range, unreachable, or unaffordable)`;
  if (cmd.t === "verb" && !g.act) return "no activation is open — activate a building first";
  if (cmd.t === "launch") return "no strength is committed — commit at least one unit first";
  return `not offered at this step; the current step offers: ${types.join(", ")}`;
}
function entreatRemark(g, p, rid, nGifts) {
  if (!nGifts) return null;
  const rr = g.rel[p][rid]; if (!rr) return null;
  const cur = rr.i, aft = cur + nGifts, st = rr.s;
  const seatNote = seated(g, p, rid) ? " (and this is your SEAT: −1 flat every upkeep besides)" : "";
  if (st === "none") {
    if (aft >= FLOOR.friend) return `✓ this embassy reaches ${aft} — Friend establishes automatically at the floor: durable, no decay.`;
    return `⚠ WARNING: this embassy lands at ${aft}, BELOW the Friend floor (2) — on a stranger it decays to NOTHING by upkeep. Add a second distinct good, or spend elsewhere.`;
  }
  if (st === "friend") {
    if (aft >= FLOOR.ally) return `✓ this embassy reaches ${aft} — the Ally floor (5) is met: TREATY before upkeep (this activation or a later one this year) to lock it, or the surplus tolls.`;
    return `⚠ WARNING: this embassy lands at ${aft} — short of the Ally floor (5); surplus above 2 decays 1/year (opens next year at ${Math.max(FLOOR.friend, aft - 1)}). Convert it or accept the toll${seatNote}.`;
  }
  if (st === "ally") {
    if (aft >= FLOOR.subject) return `✓ this embassy reaches ${aft} — the Subject floor (10) is met: TREATY before upkeep to lock it.`;
    return `⚠ WARNING: this embassy lands at ${aft} — short of the Subject floor (10); surplus above 5 decays 1/year (opens next year at ${Math.max(FLOOR.ally, aft - 1)})${seatNote}.`;
  }
  return `note: ${R[rid].n} is already your Subject at ${cur}; gifts here only offset the seat's hunger or bank garrison-call surplus${seatNote}.`;
}
function describeCmd(g, c) {
  const nm = (rid) => (R[rid] && R[rid].n) || rid;
  switch (c.t) {
    case "activate": {
      const bd = g.b[c.rid] && g.b[c.rid][c.i];
      const t = bd && bd.t;
      if (t === "market") return `open the market at ${nm(c.rid)} — TRADE overland (buy from a source, pay in goods)`;
      if (t === "port") return `open the port at ${nm(c.rid)} — TRADE quay-to-quay (buy from a Friend+ harbour)`;
      if (t === "palace") return `open the palace at ${nm(c.rid)} — ${capacityOf(g, g.turn, c.rid)} commands: ${PALACE_VERBS.join(", ")}`;
      return `open the ${bd ? BT[t].name.toLowerCase() : "building"} at ${nm(c.rid)}`;
    }
    case "verb": return ({
      build: "BUILD — raise a building (costs 1 food)",
      remove: "REMOVE — pull a building down",
      tax: "LEVY — sweep one province's untapped producers into your stores",
      entreat: "ENTREAT — send an embassy of gifts",
      treaty: "TREATY — climb a relation whose floor is met",
      subvert: "SUBVERT — open a bidding for a province's elite; the winner's own standing there is the weight of the blow",
      raid: "RAID — a land raid",
      searaid: "SEA RAID — the warriors take ship",
    })[c.v] || c.v;
    case "region": {
      const vb = g.mode && g.mode.v ? (g.mode.v === "tax" ? "LEVY" : String(g.mode.v).toUpperCase()) : "TARGET";
      const hp = Object.keys(HOME).find((q) => HOME[q] === c.rid);
      if (hp) return `${vb} ${nm(c.rid)} (${hp === g.turn ? "your HOME" : PNAME[hp] + "'s HOME"})`;
      const rr = g.rel[g.turn] && g.rel[g.turn][c.rid]; return `${vb} ${nm(c.rid)}${rr ? ` (${rr.s === "none" ? "stranger" : rr.s} ${rr.i})` : ""}`;
    }
    case "slot": {
      const bd = g.b[c.rid] && g.b[c.rid][c.i];
      const what = bd ? BT[bd.t].name.toLowerCase() : "building";
      const m = g.mode && g.mode.v;
      // ONE command, read by the moment it arrives in
      if (m === "raidCommit" || m === "raidDef") {
        const side = m === "raidCommit" ? "atk" : "def";
        const on = isCommitted(g, side, c.rid, c.i);
        return `${on ? "RECALL" : "COMMIT"} the ${what} of ${nm(c.rid)} ${on ? "from" : "to"} the field`;
      }
      if (m === "raidStrike") return `strike the ${what} in ${nm(c.rid)}`;
      if (m === "remove") return `pull down the ${what} in ${nm(c.rid)}`;
      const y = bd ? yieldOf(g, c.rid, c.i) : null;
      return `tap the ${what} at ${nm(c.rid)}${y ? ` (${y.n} ${y.good})` : ""} as the source`;
    }
    case "srcStock": return "pay ENTIRELY from your stores";
    case "back": return "set the errand aside — nothing has been spent";
    case "srcBack": return "step back — choose the payment differently";
    case "srcToChoose": return "step back to the sponsors — pay off the land instead of the stores";
    case "commitTaps": return "confirm — the selected taps sponsor the cost";
    case "srcStockUnit": return `pay 1 ${c.good} from your stores`;
    case "giftToggle": { const inG = g.mode && (g.mode.gifts || []).includes(c.good); return `${inG ? "remove" : "add"} ${c.good} ${inG ? "from" : "to"} the embassy's gifts`; }
    case "giftSend": { const n2 = g.mode ? (g.mode.gifts || []).length : 0; return `SEND the embassy${n2 ? ` (${n2} distinct gift${n2 > 1 ? "s" : ""} = +${n2} influence)` : " (EMPTY — achieves nothing)"}`; }
    case "endActivation": return "END the activation — unspent commands are LOST for the year";
    case "cancelActivation": return "cancel — the building's tap is refunded";
    case "tradeCancel": return "close without a deal — the seat's tap is refunded";
    case "buildType": return `build a ${BT[c.bt] ? BT[c.bt].name.toLowerCase() : c.bt}`;
    case "bid": return `lay 1 ${c.good} before the ${nm(c.pid)}`;
    case "bidTake": return `take back 1 ${c.good} from the ${nm(c.pid)}`;
    case "stand": return g.mode && g.mode.v === "subvertBid"
      ? "stand — lay nothing further before the elite; the next power is heard"
      : "finish the muster — the raid resolves";
    case "launch": return "LAUNCH the raid";
    case "calloff": return "call the raid off — payments returned";
    case "endRaid": return "withdraw — end the strikes";
    case "pass": return "PASS this go-around";
    default: return c.t;
  }
}
// What can be done RIGHT NOW — the headless driver's menu. Coarse but complete.
function availableCommands(g) {
  const p = g.turn; const out = [];
  if (g.shortfall) {
    for (const e of works(g, (bd) => bd.o === g.shortfall.p && isCrown(bd))) out.push({ t: "perish", rid: e[0], i: e[1] });
    return out;
  }
  if (live(g).every((q) => g.passed[q])) return [{ t: "resolveUpkeep" }];
  const legal = legalTargets(g);
  for (const key of legal.slots) {
    const [rid, i] = key.split(":");
    const c = { t: g.act || g.raid ? "slot" : "activate", rid, i: +i };
    if (c.t === "activate") c.b = g.b[rid][+i].t; // self-documenting menu: what stands there
    out.push(c);
  }
  for (const rid of legal.regions) {
    const c = { t: "region", rid };
    if (g.mode && ["entreat", "treaty", "subvert"].includes(g.mode.v)) {
      const rr = g.rel[p][rid];
      if (rr) {
        const next = { none: ["Friend", FLOOR.friend], friend: ["Ally", FLOOR.ally], ally: ["Subject", FLOOR.subject] }[rr.s];
        let stx = `you: ${rr.s} ${rr.i}`;
        if (next) {
          const gap = next[1] - rr.i;
          stx += ` · to ${next[0]}: floor ${next[1]}, gap ${Math.max(0, gap)}`;
          if (gap <= 0) stx += " — floor met: a TREATY locks it";
          else if (gap >= 2) stx += ` — a +1 alone is no meaningful progress: bring ${Math.min(4, gap)} distinct goods, or fewer gifts plus same-year trade-warmth (+1 per trade), to close ${gap}`;
        } else stx += " — already your Subject";
        c.standing = stx;
      }
    }
    out.push(c);
  }
  if (!g.act) {
    out.push({ t: "pass" }, { t: "forfeit" });
    if (myPalaces(g, p).length === 0) out.push({ t: "restoreCourt" });
    return out;
  }
  const m = g.mode;
  const verbList = () => verbsOf(g.act);
  if (!m) {
    for (const v of verbList()) out.push({ t: "verb", v });
    out.push({ t: "endActivation" }, { t: "cancelActivation" });
    return out;
  }
  // A COURT MAY ALWAYS SET DOWN WHAT IT HAS PICKED UP. Until a cost is paid nothing has been
  // spent, so an errand can be abandoned — for another verb while no target is named, and out
  // of the errand once one is.
  //
  // THIS IS THE ONLY THING standing between a court and a wedged activation: nothing bypasses
  // the gate, so an exit missing from the menu is an exit that does not exist. Never make a way
  // out conditional on how far into an errand the court has got. test-commands.js holds it.
  const targeting = ["build", "remove", "tax", "entreat", "treaty", "subvert", "raid", "searaid"].includes(m.v);
  if (g.act && targeting && !g.raid && !g.contest) {
    if (!m.region) {
      for (const v of verbList()) if (v !== m.v) out.push({ t: "verb", v });
      out.push({ t: "back" });           // nothing named yet: set the errand down
    } else {
      out.push({ t: "back" });           // a target is named: step out of the errand, not sideways
    }
  }
  if (g.act && !g.raid && !g.contest) out.push({ t: "endActivation" });
  if (m.v === "source") {
    if (m.phase === "choose") {
      if (stockCovers(g, p, m) && !(m.taps || []).length) out.push({ t: "srcStock" });
      // …and only once the selection actually PAYS the bill. `costTakePaid` decrements the goods
      // the spec names, so settling an uncovered bill would decrement goods that were never in
      // the basket — a pottery workshop paying for a food. Greying the button is not enough: the
      // gate is what every caller through `dispatch` obeys.
      if ((m.taps || []).length && costTapCovered(specOf(m), m, tapYields(g, m))) out.push({ t: "commitTaps" });
      out.push({ t: "srcBack" });
    } else if (m.kind === "trade") {
      for (const t of GOODS) if (t !== m.extracted && g.players[p].stock[t] > 0) out.push({ t: "srcStockUnit", good: t });
      // …and back to the sponsors, but only while nothing has been laid: a unit paid here is
      // GONE, and stepping back afterwards would offer to settle a bill already part-settled.
      if (!(m.paid || []).length) out.push({ t: "srcToChoose" });
    } else {
      for (const t of GOODS) if (g.players[p].stock[t] > 0) out.push({ t: "giftToggle", good: t });
      if ((m.gifts || []).length) out.push({ t: "giftSend" });
      out.push({ t: "srcToChoose" });   // gifts are only promised until they are sent
    }
  }
  if (m.v === "build" && m.region) for (const bt of legalBuildTypes(g)) out.push({ t: "buildType", bt });
  if (m.v === "trade" && (g.act.market || g.act.port)) out.push({ t: "tradeCancel" });
  if (m.v === "raidCommit") {
    for (const pp of biddablePeoples(g)) for (const gd of GOODS) {
      if (g.players[p].stock[gd] > 0) out.push({ t: "bid", pid: pp.pid, good: gd });
      const bb = g.contest && g.contest.lots[pp.pid] && g.contest.lots[pp.pid].atk;
      if (bb && bb[gd] > 0) out.push({ t: "bidTake", pid: pp.pid, good: gd });
    }
    if (raidStrength(g) > 0) out.push({ t: "launch" });
  }
  if (m.v === "raidDef") {
    const q = currentDefender(g);
    for (const pp of biddablePeoples(g)) for (const gd of GOODS) {
      if (q && g.players[q].stock[gd] > 0) out.push({ t: "bid", pid: pp.pid, good: gd });
      const bb = g.contest && g.contest.lots[pp.pid] && g.contest.lots[pp.pid].def;
      if (bb && bb[gd] > 0) out.push({ t: "bidTake", pid: pp.pid, good: gd });
    }
    out.push({ t: "stand" });
  }
  if (g.contest && !g.contest.binding && contestActor(g) === g.turn) out.push({ t: "calloff" });
  if (m.v === "subvertBid" && g.contest) {
    const who = contestActor(g), lot = g.contest.rid;
    for (const gd of GOODS) {
      if (who && g.players[who].stock[gd] > 0) out.push({ t: "bid", pid: lot, good: gd });
      const b = g.contest.lots[lot] && g.contest.lots[lot][who];
      if (b && b[gd] > 0) out.push({ t: "bidTake", pid: lot, good: gd });
    }
    out.push({ t: "stand" });
  }
  if (m.v === "raidStrike") out.push({ t: "endRaid" });
  return out;
}
// ===============================================================================
function endActivation(g) {
  g.log.unshift(`${PNAME[g.turn]} ends the activation.`);
  g.act = null; g.mode = null;
  g.passed[g.turn] = false;
  g.turn = nextPlayer(g, g.turn);
}

function clickRegion(g, rid) {
  const p = g.turn;
  const legal = legalTargets(g);
  if (!legal.regions.has(rid)) return;
  const m = g.mode;
  const spec = ACTIONS[m.v];
  if (spec && spec.commit) return spec.commit(g, p, rid, m);
}

function raidStrength(g) { return g.raid.atk.filter((c) => c.terms !== "hire").length; }
// Every power holding Friend-or-better in the target is a defender. They muster one at a time,
// LOWEST influence first — so the power with most at stake speaks last, seeing everything.
// Ties fall to turn order. Each pays from its own stores; their strengths and their gift-baskets sum.
function defendersOf(g, t, attacker) {
  const order = PLAYERS;
  return live(g)
    .filter((q) => q !== attacker && rank(g, q, t) >= 1)
    .sort((a, b) => (infOf(g, a, t) - infOf(g, b, t)) || (order.indexOf(a) - order.indexOf(b)));
}
function effectiveSeat(g) {
  if (g.shortfall) return g.shortfall.p;
  if (g.raid && g.mode && g.mode.v === "raidDef") { const d = currentDefender(g); if (d) return d; }
  if (g.mode && g.mode.v === "subvertBid") { const a = contestActor(g); if (a) return a; }
  return g.turn;
}
// the raid's defenders are simply the contest's participants after the opener — there is one
// cursor, and these read it rather than keeping a second copy in step with it
function currentDefender(g) {
  const c = g.contest;
  if (!g.raid || !c || c.kind !== "raid" || c.idx < 1) return null;
  return contestActor(g);
}
function launchRaid(g) {
  const p = g.turn;
  const t = g.raid.t;
  // the sword is drawn: courtship ends, win or lose
  if (g.rel[p] && g.rel[p][t]) { setStatus(g, p, t, "none"); g.rel[p][t].i = 0; g.rel[p][t].strained = false; g.log.unshift(`${PNAME[p]}'s goodwill in ${R[t].n} burns as the raiders march.`); }
  for (const q of foremostIn(g, t, p)) {
    g.rel[q][t].i = Math.max(0, g.rel[q][t].i - 1);
    g.log.unshift(`${PNAME[q]}'s protection of ${R[t].n} is tested: −1 influence (now ${g.rel[q][t].i}).`);
  }
  g.contest.binding = true;            // the sword is drawn: nothing laid may be taken back
  const defs = defendersOf(g, t, p);
  g.contest.turnOrder = [p, ...defs];      // the opener has had their turn; the defence follows
  g.contest.idx = 1;
  for (const q of defs) g.contest.party[q] = "def";
  if (defs.length) {
    g.mode = { v: "raidDef" };
    const names = defs.map((q) => `${PNAME[q]} (${infOf(g, q, t)})`).join(", then ");
    g.log.unshift(`${PNAME[p]} launches with strength ${raidStrength(g)}. Protectors of ${R[t].n} muster in turn — ${names}.`);
    autoMuster(g);
    return;
  }
  // no protector: the region's own militia stands alone, committing exactly what is needed
  const own = battleUnits(g, p === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0], t, "def", g.raid.mode).filter((u) => u.terms === "militia");
  const need = Math.min(Math.max(0, raidStrength(g) - fortressDef(g, p, t)), own.length);
  for (let k = 0; k < need; k++) commitUnit(g, "def", own[k], null);
  if (need) g.log.unshift(`${R[t].n}'s militia stands alone: ${need} garrison(s).`);
  resolveRaid(g);
}
function autoMuster(g) {
  const q = currentDefender(g); if (!q) return;
  const t = g.raid.t;
  const walls = fortressDef(g, g.turn, t);
  let D = g.raid.defC.filter((c) => c.terms !== "hire").length + walls;
  const need = raidStrength(g);
  const pool = battleUnits(g, q, t, "def", g.raid.mode).filter((u) => u.terms === "own");
  let added = 0;
  for (const u of pool) { if (D >= need) break; commitUnit(g, "def", u, null); D++; added++; }
  g.log.unshift(`${PNAME[q]} musters what the hour requires — ${added} unit(s) tap and take the field; the defence stands at ${D}${walls ? ` (walls ${walls})` : ""} against ${need}.`);
}
function nextDefender(g) {
  const c = g.contest;
  if (c && c.idx < c.turnOrder.length - 1) {
    c.idx++;
    g.log.unshift(`${PNAME[currentDefender(g)]} now musters for ${R[g.raid.t].n}.`);
    autoMuster(g);
    return;
  }
  resolveRaid(g);
}
function resolveRaid(g) {
  const p = g.turn;
  const t = g.raid.t;
  // TODO: vestigial fields — battleUnits never sets `deny`, so `!c.deny` filters nothing. A
  // unit that takes the field but does not count needs a rule.
  let A = raidStrength(g), D = g.raid.defC.filter((c) => c.terms !== "hire" && !c.deny).length;
  const ft = fortressDef(g, p, t);
  if (ft) { D += ft; g.log.unshift(`The walls of ${R[t].n} stand in the defense (+${ft}, never tiring).`); }
  const lots = (g.contest && g.contest.lots) || {};
  for (const pid of Object.keys(lots)) {
    const book = lots[pid] || {};
    if (!Object.keys(book).some((k) => Object.keys(book[k] || {}).length)) continue;
    const winner = contestWinner(g, pid);
    const info = biddablePeoples(g).find((x) => x.pid === pid) || {};
    if (!winner) { g.log.unshift(`The ${R[pid].n} weigh the rival gifts, find no clear master, and keep to their hills. Everything offered stays with them.`); continue; }
    if (winner === "def" && info.seafarer) { g.log.unshift(`${PNAME[currentDefender(g) || p]} buys the ${R[pid].n} off — they take the gifts and sail home. Danegeld.`); continue; }
    const bandI = g.b[pid].findIndex((bd) => bd && BT[bd.t].unit && !bd.tap);
    if (bandI >= 0) g.b[pid][bandI].tap = true;
    if (winner === "atk") A += 1; else D += 1;
    g.log.unshift(`One warband of the ${R[pid].n} takes the gifts and joins the ${winner === "atk" ? "raiders" : "defence"}. The rest of the offerings stay in their hills.`);
  }
  if (A <= D) {
    g.log.unshift(`Raid on ${R[t].n} REPELLED: ${A} against ${D}. The committed forces on both sides stand spent.`);
    g.raid = null; g.contest = null; g.mode = null;
    spend(g);
    return;
  }
  const strikes = Math.min(A - D, hostilesIn(g, p, t).length);
  g.raid.finalA = A; g.raid.finalD = D;
  g.raid.strikes = strikes;
  g.mode = { v: "raidStrike" };
  g.log.unshift(`${PNAME[p]} sweeps ${R[t].n}: ${A} against ${D} — ${strikes} strike(s) won. Choose what suffers.`);
}
function doStrike(g, t, i) {
  const p = g.turn;
  const bd = g.b[t][i];
  if (!bd.tap) {
    bd.tap = true;
    const y = yieldOf(g, t, i);
    if (y) gain(g, p, y.good, y.n, `plunder of the ${BT[bd.t].name.toLowerCase()} in ${R[t].n}`);
    else g.log.unshift(`The ${BT[bd.t].name.toLowerCase()} in ${R[t].n} is overrun and lies idle.`);
  } else {
    g.b[t][i] = null;
    g.log.unshift(`The exhausted ${BT[bd.t].name.toLowerCase()} in ${R[t].n} is torn down and burned.`);
    // the protection was theirs to give: whoever stands foremost here answers for the loss,
    // reckoned afresh for every work torn down
    for (const q of foremostIn(g, t, p)) {
      g.rel[q][t].i = Math.max(0, g.rel[q][t].i - 2);
      g.log.unshift(`${PNAME[q]} is shamed by the loss: −2 influence in ${R[t].n} (now ${g.rel[q][t].i}).`);
    }
  }
  g.raid.strikes--;
  if (g.raid.strikes <= 0 || hostilesIn(g, p, t).length === 0) endRaid(g);
}
function endRaid(g) {
  g.log.unshift(`The raiders of ${PNAME[g.turn]} withdraw from ${R[g.raid.t].n}.`);
  g.raid = null; g.contest = null; g.mode = null;
  spend(g);
}


function clickSlot(g, rid, i) {
  if (!g.act) { beginActivation(g, rid, i); return; }
  const p = g.turn;
  const legal = legalTargets(g);
  if (!legal.slots.has(rid + ":" + i)) return;
  const m = g.mode;
  if (m.v === "raidCommit" || m.v === "raidDef") {
    toggleUnit(g, m.v === "raidCommit" ? "atk" : "def", rid, i);
    return;
  }
  if (m.v === "raidStrike") { doStrike(g, rid, i); return; }
  if (m.v === "remove") {
    const bd = g.b[rid][i];
    g.b[rid][i] = null;
    g.log.unshift(`${PNAME[p]} pulls down the ${BT[bd.t].name.toLowerCase()} in ${R[rid].n}; the ground is cleared.`);
    if (BT[bd.t].annex && g.rel[p] && g.rel[p][rid]) {
      g.rel[p][rid].i = Math.max(0, g.rel[p][rid].i - 2);
      g.log.unshift(`Dismissing the governor's household angers ${R[rid].n}: −2 ${PNAME[p]} influence (now ${g.rel[p][rid].i}).`);
    }
    spend(g);
    return;
  }
  if (m.v === "source") {
    const bd = g.b[rid][i];
    if (m.phase === "choose" && (yieldOf(g, rid, i) || (bd && BT[bd.t].issues))) toggleSourceTap(g, rid, i);
    return;
  }
  if (m.v === "trade" && !m.src) {
    const y = yieldOf(g, rid, i);
    g.mode = { v: "source", kind: "trade", src: [rid, i], actor: tradeSeat(g), need: y.n, extracted: y.good, phase: "choose", paid: [] };
    return;
  }
}

// Selecting a sponsor. ONE DOOR: a sponsor is chosen only by `slot`, so `availableCommands`
// decides what may come through. A second spelling of the same act — a command the panel sends
// where the map sends `slot` — arrives without that gate, and then the only thing standing
// between a player and tapping a warrior in someone else's province is the panel's own filter.
function toggleSourceTap(g, rid, i) {
  const m = g.mode;
  m.taps = m.taps || [];
  const k = m.taps.findIndex(([r2, i2]) => r2 === rid && i2 === i);
  if (k >= 0) { m.taps.splice(k, 1); if (!m.taps.length) m.tapRegion = null; return; }
  if (m.tapRegion && m.tapRegion !== rid) return; // one province sponsors the action
  m.tapRegion = rid;
  m.taps.push([rid, i]);
}
function commitSourceTaps(g) {
  const p = g.turn; const m = g.mode;
  if (m.kind === "trade") m.flavor = "provision";
  const yields = { food: 0, bronze: 0, cloth: 0, pottery: 0 };
  for (const [rid, i] of m.taps) {
    g.b[rid][i].tap = true;
    const bd = g.b[rid][i];
    if (BT[bd.t].issues) {
      const gd = BT[bd.t].issues;
      if (g.players[p].stock[gd] > 0) { g.players[p].stock[gd]--; yields[gd] += 1; g.log.unshift(`The ${BT[bd.t].name.toLowerCase()} of ${R[rid].n} issues 1 ${gd} from the stores.`); }
    } else {
      const y = yieldOf(g, rid, i); yields[y.good] += y.n;
    }
  }
  m.paid = costTakePaid(specOf(m), m, yields);
  // WASTE IS INHERENT, and the chronicle must say so plainly. A producer's yield cannot be
  // split, so whatever the bill did not need is simply gone — not banked, not refunded, not
  // held by anyone. Wording that suggests the surplus is kept somewhere ("stays with the
  // province") reads as a rule about storage, and invites bug reports against the economy
  // working correctly.
  const spill = GOODS.filter((t) => yields[t] > 0);
  g.log.unshift(`${R[m.tapRegion].n} sponsors the ${m.kind}: ${m.paid.join(", ")}${spill.length ? "; the rest of the yield goes to waste" : ""}.`);
  finishSourcing(g);
}
function stockCovers(g, p, m) { return costStockCovers(specOf(m), m, g.players[p].stock); }
function sourceStockUnit(g, t) {
  const p = g.turn; const m = g.mode;
  m.flavor = "treasury";
  g.players[p].stock[t]--;
  m.paid.push(t);
  g.log.unshift(`${PNAME[p]} pays 1 ${t} from the stockpile.`);
  if (m.paid.length >= m.need) finishSourcing(g);
}
function sourceStockGifts(g) {
  const p = g.turn; const m = g.mode;
  for (const t of m.gifts) g.players[p].stock[t]--;
  m.paid = [...m.gifts];
  g.log.unshift(`${PNAME[p]} pays ${m.paid.join(", ")} from the stockpile (embassy gifts).`);
  finishSourcing(g);
}
function finishSourcing(g) {
  const p = g.turn; const m = g.mode;
  if (m.kind === "build") { executeBuild(g); return; }
  if (m.kind === "trade") {
    const mr = tradeSeat(g);
    const [sr, si] = m.src;
    const y = yieldOf(g, sr, si);
    const srcBd = g.b[sr][si];
    srcBd.tap = true;
    let seller = null;
    if (PLAYERS.includes(srcBd.o)) seller = srcBd.o;
    else seller = live(g).find((q) => rank(g, q, sr) >= 3) || null;
    for (const t of m.paid) {
      if (seller && seller !== p) gain(g, seller, t, 1, "trade payment received");
      else if (seller === p) { g.players[p].stock[t]++; g.log.unshift(`Domestic trade: 1 ${t} returns to ${PNAME[p]}'s own stores.`); }
      else g.log.unshift(`${R[sr].n} absorbs the payment (1 ${t}).`);
    }
    gain(g, p, y.good, y.n, `${m.flavor === "provision" ? "trade paid by taps" : "trade paid from stores"} — ${R[sr].n}`);
    if (g.rel[p] && g.rel[p][sr] && rank(g, p, sr) < 3) {
      g.rel[p][sr].i += 1;
      let tmsg = `Commerce warms relations: +1 ${PNAME[p]} influence in ${R[sr].n} (now ${g.rel[p][sr].i}).`;
      if (g.rel[p][sr].s === "none" && g.rel[p][sr].i >= FLOOR.friend) { setStatus(g, p, sr, "friend"); tmsg += " Ties are established."; }
      g.log.unshift(tmsg);
    }
    g.log.unshift(`${PNAME[p]}'s market of ${R[mr].n} closes the deal.`);
    g.act = null; g.mode = null;
    g.passed[p] = false;
    g.turn = nextPlayer(g, p);
    return;
  }
  if (m.kind === "entreat") {
    const rid = m.region;
    const amt = m.paid.length;
    markUsed(g, p, "entreat", rid);
    g.rel[p][rid].i += amt;
    let msg = `${PNAME[p]} entreats ${R[rid].n} bearing ${m.paid.join(", ")}: +${amt} influence (now ${g.rel[p][rid].i}).`;
    if (g.rel[p][rid].s === "none" && g.rel[p][rid].i >= FLOOR.friend) {
      setStatus(g, p, rid, "friend");
      msg += ` Ties are established.`;
    }
    g.log.unshift(msg);
    spend(g);
    return;
  }
}
function legalBuildTypes(g) {
  const rid = g.mode.region;
  const p = g.turn;
  const palR = g.act.palace;
  const rdef = R[rid];
  const slots = g.b[rid];
  const emptyAny = slots.some((s) => s === null);
  const emptyCoast = slots.some((s, i) => s === null && rdef.slots[i].c);
  const emptyRes = (res) => slots.some((s, i) => s === null && rdef.slots[i].res === res);
  const out = [];
  const ordinary = rdist(palR, rid) <= ACTIONS.build.range(g, g.act) && rank(g, p, rid) >= 1;
  if (ordinary) {
    if (rdef.f >= 1 && emptyAny) out.push("farm");
    if (emptyAny) out.push("market", "granary", "garrison");
    if (emptyCoast) out.push("port");
    if (emptyRes("copper")) out.push("wsB");
    if (emptyRes("cloth")) out.push("wsC");
    if (emptyRes("clay")) out.push("wsP");
  }
  if (!g.act.steward && (rank(g, p, rid) >= 3 || rid === HOME[p]) && emptyAny)
    for (const ax of ["chancery", "stables", "steward", "fortress", "warrior"]) if (!hasAnnex(g, p, rid, ax)) out.push(ax);
  return out;
}
// The work-gang must be fed: every build costs 1 food, sourced by the standard choice —
// from the purse, or by taps from the site's own region or one adjacent (usual rules).
function canFeedBuild(g, p, siteRid) {
  if (g.players[p].stock.food > 0) return true;
  return tapRegionsOf(g, p, siteRid).some((rid) => tapProducers(g, p, rid).some(([, , y]) => y.good === "food"));
}
function buildSlotFor(g, rid, t) {
  const rdef = R[rid]; const slots = g.b[rid];
  const RES_OF = { wsB: "copper", wsC: "cloth", wsP: "clay" };
  if (t === "port") return slots.findIndex((s, i) => s === null && rdef.slots[i].c);
  if (RES_OF[t]) return slots.findIndex((s, i) => s === null && rdef.slots[i].res === RES_OF[t]);
  let idx = slots.findIndex((s, i) => s === null && !rdef.slots[i].c && !rdef.slots[i].res);
  if (idx < 0) idx = slots.findIndex((s) => s === null);
  return idx;
}
function placeBuild(g, t) {
  const rid = g.mode.region;
  if (buildSlotFor(g, rid, t) < 0) { g.log.unshift("No suitable open ground there."); return; }
  g.mode = { v: "source", kind: "build", region: rid, bt: t, actor: rid, phase: "choose", paid: [] };
}
function executeBuild(g) {
  const p = g.turn; const m = g.mode;
  const rid = m.region; const t = m.bt;
  const idx = buildSlotFor(g, rid, t);
  if (idx < 0) { g.log.unshift("No suitable open ground there."); return; }
  g.b[rid][idx] = { t, o: (t === "palace" || BT[t].annex) ? p : rid, tap: true }; // the province keeps what is built on it
  g.log.unshift(`${PNAME[p]} builds a ${BT[t].name.toLowerCase()} in ${R[rid].n} (it stands tapped until next round; the work-gang is fed).`);
  if (BT[t].annex && g.rel[p] && g.rel[p][rid]) {
    g.rel[p][rid].i += 1;
    g.log.unshift(`The new seat flatters ${R[rid].n}: +1 ${PNAME[p]} influence (now ${g.rel[p][rid].i}).`);
  }
  spend(g);
}

// ---- upkeep ----
function runUpkeep(g, startAt) {
  const order = live(g);
  let idx = Math.max(0, order.indexOf(startAt || order[0]));
  for (; idx < order.length; idx++) {
    const p = order[idx];
    const pl = g.players[p];
    const demand = upkeepDue(g, p).food;
    const fed = Math.min(demand, pl.stock.food);
    pl.stock.food -= fed;
    let short = demand - fed;
    g.log.unshift(`${PNAME[p]}: ${demand} mouth(s); ${fed} fed from the stores. (No harvest comes unbidden — grain arrives only by levy or trade.)`);
    if (short > 0) {
      g.shortfall = { p, deficit: short, next: order[idx + 1] || null };
      g.log.unshift(`FAMINE: ${PNAME[p]} must abandon ${short} building(s) — palaces, garrisons, or annexes.`);
      return;
    }
  }
  relationsUpkeep(g);
  finishUpkeep(g);
}
// ---- military primitives ----
// THREE questions, asked once each, of every building on the board:
//   available? — untapped, or the very building whose activation opened this battle
//   reaches?   — a property of the unit TYPE, nothing else
//   on what terms does it join? — free / priced in influence / for hire at auction
function isActingBuilding(g, rid, i) {
  return !!(g.act && g.act.palIdx && g.act.palIdx[0] === rid && g.act.palIdx[1] === i);
}
function available(g, rid, i, bd) {
  return readyB(bd) || isActingBuilding(g, rid, i);
}
function unitReaches(g, p, rid, bd, t) {
  const u = BT[bd.t].unit;
  if (!u) return false;
  return u.reach <= 1 ? rdist(rid, t) <= 1 : overland(g, p, rid, u.reach).has(t);
}
// Every unit that could fight at `t` on side `side` for player `p`, and its terms.
function battleUnits(g, p, t, side, mode) {
  const bySea = mode === "sea" && side === "atk";   // the defender always musters by land
  const out = [];
  if (bySea && !isCoastal(t)) return out;
  for (const rid of Object.keys(g.b))
    g.b[rid].forEach((bd, i) => {
      if (!bd || !available(g, rid, i, bd)) return;
      if (usable(g, p, rid, bd)) {
        if (bySea) {
          if (!BT[bd.t].unit || !BT[bd.t].unit.sea) return;  // only sea-capable units take ship
          const pi = portIn(g, rid);                  // and only from a harbour with a free berth
          if (pi < 0) return;
          out.push({ rid, i, terms: "own", cost: 0, port: pi, fixed: isActingBuilding(g, rid, i) });
        } else if (unitReaches(g, p, rid, bd, t)) {
          out.push({ rid, i, terms: "own", cost: 0, fixed: isActingBuilding(g, rid, i) });
        }
        return;
      }
      if (bd.o !== rid) return; // another power's building never joins you
      if (rid === t) { if (side === "def") out.push({ rid, i, terms: "militia", cost: 0 }); return; }
      const patron = live(g).find((q) => rank(g, q, rid) >= 2);
      if (R[rid].wild) {
        const byLand = unitReaches(g, p, rid, bd, t);
        const seafaring = !!R[rid].sea && mode === "sea" && isCoastal(t);
        if (!byLand && !seafaring) return;
        if (patron) { if (patron === p && byLand && !out.some((o) => o.terms === "allied" && o.rid === rid)) out.push({ rid, i, terms: "allied", cost: 1 }); return; }
        // wild peoples negotiate as PEOPLES at the bidding table, not as unit rows
        return;
      }
      if (!unitReaches(g, p, rid, bd, t)) return;
      if (rank(g, p, rid) >= 2 && !out.some((o) => o.terms === "allied" && o.rid === rid)) out.push({ rid, i, terms: "allied", cost: 1 });
    });
  return out;
}
const callable = (u) => u.terms !== "hire";                     // callable now; hirelings go to auction
function eligibleAttackers(g, p, t, mode) { return battleUnits(g, p, t, "atk", mode).filter(callable); }
// A unit joins a battle by being PAID FOR. That is the only difference between them:
//   own     — no price
//   allied  — 1 influence in its region (free if it is the battlefield itself)
//   hire    — 1 good, which is also the bid: paying for the same people on both sides is the auction
function unitPrice(u) {
  if (u.terms === "allied") return { kind: "influence", n: u.cost };
  if (u.terms === "hire") return { kind: "good" };
  return { kind: "none" };
}
function sideList(g, side) { return side === "atk" ? g.raid.atk : g.raid.defC; }
function sidePlayer(g, side) { return side === "atk" ? g.turn : currentDefender(g); }
function isCommitted(g, side, rid, i) { return sideList(g, side).some((c) => c.rid === rid && c.i === i); }
function commitUnit(g, side, u, good) {
  const who = sidePlayer(g, side);
  const price = unitPrice(u);
  if (price.kind === "influence") {
    if (infOf(g, who, u.rid) < price.n) { g.log.unshift(`${PNAME[who]} has too little standing in ${R[u.rid].n} to call its garrison.`); return; }
    g.rel[who][u.rid].i -= price.n;
  } else if (price.kind === "good") {
    if (!good || g.players[who].stock[good] < 1) return;
    g.players[who].stock[good]--;
  }
  if (u.terms !== "hire") g.b[u.rid][u.i].tap = true; // hirelings tap only if the gifts win them
  if (u.port >= 0 && u.port != null) g.b[u.rid][u.port].tap = true; // one berth per crossing
  sideList(g, side).push({ rid: u.rid, i: u.i, terms: u.terms, paidInf: price.kind === "influence" ? price.n : 0, paidGood: price.kind === "good" ? good : null, fixed: !!u.fixed, port: u.port, deny: !!u.deny, by: who });
  g.log.unshift(
    u.terms === "hire" ? `${PNAME[who]} offers 1 ${good} to a band of ${R[u.rid].n}.`
    : u.terms === "allied" ? `${PNAME[who]} calls the garrison of ${R[u.rid].n} (−${price.n} influence there).`
    : `${PNAME[who] || R[u.rid].n} commits the ${BT[g.b[u.rid][u.i].t].name.toLowerCase()} of ${R[u.rid].n}.`
  );
}
function uncommitUnit(g, side, rid, i) {
  const who = sidePlayer(g, side);
  const list = sideList(g, side);
  const idx = list.findIndex((c) => c.rid === rid && c.i === i);
  if (idx < 0) return;
  const c = list[idx];
  if (c.fixed) return; // the acting building cannot stand itself down
  if (c.by && c.by !== who) return; // another power's commitment is not yours to withdraw
  const payer = c.by || who;
  if (c.paidInf) g.rel[payer][c.rid].i += c.paidInf;
  if (c.paidGood) g.players[payer].stock[c.paidGood]++;
  if (c.terms !== "hire") g.b[c.rid][c.i].tap = false;
  if (c.port >= 0 && c.port != null) g.b[c.rid][c.port].tap = false;
  list.splice(idx, 1);
  g.log.unshift(`${PNAME[who]} stands down the unit of ${R[rid].n}${c.paidInf || c.paidGood ? " (payment refunded)" : ""}.`);
}
// ONE way to put a unit in the field or take it out again: the `slot` command, read by the mode
// it arrives in. Two spellings for one action is one too many — see `toggleSourceTap`.
function toggleUnit(g, side, rid, i, good) {
  if (isCommitted(g, side, rid, i)) { uncommitUnit(g, side, rid, i); return; }
  const who = sidePlayer(g, side);
  const u = battleUnits(g, who, g.raid.t, side, g.raid.mode).find((x) => x.rid === rid && x.i === i);
  if (!u) return;
  if (u.terms === "hire") return; // peoples are bid for at their table, not clicked
  if (u.terms === "allied" && sideList(g, side).some((c) => c.rid === u.rid && c.terms === "allied")) { g.log.unshift(`${R[u.rid].n} answers a call with one band, and no more.`); return; }
  const pick = good || (u.terms === "hire" ? GOODS.filter((t) => g.players[who].stock[t] > 0).sort((a, b) => g.players[who].stock[b] - g.players[who].stock[a])[0] : null);
  commitUnit(g, side, u, pick);
}
function biddablePeoples(g) {
  if (!g.raid) return [];
  const t = g.raid.t, out = [];
  for (const rid of Object.keys(g.b)) {
    if (!R[rid].wild) continue;
    const adj = (ADJ[t] || []).includes(rid);
    const seaf = !!R[rid].sea && g.raid.mode === "sea" && isCoastal(t);
    if (!adj && !seaf) continue;
    let patron = null;
    for (const q of PLAYERS) if (rank(g, q, rid) >= 2) patron = q;
    if (patron) continue; // a patron closes the bidding — their bands answer calls instead
    if (!g.b[rid].some((bd) => bd && BT[bd.t].unit && !bd.tap)) continue;
    out.push({ pid: rid, seafarer: seaf && !adj });
  }
  return out;
}
function fortressDef(g, p, t) {
  let d = 0;
  (g.b[t] || []).forEach((bd) => { if (bd && BT[bd.t].walls && !usable(g, p, t, bd) && !bd.tap) d += BT[bd.t].walls; });
  return d;
}
// ============================== THE CONTEST ==============================
// A CONTEST is the general shape behind every auction at this table: parties lay
// baskets over lots, in sub-turns, and the basket that beats every other in every
// good takes the lot. Only the PAYOUT differs between contests, so only the payout
// reads `kind`. A raid partitions players into two parties (raiders, defence) over
// one lot per wild people; a subversion makes every participant their own party
// over the single lot of the province. Same machinery, different partition.
// `binding` is the commitment point, carried as data rather than implied by a mode: while it
// is false the opener may still withdraw and take their basket back; once true, everything laid
// stays where it lies. A raid opens unbound (assembly is refundable until the launch); a
// subversion is binding from the first word, because opening it IS the act.
function contestOpen(g, kind, rid, turnOrder, party, lotIds, opts) {
  const lots = {};
  for (const l of lotIds) lots[l] = {};
  g.contest = { kind, rid, turnOrder, idx: 0, party, lots,
    opener: (opts && opts.opener) || turnOrder[0] || null,
    binding: !!(opts && opts.binding) };
  return g.contest;
}
function contestActor(g) {
  const c = g.contest;
  return c && c.idx < c.turnOrder.length ? c.turnOrder[c.idx] : null;
}
function contestPartyOf(g, p) {
  const c = g.contest;
  return c ? (c.party[p] ?? null) : null;
}
function contestBasket(g, lot, party) {
  const c = g.contest;
  if (!c || !c.lots[lot]) return null;
  return (c.lots[lot][party] = c.lots[lot][party] || {});
}
// lay one good, or take it back: the goods leave the stores the instant they are laid
function contestLay(g, lot, good, take) {
  const c = g.contest; if (!c) return;
  const who = contestActor(g); if (!who) return;
  const party = contestPartyOf(g, who); if (party == null) return;
  const b = contestBasket(g, lot, party); if (!b) return;
  if (take) {
    if (!(b[good] > 0)) return;
    b[good]--; if (!b[good]) delete b[good];
    g.players[who].stock[good]++;
    g.log.unshift(`${PNAME[who]} takes back 1 ${good} from before the ${R[lot].n}.`);
  } else {
    if (g.players[who].stock[good] < 1) return;
    g.players[who].stock[good]--;
    b[good] = (b[good] || 0) + 1;
    g.log.unshift(`${PNAME[who]} lays 1 ${good} before the ${R[lot].n}.`);
  }
}
// THE BASKET BUYS ACCESS, and one sentence settles every contest: the party whose basket
// matches-or-beats EVERY other in EVERY good, with at least one strict excess, takes the lot.
// Two parties or five, it is the same test — and a tie, which is the common case among many,
// moves nothing at all.
function contestWinner(g, lot) {
  const c = g.contest; if (!c) return null;
  const book = c.lots[lot] || {};
  const parties = Object.keys(book).filter((k) => Object.keys(book[k] || {}).length);
  if (!parties.length) return null;
  const won = parties.filter((a) => parties.every((b) => a === b || bidDominates(book[a], book[b])));
  return won.length === 1 ? won[0] : null;
}
// a party may hold several players (the defence is a coalition), so the hand the goods
// return to is named explicitly rather than inferred from the party.
// THE SUBVERSION resolves the moment the last participant stands: the winner's own
// standing is the weight of the blow, and every other participant is pushed down by it.
function resolveSubversion(g) {
  const c = g.contest, rid = c.rid;
  const win = contestWinner(g, rid);
  if (!win) {
    g.log.unshift(`The elite of ${R[rid].n} weigh the offers, find no clear master, and pocket them all. Nothing moves.`);
  } else {
    const weight = infOf(g, win, rid);
    g.log.unshift(`${PNAME[win]} buys the elite of ${R[rid].n} outright — their standing of ${weight} is the weight of it.`);
    for (const q of c.turnOrder) {
      if (q === win || !g.rel[q] || !g.rel[q][rid]) continue;
      const was = g.rel[q][rid].i;
      g.rel[q][rid].i = Math.max(0, was - weight);
      if (was !== g.rel[q][rid].i) g.log.unshift(`${PNAME[q]}'s standing in ${R[rid].n} is undermined: ${was} → ${g.rel[q][rid].i}.`);
    }
  }
  g.contest = null; g.mode = null;
  spend(g);
}
function contestRefund(g, party, toPlayer) {
  const c = g.contest; if (!c || !g.players[toPlayer]) return;
  for (const lot of Object.keys(c.lots)) {
    const b = c.lots[lot][party]; if (!b) continue;
    for (const gd of Object.keys(b)) g.players[toPlayer].stock[gd] += b[gd];
    delete c.lots[lot][party];
  }
}
function bidDominates(a, b) {
  let geq = true, strict = false;
  for (const t of GOODS) {
    if ((a[t] || 0) < (b[t] || 0)) geq = false;
    if ((a[t] || 0) > (b[t] || 0)) strict = true;
  }
  return geq && strict;
}
function hostilesIn(g, p, t) {
  const out = [];
  (g.b[t] || []).forEach((bd, i) => { if (bd && !usable(g, p, t, bd)) out.push([t, i, bd]); });
  return out;
}
// A province ceases to be yours to govern the moment it ceases to be your Subject:
// the organs of state are turned out, at the usual price of an organ lost.
function evictOrgans(g, p, rid) {
  let n = 0;
  (g.b[rid] || []).forEach((bd, i) => { if (bd && BT[bd.t].annex && bd.o === p) { g.b[rid][i] = null; n++; } });
  if (!n) return 0;
  const rr = g.rel[p] && g.rel[p][rid];
  if (rr) rr.i = Math.max(0, rr.i - 2 * n);
  g.log.unshift(`${R[rid].n} is no longer ${PNAME[p]}'s to govern — ${n} organ(s) of state are turned out${rr ? `: −${2 * n} influence (now ${rr.i})` : ""}.`);
  return n;
}
function setStatus(g, p, rid, next) {
  const rr = g.rel[p] && g.rel[p][rid];
  if (!rr) return;
  const wasSubject = rr.s === "subject";
  rr.s = next;
  if (wasSubject && next !== "subject") evictOrgans(g, p, rid);
}
function seated(g, p, rid) {
  return (g.b[rid] || []).some((bd) => bd && BT[bd.t].annex && bd.o === p);
}
function relationsUpkeep(g) {
  for (const p of live(g)) {
    for (const rid of Object.keys(g.rel[p])) {
      const rr = g.rel[p][rid];
      // decay first: seated provinces demand attention (flat -1); elsewhere only surplus fades
      if (seated(g, p, rid)) {
        if (rr.i > 0) { rr.i--; g.log.unshift(`The governor's court in ${R[rid].n} hungers for ${PNAME[p]}'s attention (−1 influence, now ${rr.i}).`); }
      } else if (rr.i > FLOOR[rr.s]) rr.i--;
      // strain, then fall
      if (rr.i < FLOOR[rr.s]) {
        if (rr.strained) {
          const fallTo = rr.s === "subject" ? "ally" : rr.s === "ally" ? "friend" : "none";
          g.log.unshift(`${PNAME[p]}'s standing in ${R[rid].n} breaks: ${rr.s} → ${fallTo || "stranger"}.`);
          setStatus(g, p, rid, fallTo);
          rr.strained = false;
        } else {
          rr.strained = true;
          g.log.unshift(`${PNAME[p]}'s hold on ${R[rid].n} is STRAINED (${rr.i} < ${FLOOR[rr.s]}) — restore it within a round or it breaks.`);
        }
      } else rr.strained = false;
    }
  }
}
function finishUpkeep(g) {
  // THE RECKONING — grain does not keep. What the Food Store cannot hold spoils.
  for (const q of live(g)) {
    const pl = g.players[q];
    const keep = foodStore(g, q);
    if (pl.stock.food > keep) {
      const lost = pl.stock.food - keep;
      pl.stock.food = keep;
      g.log.unshift(`${PNAME[q]} keeps ${keep} food against the winter; ${lost} spoils for want of a granary.`);
    }
  }
  for (const rid of Object.keys(g.b)) g.b[rid].forEach((bd) => { if (bd) bd.tap = false; });
  g.round++;
  // the first seat rotates with the round, skipping the fallen
  const alive = live(g);
  g.turn = alive[(g.round - 1) % alive.length];
  for (const q of PLAYERS) g.passed[q] = false;
  g.spent = {}; for (const q of PLAYERS) g.spent[q] = {};   // one year's ledger, all verbs
  g.rot = 1;
  g.log.unshift(`— Year ${g.round}. ${PNAME[g.turn]} to act. —`);
}
function perish(g, rid, i) {
  const sf = g.shortfall;
  const bd = g.b[rid][i];
  g.b[rid][i] = null;
  g.log.unshift(`${PNAME[sf.p]} abandons the ${BT[bd.t].name.toLowerCase()} in ${R[rid].n}.`);
  if (BT[bd.t].annex && g.rel[sf.p] && g.rel[sf.p][rid]) {
    g.rel[sf.p][rid].i = Math.max(0, g.rel[sf.p][rid].i - 2);
    g.log.unshift(`The governor's household is turned out — ${R[rid].n} seethes: −2 ${PNAME[sf.p]} influence (now ${g.rel[sf.p][rid].i}).`);
  }
  sf.deficit--;
  if (sf.deficit <= 0) {
    const p = sf.p, next = sf.next;
    g.shortfall = null;
    if (next) runUpkeep(g, next);
    else { relationsUpkeep(g); finishUpkeep(g); }
  }
}

// ==================================================================
//  THE ENGINE'S SURFACE
// ==================================================================
// EXPORT NOTHING WITHOUT A CALLER. This list is not a menu of capabilities — it is exactly
// what the table and the harness ask for, grouped by who asks. Every rule in here is reachable
// through `dispatch` and describable through `view`; an export that bypasses those two is a
// second way to ask a question the engine already answers, which is the shape of every bug this
// project has had.
//
// If a new consumer needs a name, add it here deliberately and say who needs it. If you are
// adding one so the interface can decide whether something is allowed, stop: that answer
// belongs in `availableCommands`.
export {
  // THE DOORS — the whole API for anything that plays the game.
  initState, dispatch, availableCommands, view, validCmd,

  // THE WORLD, as it is named and drawn. Facts about the map, not rules about it.
  BT, HOME, NB, PCOL, PLAYERS, PNAME, R, REG, SLETTER,

  // THE DIGESTS — same trajectory? (`g.chain`, carried on the state) · same position?
  fingerprint,

  // WHOSE MOVE IT IS. `live` lists the seated powers; `effectiveSeat` says whose desk the
  // next command comes from, which is not always `g.turn` — a contest passes it round.
  live, effectiveSeat,

  // ORDERS — the pivot between commands and intent. harness/engine/test-orders.js walks the
  // engine's own play through this and back, which is the command layer's regression test.
  Order,

  // READ BY THE SUITES ONLY. These let a test assert against a rule directly instead of
  // inferring it from play. Nothing in the interface may call them.
  costTapCovered, foodRots, foodStore, foremostIn, infOf, legalTargets,
  specOf, tapYields, upkeepDue, usable, yieldOf,
};

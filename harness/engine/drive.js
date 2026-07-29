// Seeded random-walk over the legal command space; prints a deterministic fingerprint.
const path = process.argv[2];
const M = require(path);
const SEED = Number(process.argv[3] || 12345);

let s = SEED >>> 0;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };

let g = M.initState();
let cmds = 0, stuck = 0, crashes = 0;
const ROUNDS = 30;

for (let step = 0; step < 20000; step++) {
  if (g.round > ROUNDS) break;
  let menu;
  try { menu = M.availableCommands(g); }
  catch (e) { crashes++; break; }
  if (!menu || !menu.length) { stuck++; break; }
  const pool = menu.filter((x) => x.t !== "forfeit");
  if (!pool.length) { stuck++; break; }
  const c = pool[Math.floor(rnd() * pool.length)];
  try { g = M.dispatch(JSON.parse(JSON.stringify(g)), c); cmds++; }
  catch (e) { crashes++; console.log("CRASH", e.message, JSON.stringify(c)); break; }
}

// fingerprint: counts + a hash of the whole chronicle
const crypto = require("crypto");
const logText = g.log.join("\n");
const h = crypto.createHash("sha256").update(logText).digest("hex").slice(0, 16);
console.log(JSON.stringify({
  seed: SEED, cmds, stuck, crashes,
  round: g.round, lines: g.log.length, logHash: h,
  stocks: M.PLAYERS.map((p) => g.players[p] && Object.values(g.players[p].stock).join("/")).join(" "),
  rel: M.PLAYERS.map((p) => Object.values(g.rel[p]).reduce((a, r) => a + r.i, 0)).join("/"),
}));

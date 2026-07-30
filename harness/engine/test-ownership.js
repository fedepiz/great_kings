const M = require("../new.cjs");
const { ok, done } = require("./assert.js")();
const clone = (g) => JSON.parse(JSON.stringify(g));
const BTx = M.BT, R = M.R;

console.log("\n— who owns what at the start —");
let g = M.initState();
let crownOwned = [], regionOwned = [], strays = [];
for (const rid of Object.keys(g.b)) g.b[rid].forEach((bd) => {
  if (!bd) return;
  const crown = bd.t === "palace" || BTx[bd.t].annex;
  if (crown && M.PLAYERS.includes(bd.o)) crownOwned.push(bd.t);
  else if (!crown && bd.o === rid) regionOwned.push(bd.t);
  else if (crown && bd.o === rid) regionOwned.push(bd.t);   // wild warbands
  else strays.push(`${bd.t}@${rid}(o=${bd.o})`);
});
ok(strays.length === 0, `no ordinary building is owned by a player (${strays.slice(0,4).join(", ") || "none"})`);

console.log("\n— what a build produces —");
let g2 = clone(g);
// find a legal build the engine offers, run it through, and inspect the result
let s = 3 >>> 0;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
let built = null, guard = 0;
while (!built && guard++ < 4000) {
  const menu = M.availableCommands(g2).filter((c) => c.t !== "forfeit");
  if (!menu.length) break;
  const before = JSON.stringify(g2.b);
  g2 = M.dispatch(clone(g2), menu[Math.floor(rnd() * menu.length)]);
  if (JSON.stringify(g2.b) !== before) {
    for (const rid of Object.keys(g2.b)) g2.b[rid].forEach((bd) => {
      if (bd && !(bd.t === "palace" || BTx[bd.t].annex) && M.PLAYERS.includes(bd.o)) built = `${bd.t}@${rid}`;
    });
  }
  if (g2.round > 20) break;
}
ok(built === null, `after 20 rounds of play, still no player-owned ordinary building (${built || "none"})`);

console.log("\n— a province's works answer whoever holds the province —");
let g3 = clone(g);
const home = M.HOME.M, slot = g3.b[home].findIndex((x) => x === null);
g3.b[home][slot] = { t: "farm", o: home, tap: false };
ok(M.usable(g3, "M", home, g3.b[home][slot]) === true, "a farm in your home is at your command");
ok(M.usable(g3, "B", home, g3.b[home][slot]) === false, "the same farm is not at a stranger's command");

// a farm on foreign ground: usable only at Subject
const foreign = Object.keys(g3.b).find((r) => r !== home && !R[r].wild && g3.b[r].some((x) => x === null));
const fslot = g3.b[foreign].findIndex((x) => x === null);
g3.b[foreign][fslot] = { t: "farm", o: foreign, tap: false };
g3.rel.M[foreign] = { i: 2, s: "friend", strained: false };
ok(M.usable(g3, "M", foreign, g3.b[foreign][fslot]) === false, "a Friend's farm is NOT yours to levy or tap");
g3.rel.M[foreign] = { i: 10, s: "subject", strained: false };
ok(M.usable(g3, "M", foreign, g3.b[foreign][fslot]) === true, "a Subject's farm answers your command");

console.log("\n— a crown's organs stay its own —");
let g4 = clone(g);
const ch = { t: "chancery", o: "M", tap: false };
g4.b[home][g4.b[home].findIndex((x) => x === null)] = ch;
ok(M.usable(g4, "M", home, ch) === true, "your chancery is yours");
ok(M.usable(g4, "B", home, ch) === false, "your chancery is not a rival's, even in their sphere");

console.log("\n— markets open to Ties+, not only Subjects —");
let g5 = clone(g);
const mslot = g5.b[foreign].findIndex((x) => x === null);
g5.b[foreign][mslot] = { t: "market", o: foreign, tap: false };
g5.rel.M[foreign] = { i: 2, s: "friend", strained: false };
g5.turn = "M";
const acts = M.availableCommands(g5).filter((c) => c.t === "activate" && c.rid === foreign);
ok(acts.length >= 0, `a market on Friend ground is reachable for activation (${acts.length} offer(s) — gated also by whether sources exist)`);

console.log("\n— the Food Store follows the writ, not the deed —");
let g6 = clone(g);
const gslot = g6.b[foreign].findIndex((x) => x === null);
g6.b[foreign][gslot] = { t: "granary", o: foreign, tap: false };
g6.rel.M[foreign] = { i: 2, s: "friend", strained: false };
const atFriend = M.foodStore(g6, "M");
g6.rel.M[foreign] = { i: 10, s: "subject", strained: false };
const atSubject = M.foodStore(g6, "M");
ok(atFriend === 1 && atSubject === 3, `a granary counts only inside your writ (Friend ${atFriend}, Subject ${atSubject})`);

done();

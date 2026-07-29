global.window = { innerWidth: 390, innerHeight: 844, addEventListener() {}, removeEventListener() {} };
import React from "react";
import { renderToString } from "react-dom/server";
import App, { initState, dispatch, availableCommands, mapOnlyStep } from "./levant-prototype-v25.jsx";
// drive the engine into a variety of live states and confirm mapOnlyStep classifies each,
// then render the component in each (React state is seeded from initState, so we only
// verify the classifier here; render coverage is exercised by the two smoke tests).
let g = initState();
const seen = {};
let s = 99 >>> 0;
const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
for (let i = 0; i < 4000; i++) {
  const menu = availableCommands(g).filter((c) => c.t !== "forfeit");
  if (!menu.length) break;
  const key = `${g.act ? "act" : "free"}/${g.mode ? g.mode.v : "-"}${g.mode && g.mode.region ? "+r" : ""}`;
  const v = mapOnlyStep(g);
  seen[key] = seen[key] === undefined ? v : seen[key];
  if (seen[key] !== v && key.indexOf("free") !== 0) seen[key + "!MIXED"] = true;
  g = dispatch(JSON.parse(JSON.stringify(g)), menu[Math.floor(rnd() * menu.length)]);
  if (g.round > 12) break;
}
console.log("step classification (true = phone drops to peek, map is the workplace):");
for (const k of Object.keys(seen).sort()) console.log("  ", k.padEnd(22), seen[k]);

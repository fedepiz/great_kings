// =====================================================================
// render-check.jsx — does the table actually draw, at both sizes?
// =====================================================================
// This renders THE SOURCE — app.jsx as written, through the bundler. That is the whole point of
// the file: a check that reads assembled output instead cannot see a fault in anything the
// assembly throws away, and an import block is exactly the sort of thing an assembly step
// rewrites. A broken import must be a broken build here.
//
// It is a smoke test and nothing more: it asserts the interface renders without throwing and
// that the landmarks are present. What the panels SAY is harness/engine/test-view.js's job,
// over tens of thousands of states — not this file's.
// =====================================================================
import React from "react";
import { renderToString } from "react-dom/server";
import App from "../levant/app.jsx";

// `isMobile` is read from window.innerWidth when the component first renders, so the two
// widths are two renders in one process — no second entry point, no duplicated assertions.
const shim = (w, h) => {
  global.window = { innerWidth: w, innerHeight: h, addEventListener() {}, removeEventListener() {} };
};

let fail = 0;
const ok = (c, m) => { console.log(c ? "  ✓ " + m : "  ✗ FAIL: " + m); if (!c) fail++; };

// Landmarks, not layout. Each is drawn by a different part of the table, so between them they
// prove every region of the interface got as far as emitting text: the title block, the map's
// sea and its provinces, the actor band, the power cards, and the exits band that `view` puts
// last in every state.
//
// PICK STRINGS THE INTERFACE ACTUALLY RENDERS. A landmark you have not seen in the output is a
// landmark you are guessing at — and an assertion on a string that is never drawn fails
// silently forever. Before adding one here, render and grep for it.
const LANDMARKS = [
  "The Great Kings",           // title block
  "THE GREAT SEA",             // the map's own furniture
  "Mycenae", "Babylon",        // provinces, at both ends of the board
  "Royal palace — Mycenae",    // the actor band, naming what may act
  "food store", "Hatti",       // the power cards
  "Pass", "Forfeit",           // the exits band, always last
];

for (const [label, w, h] of [["desktop", 1440, 900], ["phone", 390, 844]]) {
  shim(w, h);
  let html;
  try {
    html = renderToString(React.createElement(App));
  } catch (e) {
    console.log(`— ${label} (${w}×${h}) —`);
    ok(false, `renders without throwing — ${e.message}`);
    continue;
  }
  console.log(`— ${label} (${w}×${h}) — ${html.length} chars`);
  ok(html.length > 4000, "renders something substantial");
  for (const m of LANDMARKS) ok(html.includes(m), `draws "${m}"`);
}

// The two sizes are allowed to differ in exactly one way, and it is worth pinning: the phone
// folds the chronicle into the sheet, the desktop floats it as a dialog. If both renders ever
// produce the same chronicle, the width check has stopped working.
console.log("— the sizes differ where they should —");
shim(390, 844);
const phone = renderToString(React.createElement(App));
shim(1440, 900);
const desk = renderToString(React.createElement(App));
ok(phone.includes("Chronicle") && !phone.includes("The chronicle"), "the phone folds the chronicle into the sheet");
ok(desk.includes("The chronicle") && !desk.includes(">Chronicle<"), "the desktop floats it as a dialog");

console.log(fail ? `\nFAILED — ${fail} problem(s)` : "\nOK — the table renders at both sizes");
process.exit(fail ? 1 : 0);

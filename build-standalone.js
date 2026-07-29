#!/usr/bin/env node
// =====================================================================
// build-standalone.js — the game as ONE .html file that opens anywhere
// =====================================================================
// `levant-prototype-v25.jsx` is a React component, not a page. It runs inside a claude.ai
// chat artifact because that container supplies the three things it does not carry:
//
//   React and ReactDOM        it imports them and does not bundle them
//   Tailwind's stylesheet     it uses utility class names and defines none of them
//   a proxied fetch           the scribe POSTs to api.anthropic.com with NO api key, so
//                             only a container that injects credentials can answer it
//
// This build supplies the first two and cannot supply the third. What comes out is the
// hot-seat game, self-contained, openable from a file:// URL or publishable as a page —
// with the scribe's desk present but inert. Say so wherever you put it.
//
// EDIT THE SOURCES, NEVER THE OUTPUT. Run `node build-game.js` first; this reads what it
// wrote.
// =====================================================================
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = __dirname;
const PROTO = path.join(ROOT, "levant-prototype-v25.jsx");

// ---------------------------------------------------------------------
// THE UTILITY SHIM
// ---------------------------------------------------------------------
// The table styles itself two ways at once. Look at any button:
//
//   className="text-xs px-2 py-1 rounded"     ← Tailwind: names, defined elsewhere
//   style={{ background: "#3A3226", ... }}    ← plain CSS: the property itself
//
// EVERY COLOUR, FACE AND CURSOR IS INLINE; only spacing and type size are Tailwind. That
// split is why this shim is safe to write by hand: the game's whole visual identity travels
// on its own, and what is reproduced here is metrics. Get one wrong and the board is
// cramped, not miscoloured.
//
// The values below are Tailwind v3's. They are not approximations — 0.25rem really is what
// `px-2`'s 2 means — and the guard underneath makes sure this list keeps covering what the
// table actually asks for.
const SHIM = `
*, *::before, *::after { box-sizing: border-box; border: 0 solid; }
html, body { margin: 0; padding: 0; height: 100%; }
/* the board paints its own parchment over every surface, so it commits to one visual world;
   this keeps a dark system theme from inverting the controls out from under it */
:root { color-scheme: light; }
#root { height: 100%; }
h1 { font-size: inherit; font-weight: inherit; margin: 0; }
button { font-family: inherit; font-size: 100%; font-weight: inherit; line-height: inherit;
         color: inherit; margin: 0; padding: 0; background-color: transparent; background-image: none; }
button:disabled { cursor: default; }

/* Stripping the button border above also removes the only thing that marked keyboard focus.
   Put a ring back, in the board's own ochre rather than the browser's blue. */
:focus-visible { outline: 2px solid #C9A227; outline-offset: 2px; border-radius: 3px; }

/* the phone sheet animates its height; honour a request that it not */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}

.flex            { display: flex; }
.flex-1          { flex: 1 1 0%; }
.flex-wrap       { flex-wrap: wrap; }
.grid            { display: grid; }
.grid-cols-2     { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.gap-1           { gap: 0.25rem; }
.gap-2           { gap: 0.5rem; }
.gap-3           { gap: 0.75rem; }
.items-baseline  { align-items: baseline; }
.items-start     { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.leading-relaxed { line-height: 1.625; }
.opacity-70      { opacity: 0.7; }
.rounded         { border-radius: 0.25rem; }

.mt-0\\.5 { margin-top: 0.125rem; }
.mt-1    { margin-top: 0.25rem; }
.mt-2    { margin-top: 0.5rem; }
.mt-3    { margin-top: 0.75rem; }
.mt-4    { margin-top: 1rem; }
.mb-1    { margin-bottom: 0.25rem; }
.mb-2    { margin-bottom: 0.5rem; }

.p-2  { padding: 0.5rem; }
.p-4  { padding: 1rem; }
.pt-3 { padding-top: 0.75rem; }
.px-2 { padding-left: 0.5rem;  padding-right: 0.5rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem;  padding-bottom: 0.5rem; }

.text-xs { font-size: 0.75rem;  line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-xl { font-size: 1.25rem;  line-height: 1.75rem; }
`;

// ---------------------------------------------------------------------
// WHICH UTILITIES DOES THE TABLE ACTUALLY ASK FOR?
// ---------------------------------------------------------------------
// A shim that silently stops covering the table is exactly the failure this project keeps
// finding: a rule — here, a metric — living somewhere that can drift out of agreement with
// the thing it serves. Add `className="mb-4"` to app.jsx and the page would simply lose that
// margin, with every test still green, because no test looks at the page.
//
// So the classes are read back out of the built file and checked against the shim. There are
// four ways the table writes a className and the reader knows all four. It does NOT guess at
// a fifth: an unrecognised form stops the build, because a reader that skips what it does not
// understand is worse than no reader — it reports full coverage of the part it happened to
// parse.
//
// Two of the forms are traps for a naive scan, which is why this is a reader and not a regex:
//
//   className={name === "turn" ? "mt-4 pt-3" : "mt-2"}   "turn" is a COMPARISON, not a class
//   className={shell}                                     the classes are behind a variable
//
// Taking every quoted string would invent a class called `turn`; taking only the literal
// forms would miss `grid grid-cols-2 gap-1` entirely.
function classesUsed(src) {
  const used = new Set();
  const unread = [];
  // strings from a fragment, split into whitespace-separated tokens
  const tokens = (frag) => {
    for (const m of frag.matchAll(/"([^"\n]*)"/g))
      for (const c of m[1].split(/\s+/)) if (c) used.add(c);
  };
  // a ternary's VALUE side only: everything after the first `?` outside a string. The
  // condition is where non-class strings live.
  const valueSide = (expr) => {
    let inStr = false, q = "";
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (inStr) { if (ch === q && expr[i - 1] !== "\\") inStr = false; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = true; q = ch; continue; }
      if (ch === "?") return expr.slice(i + 1);
    }
    return null;                       // not a ternary
  };

  const re = /className=/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    if (src[i] === '"') {                                   // 1. className="a b c"
      const end = src.indexOf('"', i + 1);
      tokens(src.slice(i, end + 1));
      continue;
    }
    if (src[i] !== "{") { unread.push(src.slice(m.index, m.index + 60)); continue; }
    // find the matching brace
    let depth = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") { depth--; if (!depth) break; }
    }
    const expr = src.slice(i + 1, j).trim();
    const vs = valueSide(expr);
    if (vs !== null) { tokens(vs); continue; }               // 2. className={cond ? "x" : "y"}
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) {                   // 3. className={someVariable}
      // resolve it: the variable is assigned a class string, or a ternary of them
      const decl = new RegExp("\\b(?:const|let|var)\\s+" + expr + "\\s*=\\s*([^;\\n]+)").exec(src);
      if (!decl) { unread.push(`className={${expr}} — cannot find where ${expr} is assigned`); continue; }
      const inner = valueSide(decl[1]);
      tokens(inner === null ? decl[1] : inner);
      continue;
    }
    unread.push(src.slice(m.index, m.index + 60).replace(/\n/g, " "));   // 4. something new
  }
  return { used, unread };
}

const classesDefined = (css) => new Set(
  [...css.matchAll(/^\.([A-Za-z0-9\\.:_-]+)\s*\{/gm)].map((m) => m[1].replace(/\\/g, "")));

// ---------------------------------------------------------------------
if (!fs.existsSync(PROTO)) {
  console.error("REFUSING TO BUILD — no levant-prototype-v25.jsx. Run: node build-game.js");
  process.exit(1);
}
const proto = fs.readFileSync(PROTO, "utf8");

const { used, unread } = classesUsed(proto);
if (unread.length) {
  console.error("REFUSING TO BUILD — a className this reader does not understand:");
  for (const u of unread) console.error("   " + u);
  console.error("Teach classesUsed() to read it; do not let it be skipped silently.");
  process.exit(1);
}
const defined = classesDefined(SHIM);
const missing = [...used].filter((c) => !defined.has(c)).sort();
if (missing.length) {
  console.error("REFUSING TO BUILD — the table asks for utilities the shim does not define:");
  for (const c of missing) console.error("   ." + c);
  console.error("Add them to SHIM at Tailwind's own values, or the page renders wrong in a");
  console.error("way nothing else will catch.");
  process.exit(1);
}
const dead = [...defined].filter((c) => !used.has(c)).sort();

// ---------------------------------------------------------------------
// React is bundled IN. The prototype imports it and a page has no import map; the artifact
// CSP forbids fetching it from anywhere, which is the same reason Tailwind is shimmed above
// rather than linked.
const entry = `
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./levant-prototype-v25.jsx";
createRoot(document.getElementById("root")).render(React.createElement(App));
`;
const built = esbuild.buildSync({
  stdin: { contents: entry, resolveDir: ROOT, sourcefile: "standalone-entry.jsx", loader: "jsx" },
  bundle: true, minify: true, format: "iife", write: false,
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".jsx": "jsx" },
});
const js = built.outputFiles[0].text;

// A page that reaches outside itself will be blocked by an artifact CSP and will simply fail
// where it is opened. The scribe's own call to api.anthropic.com is expected and is not a
// dependency of the game; anything ELSE is a packaging mistake.
const strayHost = [...js.matchAll(/https?:\/\/[^"'`\s)]+/g)].map((m) => m[0])
  .filter((u) => !u.startsWith("https://api.anthropic.com"))
  .filter((u) => !/(reactjs\.org|react\.dev|fb\.me|w3\.org|schema\.org)/.test(u));   // error-message links
if (strayHost.length) {
  console.error("REFUSING TO WRITE — the bundle reaches a host it cannot reach when published:");
  for (const u of [...new Set(strayHost)]) console.error("   " + u);
  process.exit(1);
}

const html = `<title>The Great Kings</title>
<style>
/* ---------------------------------------------------------------------
   Written by build-standalone.js. DO NOT EDIT.
   The utilities the table names, at Tailwind v3's values, because a
   published page may not fetch a stylesheet from anywhere.
   --------------------------------------------------------------------- */
${SHIM.trim()}
</style>
<div id="root"></div>
<script>
${js}
</script>
`;

const dests = process.argv[2] ? [process.argv[2]] : [path.join(ROOT, "great-kings.html")];
for (const d of dests) fs.writeFileSync(d, html);
console.log("built", dests.join(" + "), (html.length / 1024).toFixed(0) + "KB");
console.log("  bundle    :", (js.length / 1024).toFixed(0) + "KB  (React bundled in)");
console.log("  utilities :", used.size, "asked for,", defined.size, "defined" + (dead.length ? " — unused: " + dead.join(" ") : ""));
console.log("  the scribe's desk is INERT here: it needs a container that injects credentials.");

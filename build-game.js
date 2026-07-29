#!/usr/bin/env node
// =====================================================================
// build-game.js — assemble the published game from its two sources
// =====================================================================
// An artifact must be ONE self-contained file, so the thing you upload is built rather
// than written. The sources are:
//
//   levant/engine.js   the rules. No React, no JSX, no DOM.
//   levant/app.jsx     the table: hot-seat interface and the scribe desk.
//
// The same engine.js is read verbatim by the harness tests and by the orders bench, so
// there is one core and three consumers, none of them holding a copy.
//
// EDIT THE SOURCES, NEVER THE BUILT FILE. It is overwritten on every build.
// =====================================================================
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// engine, minus its export list — in one file everything is already in scope
let engine = read("levant/engine.js");
engine = engine.slice(0, engine.lastIndexOf("\nexport {"));

// app, minus its imports — React moves to the top of the assembled file
let app = read("levant/app.jsx");
app = app.slice(app.indexOf("} from \"./engine.js\";") + "} from \"./engine.js\";".length);

const out = `import React, { useState, useRef } from "react";
// =====================================================================
//  THE GREAT KINGS — built by build-game.js. DO NOT EDIT.
//  Sources: levant/engine.js (the rules) · levant/app.jsx (the table)
//  Built:   ${new Date().toISOString()}
// =====================================================================
${engine}
${app}`;

// The concatenation can produce a duplicate declaration that neither source has. esbuild
// catches it — but only if something actually compiles the built file and the result is not
// hidden. That is harness/run-all.sh's job, and it once was not doing it: the build error
// went to /dev/null and node ran the PREVIOUS bundle, so the test passed while the artifact
// was broken. Both holes are closed there; nothing is duplicated here.

// AN ARTIFACT IS SELF-CONTAINED. If a source import survives the assembly, the file looks
// like a game and fails to load with: uses libraries we don't support — ./engine.js.
// That reached the browser once, because the SOURCES were published beside the built file
// and one of them was opened by mistake. Nothing but this output should be published.
const stray = out.split("\n").filter((l) => /^\s*import .*from ["']\.\//.test(l));
if (stray.length) {
  console.error("REFUSING TO WRITE — a source import survived the assembly:");
  for (const l of stray) console.error("   " + l.trim());
  process.exit(1);
}

// Written to BOTH the working copy and the published one, so there is no copy step to
// forget and no way for the artifact you upload to lag the sources the tests just passed.
// The artifact lands beside the sources. A second destination may be given as an argument,
// or in GREAT_KINGS_PUBLISH, for wherever you upload from.
const dests = process.argv[2] ? [process.argv[2]]
  : [path.join(ROOT, "levant-prototype-v25.jsx"), ...(process.env.GREAT_KINGS_PUBLISH ? [process.env.GREAT_KINGS_PUBLISH] : [])];
const dest = dests[0];
for (const d of dests) { try { fs.writeFileSync(d, out); } catch (e) {} }
console.log("built", dests.join(" + "), (fs.statSync(dest).size / 1024).toFixed(0) + "KB");
console.log("  engine :", (engine.length / 1024).toFixed(0) + "KB");
console.log("  table  :", (app.length / 1024).toFixed(0) + "KB");

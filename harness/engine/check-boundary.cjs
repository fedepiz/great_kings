#!/usr/bin/env node
// =====================================================================
// check-boundary.cjs — THE SEAL, HELD BY TOOLING RATHER THAN BY REVIEW
// =====================================================================
// THE ENGINE'S STATE IS A DOCUMENT AND THE BOUNDARY IS MESSAGES: a scenario in, a state out;
// a command + state in, a state out; a question + state in, a plain value out. Nothing outside
// the engine INTERPRETS the document — the table draws the view, the suites ask the query
// door. This check makes that a red build instead of a review habit.
//
// It scans the table and the harness for `<receiver>.<state-field>` reads and compares them,
// per file per field, against boundary-allowlist.txt. The comparison is EXACT BOTH WAYS:
//   - a read not on the allowlist is a violation — ask through a door, or make the case for a
//     new vocabulary entry and record it in the allowlist WITH ITS REASON;
//   - an allowlist entry no longer found is stale — delete it, so the list only ever shrinks
//     or is deliberately, visibly grown.
//
// The scan is textual and the receiver test is a heuristic; the allowlist absorbs the few
// deliberate exceptions, which is the point: every reach past the doors is NAMED.
const fs = require("fs");
const path = require("path");
const HERE = __dirname;
const ROOT = path.join(HERE, "..", "..");

// every top-level field of the state document (see initState), plus the two commitment lists
const FIELDS = ["rel", "players", "raid", "contest", "mode", "act", "shortfall",
  "turn", "round", "log", "chain", "passed", "out", "world", "step", "rot", "confirmForfeit",
  "capLeft"];
// receivers that are known NOT to be a state: the view (v), the module namespaces, stdlib
const SAFE = new Set(["console", "Math", "JSON", "v", "M", "F", "Q", "process", "path"]);

const FILES = [
  path.join(ROOT, "levant", "app.jsx"),
  ...fs.readdirSync(HERE).filter((f) => /^test-.*\.js$/.test(f)).map((f) => path.join(HERE, f)),
  path.join(HERE, "fixtures.cjs"),
];

const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const fieldRe = new RegExp(String.raw`([A-Za-z_$][\w$]*)\.(${FIELDS.join("|")})\b`, "g");
// indexed-only fields: the bare names belong to the public vocabulary (`c.b` is the menu's
// building tag, `w.spent` a view row's flag); the STATE's are always indexed into
const bIndexRe = /([A-Za-z_$][\w$]*)\.b[[.]/g;
const spentIndexRe = /([A-Za-z_$][\w$]*)\.spent[[.]/g;

const found = new Map();   // "file field" -> example line
for (const file of FILES) {
  const name = path.basename(file);
  const lines = strip(fs.readFileSync(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const re of [fieldRe, bIndexRe, spentIndexRe]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        if (SAFE.has(m[1])) continue;
        const field = re === bIndexRe ? "b" : re === spentIndexRe ? "spent" : m[2];
        const key = `${name} ${field}`;
        if (!found.has(key)) found.set(key, `${name}:${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    }
  });
}

const allowPath = path.join(HERE, "boundary-allowlist.txt");
const allowed = new Map();  // "file field" -> reason line
for (const line of fs.readFileSync(allowPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const m = t.match(/^(\S+)\s+(\S+)\s+—\s+(.*)$/);
  if (!m) { console.log(`  ✗ allowlist line unparseable: "${t}"`); process.exit(1); }
  allowed.set(`${m[1]} ${m[2]}`, m[3]);
}

let bad = 0;
for (const [key, where] of [...found].sort()) {
  if (!allowed.has(key)) { bad++; console.log(`  ✗ UNSEALED READ: ${key}\n      ${where}\n      ask through a door, or allowlist it with a reason`); }
}
for (const key of [...allowed.keys()].sort()) {
  if (!found.has(key)) { bad++; console.log(`  ✗ STALE ALLOWANCE: ${key} — no longer read; delete its line so the list only shrinks`); }
}
if (!bad) console.log(`  the boundary holds: ${found.size} named read(s), all allowed, none stale`);
process.exit(bad ? 1 : 0);

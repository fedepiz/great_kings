# THE HARNESS — what checks what, and why each check exists

One command — `npm test` → `bash harness/run-all.sh` — runs five gates, in order. A change is
done when all five hold. This file is the map; CLAUDE.md says how to change things without
breaking them; each suite's deeper rationale lives in its own header.

## The five gates, in the order they run

1. **The bundles.** `levant/engine.js` → `harness/new.cjs` (the engine as every suite imports
   it) and `levant/scenario.js` → `harness/scenario.cjs` (the canon world as data, which the
   suites author their fixtures from). Generated, gitignored, rebuilt every run.

2. **The suites** (`engine/test-*.js`, fourteen). Plain node scripts: green assertions,
   non-zero exit on failure. What each one claims:

   | suite | its claim |
   |---|---|
   | `test-commands` | `dispatch` is TOTAL: every command shape × every state — including hostile garbage — is absorbed or refused, never a throw. Exploratory play cannot test this: a walk only ever picks LEGAL commands |
   | `test-orders` | commands → ORDER → commands reaches the same position: the command layer's regression test |
   | `test-view` | the table has no second opinion: every option the view draws is on the menu, and every menu entry is drawn somewhere, over tens of thousands of states — the two failure modes are a board that lies and a dead end no panel carries |
   | `test-query` | the third door answers truthfully: authored facts read back, `foremost` ≡ a brute-force oracle, contests ascend, malformed asks throw, answers are values |
   | `test-hash` | the chain refuses stale commands; one position reached by two routes has one fingerprint and one menu |
   | `test-economy` | the Food Store, the reckoning, what winter takes |
   | `test-ownership` | works answer a power or their province; raising a rung never revokes a command |
   | `test-war` | the foremost, ties, and the excluded raider |
   | `test-raid` | the raid's auction: bids leave the stores; dominate, tie and unmatched each land their outcome; call-off refunds |
   | `test-strike` | war from assembly to the last strike, on boards random play never reaches |
   | `test-subvert` | the subversion: poorest speaks first; the winner's standing is the blow's weight |
   | `test-verbs` | the thin verbs — treaty's climb and overtake, the sea raid — pinned by hand because random play barely lands them (treaty: once in 8 games) |
   | `test-checks` | THE RULES AS EXECUTABLE SPECIFICATION: a generator plays; observer trackers match the play against rulebook-cited Hoare triples via `Order.allows`; a coverage histogram names the rules not yet specified. The destination of the rule suites — see TODO.md |

   Two things ride along with every suite. `GK_CHECK=1` (set by `run-all.sh`) arms the
   engine's own invariants — `checkWorld` (true of every state), `checkMenu` (true of every
   menu), and the site asserts, including `refuse`'s "a refusal moves nothing" — so every walk
   any suite takes checks every invariant for free. And `fixtures.cjs` is how a suite builds a
   position: clone the canon, edit it in the author's vocabulary (`variant`, `seatFirst`,
   `standing`, `addWork`, `setWorks`, `stocks`), seat it through `initState`'s validating
   door; `fork(g)` branches a timeline (position copied, immutable world shared).

3. **The boundary** (`engine/check-boundary.cjs`). The engine's state is a sealed document;
   outside the engine, facts are read only through the doors. This gate scans the table and
   the harness for `<receiver>.<state-field>` reads and fails on any hit not named in
   `boundary-allowlist.txt` — which is EMPTY, and stays empty unless a reach is deliberately
   granted there with its reason. Stale grants fail too: the list only shrinks, or grows
   visibly.

4. **The sources compile** — engine, table, main, each alone. A fault in `app.jsx` reaches no
   suite, so without this it would reach nothing but the browser.

5. **The table renders** (`render-check.jsx`) — the real `App` at two viewport sizes, checked
   for landmark strings every region of the interface must emit. A smoke test and nothing
   more; what the panels SAY is `test-view`'s job.

## The doors — the whole surface anything outside the engine may use

| door | question |
|---|---|
| `initState(scenario)` | seat this world (validates or throws; the engine ships none) |
| `dispatch(g, cmd)` | do this (total; gated on the menu; refuses stale stamps) |
| `availableCommands(g)` | what may I do? — the ONLY home of legality |
| `view(g)` | what do I show? — the table's whole diet, geometry and colours included |
| `query(g, q)` | what is true? — facts as data; validate-or-throw; answers are values |
| `fingerprint(g)` | same position? (the chain, on the state, answers "same trajectory?") |
| `Order` | commands ⇄ intent — the pivot `test-orders` walks |
| `BT` | the rules' own table: building types, as data |

Everything crosses as JSON. The engine could be reimplemented in another language behind
these names and nothing outside would know.

## What was removed, and what is still open

The seeded-robot differential (drive.js, diff.sh, ref.cjs) is retired — its robot asked the
mutating menu, so it measured menu drift rather than rule drift; TODO.md "A successor to the
differential" holds the thinking toward a sound replacement. TODO.md is also the ledger for
the remaining test-purge and the `walk()` consolidation.

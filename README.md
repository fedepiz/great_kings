# THE GREAT KINGS

A Late Bronze Age strategy game — five great powers, a board of provinces that are themselves
polities, and a diplomacy of gifts, treaties, raids and subversions. Hot-seat, with an
LLM-driven court being built alongside it.

Everything here is plain JavaScript and JSX. No framework beyond React, no bundler config, no
package manager state that matters. `npx esbuild` is used for building and for the tests.

---

## The two things you can run

Both are **single self-contained files**, built from source, meant to be opened as artifacts:

| `levant-prototype-v25.jsx` | the game — board, panels, and the scribe's desk |
| `dist/orders-bench.jsx` | the evaluation bench |

**Neither is edited by hand, and neither is committed.** Both are build outputs, overwritten on
every build and git-ignored. Edit the sources; run `npm run build` to get a game to upload and
`./harness/inject.sh` to get a bench. Both take a destination — an argument, or
`GREAT_KINGS_PUBLISH` / `GREAT_KINGS_PUBLISH_BENCH` — for wherever you publish from.

---

## Source layout

```
levant/
  engine.js        THE RULES. No React, no JSX, no DOM. ~2,700 lines, 35 exports.
  app.jsx          THE TABLE. Interface and the scribe desk. ~780 lines.

build-game.js      engine.js + app.jsx  →  levant-prototype-v25.jsx

harness/
  run-all.sh       everything: build, differential, ten suites, both sources, both renders
  rebuild-bench.sh corpus pipeline end to end
  inject.sh        build the orders-bench artifact

  engine/          "does the game still work?"
    test-*.js      ten suites, 111 assertions
    test-view.js   "does the table have a second opinion?" — every option the table can
                   click is a command the engine offers, over 50k states
    assert.js      the counter, the tick and the exit code the ten suites share
    drive.js       plays a seeded game, prints a fingerprint
    diff.sh        replays 10 seeds against ref.cjs — a pure refactor must be identical
    check.sh       bundle + differential, quickly

  bench/           "does an instruction get carried out?"
    gen-corpus.js      walks the engine, extracts orders, renders prose → orders-corpus.json
    render-pack.js     corpus → orders-pack.json (pre-rendered prompts)
    validate-corpus.js the corpus replays against the engine, exactly
    validate-pack.js   oracle 100% / always-wrong 0% / random ≈ baseline
    test-roundtrip.js  the corpus round-trips through Order
    check-chain.js     each stage carries a hash of the one it was built from
    build-bench.js     engine + generator + UI → dist/orders-bench.jsx
    orders-bench.jsx   the bench's own source (the UI half)

  SCRIBE-FINDINGS.md   what the evaluation established
  KNOWN-ISSUES.md      what is still open

great-kings-player-rules.md   the rulebook, current with the engine
smoke.jsx, smoke-mobile.jsx   render checks, run by run-all.sh
```

Generated and not committed: `levant-prototype-v25.jsx` and `dist/` (the two artifacts),
`harness/new.cjs` (the engine bundle the tests import), `harness/ref.cjs` (the differential
reference), `*.bak*`.

**The corpus and the pack are committed**, though they are generated too. They are the record
a measurement was taken against, and `SCRIBE-FINDINGS.md` quotes their shape; regenerating
them is deterministic from fixed seeds, so a diff means the engine moved.

---

## The four ideas the code is built on

**1. `dispatch` is the whole API.** One door into the engine. It is a *total function*: any
command in any state is either applied or refused with a chronicle line — never a throw.
`availableCommands(g)` says what may be done; `validCmd` gates everything except a short
`UNGATED` list.

> The recurring bug of this project has been a rule living **outside** `availableCommands` —
> enforced by a disabled button, or by a panel simply not drawing something. Three were found
> and fixed: `commitTaps` (a pottery workshop could settle a bill of food), `tapToggle` (an
> ungated synonym that could tap another power's warriors), and the ways out of an activation
> (which vanished once a target was named). **If a precondition is not in
> `availableCommands`, it is not a rule.**

**2. `Order` — the pivot between commands and intent.**

```
commands ──Order.read──▶ ORDER ──Order.commands──▶ commands   (exact, no model)
                           └───────render────────▶ prose ──scribe──▶ commands  (model)
```

An ORDER is one action-proper, fully specified: actor, verb, target, source, buildType,
goods, pay, payGoods, tapSlots, basket, units, strikes. `Order.commands` is the executor,
the dry-run validator and the specification checker in one walk — it reads the live menu and
keeps whatever the order licenses. **One candidate → forced. None → the order is wrong.
Several of different kinds → the order does not say enough**, and it says so.

`harness/engine/test-orders.js` walks the engine's own play and round-trips every action:
**1052/1052**. That is the regression test for the command layer — add a command no order can
express and it fails.

**3. `view(g)` — one question, one answer.** Two consumers ask different questions and
neither gets the other's answer reshaped:

```
a model asks   "what may I do?"    → availableCommands(g)
the table asks "what do I show?"   → view(g)
```

The table does **no reasoning**. It does not check whether a payment suffices, count what is
left, or know that commands have types. It reads panels and draws them, and ships back the
command attached to whatever was clicked.

`view` returns panels in a **fixed skeleton of bands**, each absent only when empty, so
nothing moves under the hand:

```
actor · errand · standing · detail · commit · notice · turn
```

Panels are `choices` · `facts` · `sides` · `notice` · `note` · `map`. Options carry facts,
never appearance: `state` (chosen · available · idle · blocked), `category`, `why`, `rank`,
`subject`. A panel carries `pick` — what its options are *to each other*: `one` · `many` ·
`repeat` · `act`. **A blocked option has `cmd: null`** and is structurally undispatchable.

`map` is the sixth kind and the only one that is not a list. A province is drawn once and may
host several options at once, so it gets the same option objects **indexed by place** —
`regions[rid].options`, `regions[rid].slots[i]`, and a `subject` of facts (who holds it, at
what rung, whether it is coastal). Coordinates are *not* in it: `REG` holds `x`/`y` because
where Ugarit sits relative to Byblos is a fact about the world, like which regions border it.
The table owns the transform — pan, zoom, pixels, colour — and nothing else.

> The map used to ask `legalTargets` directly, and that was the same recurring bug seen from
> the other side. `legalTargets` does not know every gate in front of a command: once all had
> passed the only thing on offer was the reckoning, and the board still lit every activatable
> building — 322 such states in 50,178. No rule broke (the gate refused the click and the
> world did not move), but **the interface and the engine disagreed about what the rules
> said**. The map now reads the same `availableCommands` walk the panels read, so they cannot
> drift. If two things answer "what may be done here", one of them is wrong eventually.

The table's remaining reach into the engine is **one call**: `progressLine`, for the scribe's
prompt. `check-chain.js` asserts `app.jsx` builds no command, branches on no command type,
and calls neither `legalTargets` nor `rank` nor `isCoastal`.

**4. Two digests, two questions.**

| `g.chain` | hashes the **command stream** | *same trajectory?* |
| `fingerprint(g)` | hashes the **world** | *same position?* |

Every accepted command advances the chain. Anyone issuing a command may carry the chain of
the world it was written against, and the gate refuses it if the world has moved — which is
what makes a slow agent safe on shared state. The fingerprint ignores `log` and `chain`, so
two routes to the same board compare equal; it is exact at action boundaries.

---

## Working on it

```bash
./harness/run-all.sh          # build, differential, ten suites, both sources,
                              # the published bench, both renders
./harness/rebuild-bench.sh    # corpus → pack, with every check
./harness/inject.sh [dest]    # build the orders-bench artifact
```

**After any engine change:**

1. edit `levant/engine.js` (and `levant/app.jsx` if the table must change)
2. `./harness/run-all.sh` — everything must pass
3. if the **differential** reports differences, decide whether they are intended. Prove the
   change is what you think — e.g. that the menu only ever *gains* commands — then
   `cp harness/new.cjs harness/ref.cjs` to accept the new baseline
4. `./harness/rebuild-bench.sh` — **not "if the corpus should follow": always.** The corpus
   carries a hash of the engine it was generated from, and `check-chain.js` fails while they
   disagree. That is deliberate. The corpus and the pack bake in prose the engine produced,
   so a change with no effect on play at all — rewording one chronicle line — still leaves the
   pack quoting text the engine has stopped producing, with every count still matching.

**The differential is the safety net for refactors.** Ten seeded games must play identically
unless the change is meant to alter play. It compares the whole chronicle, so a change to the
*wording* of a log line reports as ten differences: check `fingerprint(g)` is unchanged, which
is the question of whether the world moved, and accept the baseline.

**Three failures have reached the browser**, each because a test passed on something that was
not the artifact. All three are now guarded, and the guards are worth keeping:

- a **stale bundle** — the build error went to `/dev/null` and `node` ran the previous
  output. `run-all.sh` now deletes the temp files first and never hides the build.
- a **duplicate declaration** from concatenating two sources — caught by compiling the built
  file, which is what the smoke render does.
- a **stray import** surviving the assembly — `build-game.js` refuses to write.

A fourth was found the other way round: **the source was broken and the artifact was fine.**
`app.jsx` imported `view` twice — not valid JavaScript — and nothing noticed, because
`build-game.js` strips the import block before it concatenates. Every check downstream ran on
the built file and passed. `run-all.sh` now compiles **both sources on their own** as well.
The general form: *a guard that only ever looks at the build output cannot see a fault in
what the build throws away.*

**And a fifth class, which is worse: guards that could not fire at all.** An audit of the
repository found three, none of them failing, all of them reading like coverage:

- `run-all.sh` compiled the "published artifacts" by looking for a **filename no build here
  has ever produced**, under a path belonging to the sandbox this project was written in, and
  `continue`d past it in silence. It ran on every machine and checked nothing.
- `test-orders.js` — the regression test for the whole command layer — ended
  `process.exit(fail ? 0 : 0)`. It could not report a failure.
- and `run-all.sh` piped every suite into `grep`, so a suite's exit code was **grep's**, and
  `set -e` saw success whatever a suite returned.

The first is why a check that skips must *say* it skipped, and why the ones here now do. The
other two are the same lesson as the differential: **a test that has never been seen to fail
has not been shown to work.** Break it on purpose once.

And: **do not publish `levant/app.jsx` or `levant/engine.js` as artifacts.** They are sources
and import each other; only the built files run.

---

## Where the AI work stands

The **scribe** — prose instruction → commands — is measured and understood.
See `harness/SCRIBE-FINDINGS.md`. The headline:

| whole-activation directive | 72.5% per step |
| + a step marker | 85% |
| **one directive per action** | **97.5%** |
| contests, per-seat directives | 100% |

Per-step accuracy compounds, so a whole-plan directive essentially never completes a turn.
**The interface must re-issue a directive at each action boundary.** The other finding that
matters: **a directive must be as specific as the decision it governs** — seven corpus
defects, every one an instruction that did not say enough, and every one making a competent
model look broken.

The **vizier** — board → plan — is **not designed and not built.** A design for it was worked
out in the conversation this repository was assembled from, and did not come with it; treat it
as lost rather than as somewhere to look. What survived is the four constraints below, which
are the part that was load-bearing:

- The game has **no victory condition** (§12 of the rulebook), so "good play" is undefined.
- The honest question is therefore *what is the marginal value of a planner over arithmetic*.
- Four of the five stated GOALS are computable.
- A **heuristic planner should be a rival candidate**, not merely a calibration floor.

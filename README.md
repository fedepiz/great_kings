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
| `orders-bench.jsx` (built to `/mnt/user-data/outputs/`) | the evaluation bench |

**Neither is edited by hand.** Both are build outputs and are overwritten. Edit the sources.

---

## Source layout

```
levant/
  engine.js        THE RULES. No React, no JSX, no DOM. ~2,200 lines, 160 exports.
  app.jsx          THE TABLE. Interface and the scribe desk. ~770 lines.

build-game.js      engine.js + app.jsx  →  levant-prototype-v25.jsx

harness/
  run-all.sh       everything: build, differential, nine suites, both renders
  rebuild-bench.sh corpus pipeline end to end
  inject.sh        build the orders-bench artifact

  engine/          "does the game still work?"
    test-*.js      nine suites, ~110 assertions
    drive.js       plays a seeded game, prints a fingerprint
    diff.sh        replays 10 seeds against ref.cjs — a pure refactor must be identical
    check.sh       bundle + differential, quickly

  bench/           "does an instruction get carried out?"
    gen-corpus.js      walks the engine, extracts orders, renders prose → orders-corpus.json
    render-pack.js     corpus → orders-pack.json (pre-rendered prompts)
    validate-corpus.js the corpus replays against the engine, exactly
    validate-pack.js   oracle 100% / always-wrong 0% / random ≈ baseline
    test-roundtrip.js  the corpus round-trips through Order
    check-chain.js     every stage is newer than the one it is built from
    build-bench.js     engine + generator + UI → orders-bench.jsx
    orders-bench.jsx   the bench's own source (the UI half)

  SCRIBE-FINDINGS.md   what the evaluation established
  KNOWN-ISSUES.md      what is wrong, and what was wrong and is now understood

great-kings-player-rules.md   the rulebook, current with the engine
smoke*.jsx                    render checks used by run-all.sh
```

Generated and not worth keeping: `harness/new.cjs` (the engine bundle the tests import),
`harness/ref.cjs` (the differential reference), `*.bak*`.

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

Panels are `choices` · `facts` · `sides` · `notice` · `note`. Options carry facts, never
appearance: `state` (chosen · available · idle · blocked), `category`, `why`, `rank`,
`subject`. A panel carries `pick` — what its options are *to each other*: `one` · `many` ·
`repeat` · `act`. **A blocked option has `cmd: null`** and is structurally undispatchable.

The table's remaining reach into the engine is **two calls**: `legalTargets` for the map, and
`progressLine` for the scribe's prompt.

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
./harness/run-all.sh          # build, differential, nine suites, both renders
./harness/rebuild-bench.sh    # corpus → pack, with every check
./harness/inject.sh           # build the orders-bench artifact
```

**After any engine change:**

1. edit `levant/engine.js` (and `levant/app.jsx` if the table must change)
2. `./harness/run-all.sh` — everything must pass
3. if the **differential** reports differences, decide whether they are intended. Prove the
   change is what you think — e.g. that the menu only ever *gains* commands — then
   `cp harness/new.cjs harness/ref.cjs` to accept the new baseline
4. `./harness/rebuild-bench.sh` if the corpus should follow

**The differential is the safety net for refactors.** Ten seeded games must play identically
unless the change is meant to alter play.

**Three failures have reached the browser**, each because a test passed on something that was
not the artifact. All three are now guarded, and the guards are worth keeping:

- a **stale bundle** — the build error went to `/dev/null` and `node` ran the previous
  output. `run-all.sh` now deletes the temp files first and never hides the build.
- a **duplicate declaration** from concatenating two sources — caught by compiling the built
  file, which is what the smoke render does.
- a **stray import** surviving the assembly — `build-game.js` refuses to write.

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

The **vizier** — board → plan — is designed but not built. The design is in the thread, and
the essentials: the game has **no victory condition** (§12), so "good play" is undefined and
the honest question is *what is the marginal value of a planner over arithmetic*; four of the
five stated GOALS are computable; a **heuristic planner should be a rival candidate**, not
merely a calibration floor.

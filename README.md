# THE GREAT KINGS

A Late Bronze Age strategy game — five great powers, a board of provinces that are themselves
polities, and a diplomacy of gifts, treaties, raids and subversions. Hot-seat.

Everything here is plain JavaScript and JSX. No framework beyond React, no bundler config
beyond two `esbuild` command lines, and no package manager state that matters.

---

## Running it

```bash
npm install
npm run dev      # esbuild dev server on :5173 — open http://127.0.0.1:5173/
npm run build    # writes levant/main.js + levant/main.css beside the sources
npm test         # the harness: differential, ten suites, sources compile, table renders
```

`npm run dev` keeps serving as long as its stdin is open — that is how esbuild's serve mode
behaves, so run it in a terminal you leave open rather than detached.

---

## Source layout

```
index.html         the page; loads levant/main.js
levant/
  engine.js        THE RULES. No React, no JSX, no DOM. ~2,600 lines, 30 exports.
  app.jsx          THE TABLE. The hot-seat interface. ~510 lines.
  main.jsx         the only file that knows a DOM exists: mounts App.
  table.css        the ~30 utility classes app.jsx's layout depends on.

harness/
  run-all.sh       everything, in one command
  render-check.jsx does the table draw, at both sizes?
  engine/          "does the game still work?"
    test-*.js      ten suites, 111 assertions
    test-view.js   "does the table have a second opinion?" — every option the table can
                   click is a command the engine offers, over 50k states
    test-orders.js every action the engine can play, an order can describe — 1052/1052
    drive.js       plays a seeded game, prints a fingerprint
    diff.sh        replays 10 seeds against ref.cjs — a pure refactor must be identical
    check.sh       bundle + differential, quickly

  KNOWN-ISSUES.md  what is wrong, and what was wrong and is now understood

great-kings-player-rules.md   the rulebook, current with the engine
```

Generated and gitignored: `levant/main.js`, `levant/main.css`, `harness/new.cjs` (the engine
bundle the tests import), `harness/ref.cjs` (the differential's baseline).

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

The engine exports **30 names**, and that number is load-bearing. It was 163, of which 109 had
no consumer anywhere and 13 were never called at all. An export that lets a caller ask "is this
allowed?" some other way is a second answer to a question `availableCommands` already answers,
and that is the shape of every bug above. See the block at the foot of `engine.js`.

**2. `Order` — the pivot between commands and intent.**

```
commands ──Order.read──▶ ORDER ──Order.commands──▶ commands   (exact, no model)
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
command attached to whatever was clicked. Its whole reach into the engine is `view`, `dispatch`,
`initState`, plus `live` and `mapOnlyStep` — and neither of those last two decides what may be
done.

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

**4. Two digests, two questions.**

| `g.chain` | hashes the **command stream** | *same trajectory?* |
| `fingerprint(g)` | hashes the **world** | *same position?* |

Every accepted command advances the chain. Anyone issuing a command may carry the chain of
the world it was written against, and the gate refuses it if the world has moved — which is
what makes a slow agent safe on shared state. The fingerprint ignores `log` and `chain`, so
two routes to the same board compare equal; it is exact at action boundaries.

---

## Working on it

**After any engine change:**

1. edit `levant/engine.js` (and `levant/app.jsx` if the table must change)
2. `npm test` — everything must pass
3. if the **differential** reports differences, decide whether they are intended. Prove the
   change is what you think — e.g. that the menu only ever *gains* commands — then
   `cp harness/new.cjs harness/ref.cjs` to accept the new baseline

**The differential is the safety net for refactors.** Ten seeded games must play identically
unless the change is meant to alter play.

**Every UI change in this project that looked cosmetic turned out to be hiding a rule.** The
question to ask of a drawing that does something the panels do not is not *"how do I draw
this"* but **"where is this drawing getting its answer, and is it the same place the menu gets
its answer?"**

**And check that your checks can fail.** Two of this project's tests could not. `test-orders.js`
— the command layer's regression test — ended in `process.exit(fail ? 0 : 0)`, so both branches
returned success. And the render smoke test had been failing for an unknown length of time,
asserting on a string the interface does not render, behind a `node smoke.cjs | head -1` that
truncated the message away *and* discarded the exit code, because a bash pipeline reports its
last command's status and `pipefail` was not set. `run-all.sh` reported a pass on a failing test.

Both are fixed, and both fixes were then confirmed by deliberately breaking an assertion and
watching the harness go red. That last step is the point: **a guard you have never seen fail is
not a guard, it is a decoration.** Every check here was written in response to something that
actually broke, which makes it easy to forget that the check itself needs proving.

---

## What is not here

The game has **no victory condition** (§12 of the rulebook), so "good play" is undefined.

An LLM court was prototyped alongside the game and has been removed: a **scribe** (prose
instruction → commands) and an evaluation bench that measured it. Both were built for a sandbox
that no longer exists — the transport called `api.anthropic.com` with no credentials, through a
gateway that supplied them — and the bench's committed corpus was 1.3 MB of generated JSON.
`Order` stays in the engine, because the commands-to-intent pivot is the engine's own and
`test-orders.js` is its regression test; everything model-facing is in git history.

The one measurement finding worth carrying into whatever comes next: **a directive must be as
specific as the decision it governs.** Every ambiguity left in an instruction became an error
that got blamed on the model.

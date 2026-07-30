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
npm test         # the harness: thirteen suites, armed invariants, the boundary, the render check
```

`npm run dev` keeps serving as long as its stdin is open — that is how esbuild's serve mode
behaves, so run it in a terminal you leave open rather than detached.

`npm test` shells out to `bash harness/run-all.sh`; on Windows run it from Git Bash or WSL.

**`CLAUDE.md` is the working guide** — the file map, the reading order, house style, the
invariants, and how to prove a change did what you think. Read it before editing.
**`TODO.md`** holds what is known and deferred. **`great-kings-player-rules.md`** is the
rulebook, and it claims to be exactly as implemented: a rules change means editing it too.

---

## The four ideas the code is built on

**1. `dispatch` is the whole API.** One door into the engine. It is a *total function*: any
command in any state is either applied or refused with a chronicle line — never a throw.
`availableCommands(g)` says what may be done, and `validCmd` gates every command against it
without exemption.

The consequence worth internalising: **if a precondition is not in `availableCommands`, it is
not a rule.** A rule enforced by a disabled button, or by a panel simply not drawing something,
is not enforced for anything that drives the game through `dispatch` — which is every test,
every future agent, and the interface itself.

The engine's export list is deliberately short, and its length is load-bearing. An export that
lets a caller ask "is this allowed?" some other way is a second answer to a question
`availableCommands` already answers. See the block at the foot of `engine.js`.

**2. `Order` — the pivot between commands and intent.**

```
commands ──Order.read──▶ ORDER ──Order.commands──▶ commands   (exact, no model)
```

An ORDER is one action-proper, fully specified: actor, verb, target, source, buildType, goods,
pay, payGoods, tapSlots, basket, units, strikes. `Order.commands` is the executor, the dry-run
validator and the specification checker in one walk — it reads the live menu and keeps whatever
the order licenses. **One candidate → forced. None → the order is wrong. Several of different
kinds → the order does not say enough**, and it says so.

`harness/engine/test-orders.js` walks the engine's own play and round-trips every action it
finds. That is the regression test for the command layer: add a command no order can express
and it fails.

**3. `view(g)` — one question, one answer.** Three consumers ask different questions and none
gets another's answer reshaped:

```
a model asks   "what may I do?"    → availableCommands(g)
the table asks "what do I show?"   → view(g)
a test asks    "what is true?"     → query(g, q)
```

The table does **no reasoning**. It does not check whether a payment suffices, count what is
left, or know that commands have types. It reads panels and draws them, and ships back the
command attached to whatever was clicked.

**Its whole reach into the engine is three functions** — `view`, `dispatch`, `initState` — and
it **reads no field off `g` at all.** It holds the state only to hand it back to `dispatch`;
its render state is the view itself, asked once per command. A direct read of `g` from the interface
would be a second source of a fact the view already reports, and a second source is how every
bug in this project got in. If something is missing, the fix is a field on the view.

The view's own contract — the option shape, the seven bands, the panel kinds, the map keyed by
place — is documented at `THE VIEW` in `engine.js`, beside the code that has to honour it.

**4. Two digests, two questions.** Keep them apart or each gets used for the other's job.

| | hashes | answers |
|---|---|---|
| `g.chain` | the **command stream** | *same trajectory?* |
| `fingerprint(g)` | the **world** | *same position?* |

Every accepted command advances the chain. Anyone issuing a command may carry the chain of the
world it was written against, and the gate refuses it if the world has moved — which is what
makes a slow agent safe on shared state. The fingerprint ignores `log`, `chain` and `step`, so
two routes to the same board compare equal; it is exact at action boundaries.

---

## What is not here

The game has **no victory condition** (§12 of the rulebook), so "good play" is undefined.
Dispositions are stubbed — every region behaves "Soft".

An LLM court was prototyped alongside the game and has been removed: a scribe that turned prose
into commands, and a bench that measured it. Both were built for a sandbox that no longer
exists. `Order` stays in the engine, because the commands-to-intent pivot is the engine's own
and `test-orders.js` is its regression test; everything model-facing is in git history.

The one measurement finding worth carrying into whatever comes next: **a directive must be as
specific as the decision it governs.** Every ambiguity left in an instruction became an error
that got blamed on the model.

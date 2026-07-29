# Working on The Great Kings

A Late Bronze Age hot-seat strategy game. Plain JavaScript and JSX; React, two `esbuild`
command lines, no other build config.

`README.md` explains what the program *is* — the four ideas it is built on. This file is how to
change it without breaking it.

---

## The files

```
index.html         the page; loads levant/main.js
levant/
  engine.js        THE RULES. No React, no JSX, no DOM. ~2,700 lines, 29 exports.
  app.jsx          THE TABLE. The hot-seat interface. ~530 lines; reads no field off `g`.
  main.jsx         the only file that knows a DOM exists: mounts App.
  table.css        the utility classes app.jsx's layout depends on.
harness/
  run-all.sh       everything, in one command (`npm test`)
  render-check.jsx does the table draw, at both sizes?
  engine/
    test-*.js      ten suites, 112 assertions
    drive.js       plays a seeded game, prints a fingerprint
    diff.sh        replays 10 seeds against ref.cjs — a pure refactor must be identical
    check.sh       bundle + differential, quickly
great-kings-player-rules.md   the rulebook, current with the engine
```

Generated and gitignored: `levant/main.js`, `levant/main.css`, `harness/new.cjs` (the engine
bundle the suites import), `harness/ref.cjs` (the differential's baseline).

**Reading order for `engine.js`:** `REG`/`BT` (the world as data) → `ACTIONS` (every verb's
range, cost, targets, commit) → `dispatch`/`availableCommands` (the command layer) → `view`
(what the table is told) → then the harness.

**Platform:** `npm test` runs `bash harness/run-all.sh`. On Windows use Git Bash or WSL.

---

## The two invariants

These are not style preferences. Every bug this project has had was a violation of one of them.

**1. If a precondition is not in `availableCommands`, it is not a rule.** A rule enforced by a
disabled button, or by a panel simply not drawing something, is not enforced at all — anything
driving the game through `dispatch` will walk straight past it. `dispatch` is gated on
`availableCommands` (bar a short `UNGATED` list), so a precondition put there is enforced for
every caller for free.

**2. The table's whole reach into the engine is `view`, `dispatch`, `initState` — and it reads
no field off `g`.** It holds the state so it can hand it back to `dispatch`; everything else
comes from `view(g)`. The table does no reasoning: it does not check whether a payment
suffices, count what is left, or know that commands have types. If the interface needs a fact,
`view` grows a field. If it needs to know whether something is allowed, the answer is already
in the option's `cmd` being `null`.

A corollary for the export list at the foot of `engine.js`: **export nothing without a caller.**
An export that lets a caller ask "is this allowed?" some other way is a second answer to a
question `availableCommands` already answers.

---

## House style for the engine

The engine is written one way on purpose, and it will rot back into a thicket the first time
someone adds "just one more branch".

**1. One general path, specialised by data.** If two things differ only in their parameters,
they are ONE thing. Write the general case once and let the differences be values. Surface
differences are not real differences until you have tried to unify them and failed.

- `ACTIONS` — every verb's range, cost, targets and commit. `legalTargets` and `clickRegion`
  are dispatchers over it, not chains. `searaid` is literally `ACTIONS.searaid = ACTIONS.raid`.
- `g.contest` — every auction. A raid partitions players into two parties over one lot per wild
  people; a subversion makes each player their own party over one lot.
- `reach()` — every "how far from here?". An army's road and an envoy's route are the same walk
  with a `bySea` flag.
- `works()` — every "which buildings are…?". One walk plus a predicate.

**2. Specialisation is a field, not a branch.** Variants are toggles on a struct — `kind`,
`binding`, `party`, `oncePerYear` — read by one code path. A switch on a kind tag is allowed
ONLY where the behaviour is genuinely irreducible, and it belongs at the leaf, never at the
root. The contest switches on `kind` in exactly one place: the payout, because a warband and a
stripped influence really are different things.

**3. Fat structs, and zero is a valid default.** One struct carries the union of fields across
variants; absent means "no". `BT` is the model: `yields`, `unit`, `walls`, `capBonus`, `annex`
— the engine reads fields, it does not switch on building type. No constructor ceremony, no
"is it initialised yet" checks.

**4. No "every case gets a code path".** Adding a verb means adding an entry to `ACTIONS`.
Adding a seat building means an entry in `ANNEX_ACTORS` (its `verbs` live there — do not
re-list them elsewhere). Adding a cost means a `cost` spec; the three cost interpreters are the
ONLY code that knows what a cost means. If you find yourself typing `if (m.v === …)` or
`if (bd.t === …)` outside a table, stop: the knowledge belongs in the table. A uniform rule
beats a special case even when it changes behaviour slightly.

**5. `dispatch` must be total.** Every command, in every state, is carried out or refused —
never a crash. That is what the gate at the top of `dispatch` is for. Do not scatter
null-checks through the cases.

The same gate enforces **freshness**. Anyone issuing a command may carry the chain of the world
it was written against, and the gate refuses it if the world has moved. This is what makes a
slow agent safe on shared state: a model call takes seconds, and in that time a player may
click. The dangerous case is not an illegal command but a LEGAL one whose meaning changed
underneath it. Callers stamp; the core decides. Do not add per-agent locks or turn checks in
the interface to compensate — they protect nothing.

**6. Flat and short.** Shallow nesting, small functions, control flow you can read straight
down. `clickRegion` is eight lines. Keep it that way.

---

## Proving you did not break anything

The command layer is deterministic, so a refactor is checkable rather than hopeable.

```bash
npm test    # differential, ten suites, sources compile, table renders
```

**A pure refactor must produce identical play.** `harness/engine/diff.sh` replays 10 seeded
games against `harness/ref.cjs` and compares chronicle hash, stores and influence. Anything
less than 10/10 identical means you changed behaviour, whether you meant to or not.
`harness/engine/check.sh` is the quick version: bundle, then differential.

**A deliberate rules change will and should shift that fingerprint.** When it does:

1. prove the change is the one you intended — e.g. that the menu only ever *gains* commands
2. `cp harness/new.cjs harness/ref.cjs` to accept the new baseline
3. update `great-kings-player-rules.md`, which claims to be exactly as implemented

On a fresh clone there is no `ref.cjs`, so the first run establishes one and compares nothing.
That is expected, and it is not a pass.

**Add coverage for a mechanic BEFORE refactoring it.** Random play is uneven — it lands trade
around 1,900 times per 8 seeds and treaty once — so the thin verbs (`treaty`, `searaid`, the
raid and subversion contests) are pinned by hand in `test-verbs.js`, `test-raid.js` and
`test-subvert.js` or they get silently broken.

**Check that your checks can fail.** A guard you have never seen fail is not a guard, it is a
decoration. Two of this project's tests could not fail — one ended in `process.exit(fail ? 0 :
0)`, and one asserted on a string the interface never rendered, behind a pipeline that
discarded the exit code. When you add or fix an assertion, break it deliberately once and watch
the harness go red. `pipefail` in `run-all.sh` is load-bearing for exactly this reason.

**Every UI change in this project that looked cosmetic turned out to be hiding a rule.** The
question to ask of a drawing that does something the panels do not is not *"how do I draw
this"* but **"where is this drawing getting its answer, and is it the same place the menu gets
its answer?"**

---

## TODO.md

`TODO.md` contains future things to do. Whenever we notice something not urgent or outside the
current task, add it to the TODO as a section. Whenever a TODO item is addressed, remove the
section. Do not leave behind text for completed todos.

**Where a TODO item has a site in the code, annotate that site with a `TODO:` comment** naming
the section it belongs to, so the two ends stay findable from each other:

```js
// TODO: vestigial fields — nothing ever writes `bd.capGoods`, so this branch is always 1.
```

`grep -rn "TODO:"` must therefore agree with the sections in `TODO.md`. When a section is
removed because the work is done, remove its `TODO:` comments in the same change.

---

## Comments

**Never write a narrative comment.** A comment here describes how the code IS and what must
stay true of it — never what it was, what changed, what broke, or what you just did. If you
find yourself writing "used to", "no longer", "this was wrong", "now it reads", or recounting a
bug, stop and write the constraint instead. That belongs in the commit message.

Comments state rules, not history. A comment earns its place — whether you are writing it or
deciding whether to keep one — by passing one of three tests:

1. **It states a rule or invariant the code cannot state itself.** Keep. (`usable`'s "WHOSE IS
   IT?"; the `BT` field key; "compare `step`, never read it.")
2. **It explains a non-obvious *why* that constrains future edits.** Keep — phrased as a
   standing constraint, in the imperative present.
3. **It narrates a past state of the repository.** Delete. Unless it names a trap someone would
   fall back into, in which case compress to one imperative sentence and drop the story.

The failure mode to avoid is the changelog comment: `// This used to read g.rel directly`. It
tells a reader nothing they can act on, and it goes stale silently. Write the constraint
instead: `// The rung comes from view(place.relations); reading g.rel here is a second source.`

Corollaries:

- **One canonical home per rule.** If a constraint is worth stating, state it at the code it
  constrains, and cross-reference from elsewhere rather than restating. Four copies of one
  explanation are four places for the truth to drift.
- **Do not put counts in prose you will not re-check.** Line counts and assertion totals in
  this file and the README are approximate on purpose; the exact ones live in test output.
- **A commit message is the right place for "why I changed this".** A comment is for "why it is
  this way".

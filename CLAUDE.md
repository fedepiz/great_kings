# Working on The Great Kings

## House style

The code is written one way on purpose, and it will rot back into a thicket the first time
someone adds "just one more branch".

**1. One general path, specialised by data.** If two things differ only in their parameters,
they are ONE thing. Write the general case once and let the differences be values. Surface
differences are not real differences until you have tried to unify them and failed.

**2. Specialisation is a field, not a branch.** Variants are toggles on a struct, read by one
code path. A switch on a kind tag is allowed ONLY where the behaviour is genuinely
irreducible, and it belongs at the leaf, never at the root.

**3. Fat structs, and zero is a valid default.** One struct carries the union of fields across
variants; absent means "no". Read fields; do not switch on type. No constructor ceremony, no
"is it initialised yet" checks.

**4. No "every case gets a code path".** Adding a case means adding an entry to a table, not a
branch to a function. If you find yourself testing a kind tag outside a table, stop: the
knowledge belongs in the table. A uniform rule beats a special case even when it changes
behaviour slightly.

**5. An entry point must be total.** Every input, in every state, is carried out or refused —
never a crash. That is what a gate at the top is for. Do not scatter null-checks through the
cases.

The same gate is where **freshness** belongs. Anyone issuing an instruction may carry a stamp
of the version of the world it was written against, and the gate refuses it if the world has
moved. This is what makes a slow caller safe on shared state: the dangerous case is not an
illegal instruction but a LEGAL one whose meaning changed underneath it. Callers stamp; the
core decides. Do not add locks or turn checks at the edges to compensate — they protect
nothing.

**6. Flat and short.** Shallow nesting, small functions, control flow you can read straight
down.

**7. An assertion states what must never be false.** An invariant belongs at the code it
constrains, once — not restated as an example in a test. Armed by a flag the test run exports,
so every walk the harness already owns checks every invariant and new coverage costs no new
test.

- **An assertion is not a rule and not a refusal.** A rule holds every caller to it whether the
  assertions are armed or not; a refusal is the entry point setting an instruction aside. An
  assertion firing means the world is no longer legal.
- **It throws, and the run stops. Do not soften one into a log line.** Everything computed from
  a broken state is meaningless, so a count of violations gathered along a walk measures how far
  the walk went, not how many things are wrong: one corrupt state is re-observed at every state
  after it.
- **The detail argument is a replay handle, not a message.** Carry whatever names the
  trajectory that reached here.
- **Assert only what holds, not what ought to.** A walk finding no counterexample is not a
  proof. When an invariant needs a scope, put it at that boundary — or drop it and state the
  reason at the site.

The three homes, by what they claim:

| where | claims |
|---|---|
| a whole-state check | true of every state |
| a derived-output check | true of every output the core hands out |
| at the site | a pre- or postcondition of one routine |

**Proving an assertion can fire takes one of two routes**, and which one tells you what kind of
claim it is. If corrupting a state falsifies it, the mutation is the proof. If the claim is that
two code paths agree, no state falsifies it, because the core repairs the state on the way
through; break the source line once, watch it fire, revert.

**8. Tables and passes, not containers and queries.** State is flat arrays of fat structs,
swept whole; it is never an object graph interrogated one node at a time. When one table must
meet another, write the meeting as a **batch pass**: a sort-merge riding an order the gate
already established, or a `Map` built in one pass and drained in the next. Both are joins;
choose the merge when the order is already there to ride, the map when none exists and one
meeting does not justify one. What this rule bans is the third style — lookups scattered
per-item through the logic, hiding a table scan inside every innocent loop.

- **An ordering is an invariant like any other.** One comparator is the single source of the
  order — the sort, the merge, and any future binary search all call it, so they cannot
  disagree. Establish the order at the gate; exploit it everywhere; assert it with an adjacent
  scan (`order(a[i-1], a[i]) < 0` checks sorted *and* unique in one line).
- **Scratch is born and dies inside one function.** A join's working set (half-entries, row
  buffers) is local to the pass that uses it. Never store a derived index in State — a cached
  lookup structure is a second source of truth that every mutation must now maintain.
- **When two passes differ only in which field they stamp, they are one pass** — make the
  difference a tag on the work item (a halfedge knows which end it anchors) and switch on it at
  the leaf. The merge machinery then exists once and can only be wrong once.
- **A hash container is pass-local scratch, never state.** A `Map`/`Set` built and drained
  inside one function is a legal join tool; stored in State it is a derived index — a second
  source of truth every mutation must maintain. The escape hatch for a lookup a profile shows
  hot is indices resolved at the gate, not a persistent map.
- Ids are names for the boundary (conf, errors, replay traces); positions and indices are for
  the core. Resolution happens at the gate, once.

---

## Comments

**Never write a narrative comment.** A comment here describes how the code IS and what must
stay true of it — never what it was, what changed, what broke, or what you just did. If you
find yourself writing "used to", "no longer", "this was wrong", "now it reads", or recounting a
bug, stop and write the constraint instead. That belongs in the commit message.

Comments state rules, not history. A comment earns its place — whether you are writing it or
deciding whether to keep one — by passing one of three tests:

1. **It states a rule or invariant the code cannot state itself.** Keep.
2. **It explains a non-obvious *why* that constrains future edits.** Keep — phrased as a
   standing constraint, in the imperative present.
3. **It narrates a past state of the repository.** Delete. Unless it names a trap someone would
   fall back into, in which case compress to one imperative sentence and drop the story.

The failure mode to avoid is the changelog comment: `// This used to read the field directly`.
It tells a reader nothing they can act on, and it goes stale silently. Write the constraint
instead: naming where the value legitimately comes from, and that reading it anywhere else is a
second source.

Corollaries:

- **One canonical home per rule.** If a constraint is worth stating, state it at the code it
  constrains, and cross-reference from elsewhere rather than restating. Four copies of one
  explanation are four places for the truth to drift.
- **Do not put counts in prose you will not re-check.** Line counts and assertion totals are
  approximate on purpose; the exact ones live in test output.
- **A commit message is the right place for "why I changed this".** A comment is for "why it is
  this way".

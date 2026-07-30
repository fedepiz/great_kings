# TODO

This document contains future things to do. Whenever we notice something not urgent or outside
the current task, add it to the TODO as a section. Whenever a TODO item is addressed, remove the
section. Do not leave behind text for completed todos.

Where an item has a site in the code, annotate that site with a `TODO:` comment naming the
section it belongs to, so the two ends stay findable from each other — `grep -rn "TODO:"` must
agree with the sections below. When a section goes because the work is done, its `TODO:`
comments go with it in the same change.

---

## Tests that encode constraints instead of exercising code

The engine states its own invariants now — `ASSERT`, `checkWorld`, `checkMenu`; see CLAUDE.md §7.
Most of the suite predates that and spends its assertions three other ways: restating a rule the
engine can state, pinning a constant that lives in a table, or asserting that a deleted feature
is still deleted. Four assertions cannot fail at all.

**The test to apply to each one: if a legitimate edit — retuning `capBonus`, changing a fixture's
opening influence, renaming a command — turns it red without anything having broken, it encodes
a constraint rather than checking behaviour.** What earns a test's place is exercising a path, or
checking an oracle whose value is not derivable from the code under test.

**Delete — nothing replaces them.**

| site | what |
|---|---|
| `test-economy.js` "state shape" | asserts `pendingOverflow` and `committed` are absent; nothing writes either |
| `test-economy.js` "nothing is turned away" | sets a stock to 20, adds 5, asserts 25 — no engine code runs, and `before` is never read |
| `test-economy.js` "no overflow commands survive" | a 6,000-step walk that confirms four deleted command names never appear; `COMMANDS` closure covers this for every name, not four |
| `test-hash.js` `ok(true, "→ the fingerprint is route-independent…")` | a comment counted as a passing assertion; make it a `console.log` |

**Delete — an assertion already covers them.**

| site | assertion |
|---|---|
| `test-ownership.js` "who owns what", "what a build produces" | `checkWorld` — a work answers a power or its own province |
| `test-economy.js` "a sourcing must actually pay" | `checkMenu` — `commitTaps` ⟺ the taps pay |
| `test-commands.js` "a court may always set down what it has picked up" | `checkMenu` — an open activation offers a way out |
| `test-subvert.js` "once per target per year" | `checkMenu` — the menu never re-offers a spent target |
| `test-raid.js` "goods leave the stores", "everything laid stays" | `dispatch` — a contest mints or burns no goods |

**Rewrite — keep the claim, drop the literal.**

| site | from | to |
|---|---|---|
| `test-economy.js` "the Food Store" | `foodStore === 1`, `=== 3` | loop `Object.keys(BT)`: placing `t` moves the store by `BT[t].capBonus \|\| 0` |
| `test-ownership.js` "follows the writ" | `atFriend === 1 && atSubject === 3` | `atSubject - atFriend === BT.granary.capBonus` |
| `test-economy.js` "what winter takes" | four asserts evaluating `max(0, food - due - keep)` by hand | keep the two boundaries — exactly `due + keep`, and below `due` where the clamp lives |
| `test-ownership.js` "a province's works answer whoever holds it" | a six-row `usable` truth table transcribing a three-line function | one property: raising a rung never revokes a command |
| `test-war.js` "the foremost, and ties" | three hand-built argmax tables | `foremostIn` against a brute-force oracle, every province × every state of a walk |

**Fix — and expect to learn something.** Three checks whose outcome is unknown because none has
ever been written honestly:

- `test-ownership.js` "markets open to Ties+" asserts `acts.length >= 0`. Write `> 0`. If it
  fails, either the rule is not what the message claims or the fixture supplies no sources.
- `test-verbs.js` "only warriors sail" asserts `every(r => R[r].coast || true)`. `R[rid].coast`
  has never existed — coastal is `slots.some(s => s.c)`, see `isCoastal`. Write it and run it.
- Two disjunctions admit the failure they exist to catch: `test-verbs.js` "the treaty costs a
  command" passes when the activation vanished, and `test-raid.js` "the contest resolves" admits
  three outcomes including nothing having happened. Tighten both.

**Keep untouched.** `test-view.js`, both `test-commands.js` fuzzes, `test-orders.js`,
`test-hash.js`'s route-independence and record-wipe, the render check, and the resolution oracles
in `test-subvert.js` and `test-verbs.js` — "everyone else drops by the winner's standing" and
"overtaking demotes the incumbent" are rules with content, not restatements.

**Still wanted as assertions, and not yet written:** a contest's `turnOrder` is ascending by
influence; the reckoning leaves every good but food untouched; a basket stays with its lot
through resolution, not only across `bid`/`bidTake`.

**Order.** Delete the dead and the subsumed first — both are safe, and the subsumed ones only
after their assertion has been seen to fire. Then the rewrites. Then one parameterised
`walk({ seeds, rounds, choose, onState })` to replace the per-file xorshift and `clone`
copies, and a coverage ratchet over `COMMANDS` and `ACTIONS` keys — a coverage-directed
`choose` is what reaches `treaty` and `searaid` without a hand-built board, and `endRaid` and
`stand` are reached by no walk at all — only by `test-strike.js`'s hand-built boards.

**One constraint this work established: a walk finding no counterexample is not a proof.** An
invariant asserting `strained` against its floor survived 25,000 states of one walk, and another
walk's choice policy broke it on its first pass. Assert only what has been measured to hold, and
prefer breaking the source to confirm an assertion fires over trusting that it would.

## An empty container is not the absence of one, so `fingerprint` distinguishes equal worlds

`canonical` sorts keys but keeps empty ones, so `{}` and an absent key serialise differently.
`bid` then `bidTake` therefore leaves a different fingerprint than never bidding at all — the
world is identical but `contest.lots[pid].atk` has become `{}` where it was absent. It shows on
roughly half the reversible bids a walk reaches.

This is not a play defect: nothing reads the difference. It weakens the ORACLE. `fingerprint` is
what `test-orders.js` compares to judge "same world, different route" for every action it
round-trips, and what `diff.sh` compares across seeds — so a route that legitimately reverses
itself reads as having changed the world.

The fix is a line in `canonical`: skip a key whose canonical form is `{}` or `[]`. **It shifts
the fingerprint**, so it belongs in its own commit with a fresh `ref.cjs`, and the differential
reporting 0/10 is the expected outcome rather than a regression.

## Vestigial fields

Three fields exist in the state or on a struct but nothing reads them, or nothing writes them.
They are marked `VESTIGIAL` at their sites so nobody mistakes one for a working mechanism and
builds on it:

| field | site | condition |
|---|---|---|
| `bd.capGoods` | `yieldOf` | never written, so the branch is unconditionally `1` |
| `g.rot` | `nextPlayer`, `finishUpkeep` | maintained and reset, never read |
| `c.deny` | `commitUnit`, `defenceStrength` | written as `!!u.deny`, and `battleUnits` never sets `u.deny` — so always false, and the filter removes nothing |

Each is a half-stated rule, not a hook: a per-building yield, a within-year round counter, and a
unit that takes the field without counting are all rules that would need designing before the
field means anything. So the decision is per field: design the rule, or delete it.

**Deleting is a behaviour change, not a cleanup.** They are part of the serialised state, so
removing `g.rot` shifts `fingerprint(g)` and the differential will report 0/10. That is correct
and expected — but it means the removal belongs in its own commit, with a fresh `ref.cjs`.

## `forfeit` cannot be told apart from its own confirmation

`forfeit` is the only two-word command: the first arms it, the second carries it out, and any
`pass` disarms it. But `availableCommands` offers the identical `{t:"forfeit"}` in both states,
so nothing driving the game through `dispatch` can tell the arming word from the fatal one
without reading `g.confirmForfeit` — which the interface is not allowed to do, and which `view`
does not report.

For the hot seat this is harmless: the table's own click sequence supplies the two words. It
becomes a real defect the moment anything else drives the game. The fix is one of:

- have `availableCommands` distinguish them (`{t:"forfeit", confirm:true}`), which makes the
  distinction visible to `cmdKey`, the chain, and every caller; or
- report the armed state as a fact on `view`, and leave the command alone.

The first is the better shape — the menu should say what a command will do — but it changes the
command surface, so it wants pinning in `test-commands.js` first.

## The table never says which power is acting, and control interleaves

The interface gives no clear statement of whose word the next command is. It matters most in the
cases where the desk is NOT the power whose turn it is — control passes mid-action to a raid's
defenders one at a time, to each participant in a subversion's bidding, and to whoever must
choose abandonments in a famine. A player looking at a muster prompt has to infer from the
panel's own label which court is being asked.

The facts are already reported; this is a table-side change. `view` returns both `seat` (whose
turn it is) and `effectiveSeat` (whose desk the next command comes from). `app.jsx:33` takes
`const p = v.seat` and never reads `effectiveSeat` at all — so anything the table tints or
labels from `p` speaks for the turn-holder even while another court is acting. Worth checking
what currently keys off `p`: the notice colour, the `subject.self` highlight on the power cards,
and the title block.

To decide: whether the two seats want distinct treatments (a persistent "X to act" line, versus
a temporary "Y is answering" state), and whether an interleaved actor should be visible on the
board as well as in the panel.

## Two answers to "who patronises this people?"

`battleUnits` and `biddablePeoples` each decide whether a wild people already has an Ally+ patron,
and they decide it differently: `live(g).find((q) => rank(g, q, rid) >= 2)` takes the FIRST living
power that qualifies, while `biddablePeoples` loops `for (const q of PLAYERS)` and keeps the LAST,
over all five rather than the living. Ally is exclusive and forfeit zeroes a court's ties, so the
two should never disagree today, which is exactly what makes this worth closing before something
lets them: the question is asked twice and answered by two different walks.

One of them should be the answer — `patronOf(g, rid)` beside `biddablePeoples` — and the other
should call it. Nothing about play changes, so the differential should stay 10/10; if it does not,
the two were already disagreeing and the seed that shows it is the interesting artefact.

## The suites read facts through eleven exported internals, not a door

The export list ends with a block marked "READ BY THE SUITES ONLY" — `costTapCovered`,
`foodRots`, `foodStore`, `foremostIn`, `infOf`, `legalTargets`, `specOf`, `tapYields`,
`upkeepDue`, `usable`, `yieldOf` — and beyond it the suites read `g.rel`, `g.b`, `g.players`,
`g.raid`, `g.contest`, `g.mode` directly. Every such read couples a test to the state's internal
shape, and the coupling has already produced the vacuous-pass disease once: `test-verbs.js`
asserts on `R[rid].coast`, a field that has never existed, and has passed for its whole life.

The fix is a third door beside the two that exist. `availableCommands` answers *"what may I
do?"*; `view` answers *"what do I show?"*; **`query(g, q)` answers *"what is true?"*** — with
the same laundering discipline `view` already obeys (the `bd.o` overload never leaves the
engine).

**The contract**, each clause earned by a scar:

- `q` is plain data — `{ask: "...", ...args}` in, a plain value out. Queries are serialisable,
  storable, comparable, generable.
- A `QUERIES` table with one dispatcher over it — the `ACTIONS` pattern. Each entry declares
  its arg spec; the dispatcher validates against `PLAYERS`/`R`/`GOODS` once, generically.
- **Total over well-formed queries; throws on malformed ones.** Deliberate contrast with
  `dispatch`: dispatch faces players and stale worlds, so it refuses politely; query faces test
  authors, and a typo'd query answering `undefined` is an assertion that cannot fail — the
  `R[rid].coast` disease.
- Answers are fresh values, never references into `g` — a returned live row would make the read
  door a write door.
- Every answer is computed in one place: an entry delegates to the engine's one computation of
  the fact (`foremost` → `foremostIn`). No query re-derives a rule.

**The vocabulary, v1** — derived from what the suites read today, nothing speculative:

| domain | ask | args | answer |
|---|---|---|---|
| the clock | `year` · `turn` · `desk` · `seated` | — | year; whose turn; whose desk answers next; powers still seated |
| | `passed` | power | bool |
| the ladder | `influence` | power, region | 0..n |
| | `standing` | power, region | `none·friend·ally·subject·home` |
| | `strained` | power, region | bool |
| | `foremost` | region | powers, ties included |
| | `patron` | region | a wild people's Ally+ patron, or null |
| the ground | `works` | region | `[{slot, type, owner, tapped, yield, answers}]` — owner a power or null; `answers` a power or `"province"` |
| | `coastal` · `neighbours` | region | bool; region ids |
| the stores | `stock` | power, good? | n, or the whole `{food, bronze, cloth, pottery}` |
| | `foodStore` · `upkeepDue` | power | the store's ceiling; `{food: n}` |
| the engagement | `engagement` | — | null, or `{kind: raid·subversion, phase, region}` |
| | `raid` | — | null, or `{target, attackers, mustered, strikes}` |
| | `contest` | — | null, or `{region, turnOrder, parties, lots}` |

`patron` grows `patronOf(g, rid)`, which closes "Two answers to who patronises this people?"
above. `works.answers` speaks `checkWorld`'s own phrase, so invariants written over queries
read like the rulebook.

**Deliberately absent:** legality — `availableCommands` IS that door, and a `may(power, verb)`
query for a power not at the desk would take a second rules engine; the chronicle — the
`said(g, /…/)` greps are a smell to retire, not enshrine; the digests — already doors.
`legalTargets` is the one awkward customer: leave it exported until the test purge above
decides its readers' fate.

**Its own proof:** a `test-query.js` that imports only `initState`, `dispatch`, `query` —
drive to a known position with commands, ask, compare — plus one cross-oracle: `foremost(r)` ≡
argmax over `influence(p, r)`, two queries answered by different internal paths, so agreement
means something. Scheduling (every command, every turn, at the end, on a sample) and
invariants-as-data (`{name, when, given, holds}`, predicates plain JS until three of them show
a shape worth a combinator) live in the harness, not the engine.

Landing it is a pure addition — the differential stays 10/10. Done means the "READ BY THE
SUITES ONLY" export block deletes, and the test rewrites above target queries instead of
internals.

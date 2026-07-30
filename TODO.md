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

**Delete — an assertion already covers them.**

| site | assertion |
|---|---|
| `test-commands.js` "a court may always set down what it has picked up" | `checkMenu` — an open activation offers a way out |
| `test-subvert.js` "once per target per year" | `checkMenu` — the menu never re-offers a spent target |
| `test-raid.js` "goods leave the stores", "everything laid stays" | `dispatch` — a contest mints or burns no goods |

**Rewrite — keep the claim, drop the literal.**

| site | from | to |
|---|---|---|
| `test-economy.js` "the Food Store" | `foodStore === 1`, `=== 3` | loop `Object.keys(BT)`: placing `t` moves the store by `BT[t].capBonus \|\| 0` |
| `test-ownership.js` "follows the writ" | `atFriend === 1 && atSubject === 3` | `atSubject - atFriend === BT.granary.capBonus` |
| `test-economy.js` "what winter takes" | four asserts evaluating `max(0, food - due - keep)` by hand | keep the two boundaries — exactly `due + keep`, and below `due` where the clamp lives |

**Fix — and expect to learn something.** Two disjunctions admit the failure they exist to
catch: `test-verbs.js` "the treaty costs a command" passes when the activation vanished, and
`test-raid.js` "the contest resolves" admits three outcomes including nothing having
happened. Tighten both.

**Keep untouched.** `test-view.js`, both `test-commands.js` fuzzes, `test-orders.js`,
`test-hash.js`'s route-pair, the render check, and the resolution oracles
in `test-subvert.js` and `test-verbs.js` — "everyone else drops by the winner's standing" and
"overtaking demotes the incumbent" are rules with content, not restatements.

**Still wanted as assertions, and not yet written:** the reckoning leaves every good but food
untouched; a basket stays with its lot through resolution, not only across `bid`/`bidTake`.

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

This is not a play defect: nothing reads the difference. It weakens the ORACLE. `fingerprint`
is what `test-orders.js` compares to judge "same world, different route" for every action it
round-trips, and what `test-hash.js`'s route-pair demands equality on — so a route that
legitimately reverses itself reads as having changed the world.

The fix is a line in `canonical`: skip a key whose canonical form is `{}` or `[]`. It shifts
every fingerprint, so it belongs in its own commit.

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
removing `g.rot` shifts `fingerprint(g)`; the removal belongs in its own commit.

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

## Six internals still leave by the suites-only block, not the query door

`query(g, q)` is open — the third door beside `availableCommands` and `view`, one `QUERIES`
entry per ask, validate-or-throw, answers as values; `test-query.js` is its proof. Five of the
eleven suites-only exports died with their last readers. Each of the six that remain is bound
to a test the tests section above already judges:

| export | last reader | dies with |
|---|---|---|
| `costTapCovered`, `specOf`, `tapYields` | `test-economy` "a sourcing must actually pay" | its deletion — `checkMenu`'s `commitTaps` biconditional covers it |
| `foodRots` | `test-economy` "what winter takes" | that section's rewrite, or a `foodRots` ask if the fact earns one |
| `usable` | `test-ownership`'s `usable` truth table | the rewrite to "raising a rung never revokes a command" |
| `legalTargets` | `test-view`'s closing contrast | nothing soon — that block is the documented proof of WHY the map must not read it |

Direct reads of `g` still standing in the suites, each a vocabulary decision not yet made:
the year's ledger (`g.spent`) in `test-subvert`, a commitment's terms and price
(`g.raid.atk[].terms`/`paidInf`/`defC`) in `test-strike`, the activation budget
(`g.act.capLeft`) in `test-verbs` and `test-commands`, and the chronicle greps
(`said(g, /…/)`) that the tests section already sentences. Extend the vocabulary only when a
reader earns it — an ask nobody asks is an export with no caller, one door over.

Scheduling (every command, every turn, on a sample) and invariants-as-data
(`{name, when, given, holds}`) remain harness work, waiting on the `walk()` consolidation in
the tests section; `test-query.js` carries the two invariants written so far (foremost ≡
argmax, contests ascend) inline.

## A successor to the differential

The seeded-robot differential (drive.js + diff.sh + ref.cjs) is removed. Its idea — determinism
makes a refactor checkable — was right; its method was not. The robot chose from
`availableCommands`, which itself mutates as rules change, so identical digests measured menu
stability, not rule stability; it ran one driver against two builds of a moving API, which is
exactly where it broke; and it demonstrably missed real defects (a rules change once turned 0
of 196 won raids into 185 plundering ones while the differential held 10/10 — see
test-strike's header).

A sound successor would fix the TRAJECTORY, not the policy: recorded command scripts — fixed
command lists from authored openings, replayed through dispatch, with the resulting chronicle,
chain and fingerprint pinned as goldens. A rules change then shifts named goldens, reviewed
like any diff, instead of a robot's whim. Whether that earns its keep beside the suites and
the armed invariants is the open question; design it before building it.

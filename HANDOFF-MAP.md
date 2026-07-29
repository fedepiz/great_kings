# HANDOFF — the map, and finishing `view`

Written at the point where every panel drew from `view(g)` and only the map did not.
**The map now does too.** Read `README.md` first for the four ideas the code rests on;
this file records what the map needed, what it turned out to be hiding, and what is left.

---

## Done

The table's coupling to the engine was two calls and one dispatch site, and all three were
the map. All three are gone.

```
                              before          after
dispatch sites naming a type      1               0
engine reaches                    2               1     (progressLine, for the scribe's prompt)
imports from engine.js           53              17     (33 had outlived their last caller)
app.jsx                         762             780
```

That last row goes the wrong way and is left as measured. The map's own code shrank — the
province block lost its rank/ally/coastal reasoning and its two hand-built commands — but the
comments recording *why* the board may not ask `legalTargets` are longer than the code they
replaced. Line count was a good proxy for coupling while whole panels were being deleted; it
is a poor one now, and the three rows above it are the ones that mean anything.

`view` gained a sixth panel kind. It is the only one that is not a list:

```js
{ kind: "map", band: "map", id: "map", regions: {
    NIP: { options: [ …the same option objects as anywhere else… ],
           slots:   { 0: [ …options… ], 2: [ …options… ] },
           subject: { region, home, holder, ally, rank, coastal, wild, acting } },
    … } }
```

Its own band, because it is not drawn in the column — the board places it, the way the
`courts` band is placed by the power cards. The table's whole map now reads:

```js
const place = mapOf(r.id);                        // everything known about this province
const pick  = takeable(place.options);            // the first option that may be taken
<rect … onClick={noDrag(() => pick && go(pick.cmd))} />
```

The three things the original handoff said to keep straight, kept:

**Coordinates stayed world data.** `REG` still holds `x`/`y`. The map panel carries no
geometry at all — the table owns the transform and nothing else.

**Colour stayed the table's reading.** `subject.holder` and `subject.rank` are facts;
`PCOL[holder]` is the table's interpretation, unchanged. `rank()` and `isCoastal()` moved
into `view`, and the table imports neither.

**The same option objects.** A province out of reach is `cmd: null` with a `why`, which the
board shows on hover exactly as a blocked sponsor shows it. Blocked options are emitted only
while an errand is actually looking for ground: with nothing to target there is nothing a
province could be refused *for*, and every region would otherwise carry a reason answering a
question nobody asked.

---

## The rule the map was enforcing

The old handoff said: *expect at least one, and `rank()` deciding what is clickable is the
obvious candidate.* `rank()` was innocent — it only ever chose a colour. The culprit was the
clickability test itself, and it was the project's recurring bug seen from the other side.

`legalTargets` was the map's private source of truth, and it does not know every gate that
stands in front of a command. Once all powers had passed, `availableCommands` returned
exactly `[{t:"resolveUpkeep"}]` — and `legalTargets` still reported every activatable
building, so **the board lit provinces that the menu refused**. Measured: 322 such states in
50,178.

What makes this worth recording is that no rule was broken. The click was refused, the
chronicle said *"That is not on offer now: activate HAT"*, the fingerprint did not move — the
gate held. This was not a rule living in the interface. It was **the interface disagreeing
with the engine about what the rules said**, which is the same disease one step earlier: the
board lied, and only a player's click discovered it.

The fix is not a patch. The map reads `av` — the same `availableCommands` walk the panels
read — so the two cannot come to disagree. `harness/engine/test-view.js` asserts it over
50,178 states and 505,145 options, and fails if the map is pointed back at `legalTargets`
(verified by doing exactly that).

---

## Open questions

**1. ~~Does the target panel stay when the map can do it?~~ SETTLED — both, deliberately.**
A list is easier to hit on a phone, a map easier to reason about on a desk. The duplication is
acknowledged and it is safe, because both are now built from the same `av` in the same pass:
they cannot drift apart the way the map and the menu did.

**2. What does a province say about itself?** Still open, and still the smaller half. The map
panel carries what is *clickable and why*, which is the part that mattered. Buildings and slot
contents are still drawn from `g.b` directly, as world data alongside the coordinates. Turning
those into `facts` per region remains more trouble than it is obviously worth.

**3. Should `view` be memoised?** Now worth measuring, where before it was speculative. `view`
is called once per `band()` plus once for the map and once for the power cards — seven-plus
walks of `availableCommands` per render, and the map now adds a `rejectReason` per unreachable
province during targeting steps. Nobody has profiled it and nothing feels slow, but if it
becomes heavy the answer is unchanged: memoise on `g.chain`, which is exactly what the chain
is for.

---

## How to know it worked

The acceptance tests for the whole `view` effort:

1. **Add a new verb, touch no UI file.** If `view` describes it, the table draws it — and now
   the board draws it too, since a new verb's targets arrive as region options like any other.
2. **Replace the whole table, touch no engine file.** Unblocked: a second front end consuming
   `view` now gets the map with it, rather than having to reimplement `legalTargets`.
3. **`check-chain.js` asserts `app.jsx` names no command types.** ✓ Added, and it passes.

That third one is worth a note. It is asserted in three shapes — building a command
(`t: "region"`), branching on one (`.t === "region"`), and testing a set of them
(`["forfeit","pass"].includes(c.t)`) — because the table used the first and the scribe uses
the third. A blunt scan for any command type appearing as a string **does not work**, and the
reason is instructive: panel kinds and command types are both English words from one
namespace and they collide. `note` is a real command (`{t:"note"}` writes a chronicle line)
*and* a real panel kind, so `pan.kind === "note"` looks exactly like the table naming a
command and is nothing of the sort.

Two command types are named in `app.jsx` and allowed: `forfeit` and `pass`, in the **scribe**,
which does not offer a model the two ways to end a turn without acting. That withholds nothing
from the player and enforces nothing on the engine — both stay on the menu, and the buttons
that send them are drawn from `view` like everything else. Any third fails the check.

The standing checks are now a suite rather than a habit — `harness/engine/test-view.js`, in
`run-all.sh`:

```
every option declares a state, and one the table knows
a blocked option carries a reason and is undispatchable   (cmd: null)
EVERY OPTION'S COMMAND IS ON THE MENU                     — the one that matters
every choices panel declares a pick
the map carries every region, always                      (nothing appears under the hand)
every region/activate/slot command is somewhere on the board
```

---

## A warning from the last three sessions, which held

Every UI change in this project that looked cosmetic turned out to be hiding a rule. The map
was no exception — though what it hid was subtler than a greyed button: not a rule enforced in
the interface, but a **second opinion about the rules** kept in the interface. The question to
ask of the next drawing that does something the panels do not is still the right one, with one
word changed:

> not *"how do I draw this"* but **"where is this drawing getting its answer, and is it the
> same place the menu gets its answer?"**

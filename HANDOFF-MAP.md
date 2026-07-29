# HANDOFF — the map, and finishing `view`

Written at the point where every panel draws from `view(g)` and only the map does not.
Read `README.md` first for the four ideas the code rests on.

---

## Where things stand

The table's coupling to the engine is down to **two calls** and **one dispatch site**, and
all three are the map:

```
levant/app.jsx, the <svg> block — 77 lines
  legalTargets(g)     to know which regions may be clicked
  rank(g, q, rid) ×2  to colour a province by whose writ it lies in
  isCoastal(rid)      to draw the shore
  g.act, g.out, g.b   read directly
  go({ t: "region" }) the one remaining dispatch
```

Everything else — the activation chooser, the errand grid, targets, build types, sponsors,
the contests, the courts, the notices — comes through `view` and is drawn generically. The
table no longer knows that commands have types.

**Measured before this work / now:** dispatch sites naming a command type 33 → 1, engine
reaches ~90 → 2, `app.jsx` 1,083 → 770 lines.

---

## What the map needs that `view` does not yet give

Panels are a **list**; the map is **spatial**. A province is drawn once and may host several
options at once — build here, entreat here, levy here — so the map cannot consume a flat
list of choices. It needs the same facts **indexed by place**.

The shape I would propose, as a sixth panel kind:

```js
{ kind: "map", band: "detail", regions: {
    NIP: { options: [ …the same option objects as anywhere else… ],
           note: "strained — breaks next upkeep",
           subject: { holder: "B", rank: 3, coastal: false } },
    …
  } }
```

Three things to keep straight while doing it:

**Coordinates are world data, not display.** `REG` holds `x`/`y` and that is correct: where
Ugarit sits relative to Byblos is a fact about the world, like which regions border it. A
different scenario places them differently. The table owns the *transform* — pan, zoom,
pixels, colour — and nothing else. This was argued and settled; do not "fix" it.

**Colour is the table's reading of a fact.** `subject.holder` and `subject.rank` are facts;
`PCOL[holder]` is the table's interpretation. That pattern already works in the court cards.
So `rank()` and `isCoastal()` move into `view`, and the map reads what they produced.

**The same option objects.** A region's options should be the *identical shape* used
everywhere else — `label`, `gloss`, `cmd`, `state`, `category`, `why`. A blocked province
(out of reach, wrong rung) is an option with `cmd: null` and a `why`, exactly as a blocked
sponsor is. That is what makes "click the map" and "click the panel" the same act.

---

## Open questions, unsettled

**1. Does the target panel stay when the map can do it?** Today `view` emits a `target` panel
listing legal provinces *and* the map highlights them. That is two ways to do one thing —
which is usually the smell this project has been removing. But a list is easier to hit on a
phone, and the map is easier to reason about on a desktop. Possibly both, deliberately, with
the duplication acknowledged; possibly the list only when the map is not visible.

**2. What does a province say about itself?** The map currently shows buildings and slots.
Whether that becomes `facts` per region, or stays the table's own drawing from `g.b`, decides
how much of the map is really "view-driven". Drawing the buildings from a structure may be
more trouble than it is worth; deciding *which provinces are clickable and why* is the part
that matters.

**3. Should `view` be memoised?** It is called several times per render (once per `band()`)
and walks `availableCommands` each time. Nobody has measured it. If the map makes it heavy,
memoise on `g.chain` — which is exactly what the chain is for.

---

## How to know it worked

The acceptance tests for the whole `view` effort, of which the map is the last piece:

1. **Add a new verb, touch no UI file.** If `view` describes it, the table draws it.
2. **Replace the whole table, touch no engine file.** A second front end consumes the same
   `view`.
3. **`check-chain.js` asserts `app.jsx` names no command types.** Today that would fail on
   one — the map's `region` click. After the map, it should pass, and the assertion is worth
   adding so it cannot regress.

And the standing checks that caught real bugs during this work, worth re-running after:

```js
// no view panel goes undrawn
// every option declares a state; every choices panel declares a pick
// lists do not change length mid-step  (the errand grid, checked across 4,771 states)
// a notice never contradicts the buttons  (no "still owed" while Settle is offered)
// every open activation offers a way out
```

---

## A warning from the last three sessions

Every UI change in this project that looked cosmetic turned out to be hiding a rule:

- greying a button was **the only thing** enforcing that taps must cover the bill
- a panel not drawing something was **the only thing** stopping an ungated command
- a way out disappearing was a **gate condition**, not a layout accident

So when the map does something the panels do not, the first question is not *"how do I draw
this"* but **"which rule is the map currently enforcing on the engine's behalf?"** Expect at
least one. `rank()` deciding what is clickable is the obvious candidate.

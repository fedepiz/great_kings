# KNOWN ISSUES

Things that are wrong and known to be wrong. Nothing here is papered over: the tests that
find them are left **failing**, so they cannot be forgotten.

---

## 1. ~~One action in ~300 does not round-trip~~  *(CLOSED — three bugs, not one)*

`test-orders.js` is now **236/236**. The single symptom hid three separate faults, each
masking the next:

**a. `restoreCourt` was being treated as an action.** When a power loses its last palace it
rebuilds one; there is no choice in it. The action-cutter glued that command onto the front
of the next real action, so the order described a trade that began with a palace appearing.
Joined `resolveUpkeep` and `perish` in the not-an-action set.

**b. `Order.read` recorded raids as trades.** A building with one errand selects its own verb,
so no `verb` command appears in the trace. The fallback guessed `"trade"` — silently correct
for markets and ports, silently wrong for stables and warriors. An order carrying the wrong
verb licenses the wrong commands, so `launch` was never permitted and the raid expanded to
three commands instead of four. The verb is now read from the MODE, which is named for the
verb it serves, with the set taken from `ACTIONS` so it cannot drift.

**c. `launch` waited for the basket but not for the units.** It therefore competed with the
very commitments it was waiting for, and the expansion reported ambiguity. It now waits for
everything the order names to be on the field.

The lesson worth keeping: **the schema was complete all along.** All three faults were in
what the engine *read out of* a trace or *permitted* from an order — not in what an order can
express.

## 2. ~~The payment rule is enforced by the UI, not by the engine~~  *(CLOSED — the fix landed; this entry was stale)*

The one-line fix described below is **in the engine**, at the `commitTaps` push in
`availableCommands`:

```js
if ((m.taps || []).length && costTapCovered(specOf(m), m, tapYields(g, m))) out.push({ t: "commitTaps" });
```

Measured over the same 40-seed walk that found the original: **50,178 states, `commitTaps`
offered 1,628 times, zero of them with the bill uncovered, and no stock ever went negative.**
`app.jsx` no longer calls `costTapCovered` at all — it no longer calls anything of the kind,
since the table draws from `view`.

What is left of this entry is the account of the rule and the two misreadings, which are worth
keeping. Note that **issue 3 below depends on this one**: it was already written as though the
fix had landed, which is the tell that this entry outlived its own resolution.

---

### the original entry, for the record

**The rule.** An action must be paid, from the treasury or by tapping producers. Tapping
delivers the FULL value of what is tapped, and what that buys depends on the verb: an embassy
counts distinct goods (tap food-2 and bronze-1, and the embassy carries food and bronze, so
+2 influence — the second food is simply unused); mercenaries receive the whole basket; a
build takes its cost and the rest is wasted. There is no "excess" to reclaim. Waste is
inherent, because a farm's yield cannot be split.

**What is actually wrong: one thing, not three.** `costTapCovered` decides whether a
selection pays. It is called in exactly one place — `app.jsx:403`, to grey out the button.
`availableCommands` offers `commitTaps` whenever ANY tap is selected:

```js
if ((m.taps || []).length) out.push({ t: "commitTaps" });   // no coverage test
```

So the rule is implemented, correct, and enforced only by the interface. A player cannot
click a greyed button; **the scribe, the expander, a test and a replay all can**. Measured: a
pottery workshop pays a build costing 1 food, and the chronicle then reports *"Nippur
sponsors the build: food"* — `costTakePaid` decrements a good that was never there.

**The fix is one line in the right place**: gate the menu entry on `costTapCovered`, and the
UI's disabled state becomes a display of the rule rather than the rule itself. This is
exactly what the house style warns about — a precondition living outside `availableCommands`.
*(Done — see the head of this entry.)*

**Two things I got wrong**, recorded because the mistakes are instructive:
- *"A granary yields nothing and still pays."* A granary is not a producer. `tapProducers`
  treats it as an ISSUER: tapping it draws a food from the stores into the local channel.
  That is the mechanism working.
- *"Adding a second tap made the player poorer."* Same cause — the second tap was the
  granary, and the food came out of the stores by design.

Both misreadings came from taking the chronicle line *"what the yield exceeded stays with the
province"* as a statement of rule. It is stale flavour: nothing stays with anyone, the
surplus is simply unused. **That line should be rewritten**, since it misled its own author.

---

## 3. The scribe's terminal-step failures were ONE failure, not two  *(corrected)*

`SCRIBE-FINDINGS.md` records two symptoms at terminal steps: the scribe **over-gifts** (adds
a good beyond those named) and **under-taps** (commits before the bill is covered).

Issue 2 shows the second one was never a failure. Committing after one tap builds the thing
and costs nothing; the oracle's second tap cost a food and a producer. **The model played
better than the trace it was scored against**, and I recorded it as an error.

The lesson is about the instrument, not the model: **the oracle is a legal line, not a good
one.** The corpus is generated by a filtered random walk, so "the oracle did something else"
and "the candidate was wrong" are not the same statement, and only per-position judgement
tells them apart. Where an alternative is *legal and better*, the bench cannot see it.

The over-gifting failure stands: told *"bearing cloth"*, the scribe laid cloth and then added
food. That contradicts an explicit instruction, and it recurred in all three runs.

---

## 4. `validCmd` cannot distinguish some commands  *(latent)*

`cmdKey` now includes `good` and `pid`, which fixed the worst of it. But `validCmd` still
approves a command by matching the key against the menu, and a command whose *meaning*
depends on the mode — `{"t":"region","rid":"NIP"}` under `build` versus `entreat` — passes
either way. The world chain catches this when a stamp is present; an unstamped caller is
still unprotected. Replays and tests dispatch unstamped by design.

---

## 5. ~~The map disagreed with the menu about what could be done~~  *(CLOSED — structural)*

The map read `legalTargets` directly; the panels read `availableCommands`. Two answers to one
question, and `legalTargets` does not know every gate that stands in front of a command. Once
all powers had passed, the menu was exactly `[{t:"resolveUpkeep"}]` and the board still lit
every activatable building. **322 states in 50,178.**

No rule was broken. The click was refused — *"That is not on offer now: activate HAT"* — and
the fingerprint did not move. This is the distinction worth holding onto: issue 2 was a rule
living in the interface, where a caller bypassing the UI could break it. This was the
interface holding a **second opinion about the rules**, where the gate still protects the
engine and only the player is misled. Different severity, same cause, and the same fix:
one source of truth.

The map now draws from the same `availableCommands` walk the panels do, so the disagreement is
not patched but impossible. `test-view.js` asserts it over every state it can reach, and was
confirmed to fail when the map is pointed back at `legalTargets`.

`legalTargets` itself is unchanged and still correct for what it is — the geometry of reach,
which `availableCommands` composes with everything else. It is simply not a menu, and nothing
should treat it as one.

# THE SCRIBE — what the bench established
*Findings of record, 29 July 2026. Written to be read before any interface layer is built.*

---

## The question

The scribe is the component that turns a plan into commands: given a state and an
instruction, choose the next command from the legal menu. It was the least reliable part
of the old three-office design, and nobody could say why, because it was only ever
observed end-to-end — where a bad plan and a mis-executed plan look identical.

## How it was measured

**Teacher forcing.** The bench asks the candidate for position *i*, scores the answer, then
**throws it away and advances by the oracle.** Every candidate and every condition therefore
sees byte-identical states, per-step accuracy is comparable across runs, and a mistake at
step 4 cannot contaminate step 9. Nothing is measured end-to-end.

**The corpus** is 54 cases, 328 positions, 290 scored, 25 trapped — every case a real
activation reached by real commands from `initState`, replay-verified 54/54 against the
engine. A *trapped* position is one where the menu contains a decoy: the target of a
different step of the same plan.

**The instrument was calibrated before it was trusted.** Oracle 100%, always-wrong 0%,
random-legal 29.4% measured against 30.3% computed from acceptable-set sizes. Any of the
three landing elsewhere would have meant the scorer, not the model, was being measured.

---

## The result

Same 40 positions, drawn from multi-action palace activations, model
`claude-sonnet-4-6`, three conditions:

| condition | micro | macro | failures | of which POSITION errors |
|---|---|---|---|---|
| whole-activation directive | 72.5% | 79.1% | 11 | **8** |
| whole-activation + step marker | 85% | 89% | 6 | **5** |
| **one directive per action** | **97.5%** | **97.1%** | **1** | **0** |
| contests, per-seat directives | **100%** | **100%** | **0** | **0** |

A *position error* was verified mechanically, not judged: the answer given is the correct
answer for a **different action of the same plan**. Under the whole-activation directive
the model was not guessing — it was executing a coherent plan, the wrong step of it. In one
case it slipped at the verb and then chose a target and a payment consistent with its own
mistake, three steps in a row.

**Single-action cases score 100%** under the same settings. Execution given an
unambiguous instruction is not the problem, and never was.

### Why this decides the architecture

A three-action palace turn runs 7–16 positions (median 13 in this corpus), and per-step
accuracy compounds. At the full 16:

| per-step | activations completed correctly |
|---|---|
| 72.5% | **0.6%** |
| 85% | **7.4%** |
| 97.5% | **67%** |

A whole-plan directive does not produce an unreliable scribe; it produces one that
essentially never completes an activation. That is why the old design felt broken however
the prompts were tuned, and why it was invisible: end-to-end, "the plan was bad" and "step 9
executed step 4" are the same observation.

**The step marker halves position errors but does not remove them.** Telling the model which
step it is on does not stop it reading the wrong clause of the sentence. Only removing the
other steps from view does.

---

## The winning configuration

```
register : prose
scope    : action          ← one directive per action-proper
glosses      : on          ← describeCmd beside every legal command
where it stands : on       ← progressLine
done so far     : on       ← the chronicle since this action began
the year        : off
stores          : off
step marker     : off      ← unnecessary once scope is per-action
```

**The interface must re-issue a directive at each action boundary.** The boundary is not a
judgement call: `act.capLeft` decrements when a command is spent. The interface knows.

---

## What still fails, and why it is the same thing twice

One failure survived the winning condition, and it is the only failure class left:

- **long-02 position 15.** Told *"bearing cloth"*, the model selects cloth correctly, then
  adds **food** instead of sending. It did this identically in all three runs — 3 for 3.
- **Earlier runs, payment steps.** Told to pay with two producers, the model taps one and
  then chooses `commitTaps` before the bill is covered.

These are mirror images of one question: **"am I finished with this action?"** One stops too
early, one does not stop at all. Terminal steps (`giftSend`, `commitTaps`, `stand`,
`launch`) are where the scribe fails and nowhere else.

**The fix has the same shape as the boundary fix: do not ask the model for something the
interface can compute.** Whether the basket matches the named goods, and whether the taps
cover the bill, are both arithmetic. Options, in rising order of firmness: gloss the terminal
command with the answer (*"the basket now matches your instruction — SEND"*); withhold
`giftToggle` once the named goods are selected; or advance the terminal step automatically.

With terminals handled that way, this slice would have scored 40/40.

---

## Methodological findings, which cost more than the result did

Five separate defects were found in the corpus **before** any number about the model was
trustworthy. Every one made the model look worse than it was, and every one took the same
form.

> **A directive must be as specific as the decision it governs.**

- The directive named the source **region** but not which **producer** — 45% of trade
  targets were ambiguous.
- It named the region to buy from but not the **good** — two producers in Ugarit, one
  instruction.
- It said *"paying out of Tarhuntassa's own producers"* without saying **which**, so
  stopping after one tap was underdetermined rather than wrong.
- It never named **which building opens** — 29 of 40 single-action cases; the first decision
  was unanswerable.
- It described a raid as *"Fall on Libu"* while the oracle committed units and laid baskets —
  the model answered `launch` 13 times, reasonably.

**This is the finding that matters for the planner→scribe interface.** Whatever writes the
directive must name everything the scribe must choose: the actor, the verb, the target, the
goods, the producers that pay. Anything left unsaid is not "flexibility" — it is a guess, and
it will be scored as an error by the engine that eventually runs it.

Two further lessons about the instrument itself:

- **A call that never returned is not a wrong answer.** 28% of one early run was rate-limit
  failures scored as illegal picks. Retry with backoff; count `unanswered` separately.
- **Order is not always meaning.** Choosing three producers to sponsor a bill is a *set*;
  choosing which source to buy from is a *decision*. Commutativity is a property of
  (command, mode), not of the command.

---

## Contests — measured, and the prediction was wrong

I argued contests would score *worse* than ordinary actions. Bidding is an **accumulation**,
not a selection: the menu is ten wide, never shrinks as goods are laid, offers no structural
signal of progress, and the strategic content lives entirely in the stopping rule — the class
that already failed everywhere else.

**They score 100%.** Thirteen positions across a raid and a subversion: the verb, the target,
three bid toggles, the launch, two other courts standing, and the closing stand. Traps 3/3 —
the Apiru had four options on the menu at every step and the directive said they *"can keep
to their hills"*, and it never once bid for them.

So the accumulate-versus-select distinction mattered less than the argument suggested. What
mattered, again, was whether the instruction was complete.

**Because the first contest run scored 66.7%, and both failure kinds were the instrument:**

- **The actor was not named.** The hand-written contest directives never said which building
  opens — the same defect fixed for generated cases and missed here. Told *"Open a bidding
  for the elite of Kizzuwatna"*, the model opened a building **at Kizzuwatna**, which is the
  only place the sentence named. The corpus even recorded `"b":"chancery"` on the oracle; the
  information was there, just not in the instruction.
- **Other courts were given the opener's plan.** A subversion passes the desk round the
  table, poorest standing first, so three courts decide inside one action. The bench handed
  Egypt and Mitanni *Hatti's* directive and scored them for not standing. That is not a hard
  case; it is the wrong question.

The fix generalised rather than special-cased: **directives are keyed by the power they speak
for** in every case. An ordinary activation has one entry, a contest has several, and one
lookup serves both. That also makes the contest corpus the only thing we have that tests
**multi-seat interleaving** — and it passes.

This is the same lesson a sixth time, now in a case I had predicted would fail for a
different reason entirely.

## What was not measured

- **Registers.** Everything here is `prose`. `template` and `loose` are built and untested.
- **Volume.** 40 positions per condition. The gaps are large enough to be safe, but the
  single surviving failure class is one observation per run.

---

## Conclusion

1. **Per-action directives, not per-activation.** Measured, not argued: 97.5% against 72.5%.
2. **Re-consult at every action boundary.** The interface detects it from `capLeft`.
3. **Compute the terminals.** Do not ask the model whether it has finished.
4. **The directive names everything the scribe must choose.** Every ambiguity we left became
   an error we blamed on the model.
5. **Keep the bench.** It found seven of its own defects before it found anything about the
   model, and it will do the same for the next component. Every single one made a competent
   model look broken, and every single one was an instruction that did not say enough.

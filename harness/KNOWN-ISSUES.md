# KNOWN ISSUES

Things that are wrong, or undecided, and known to be so. Nothing here is papered over: where
a test can find it, the test is left **failing**, so it cannot be forgotten.

This file is for what is **open**. It had grown to five entries of which three were closed and
one was a correction to a finding recorded elsewhere — resolved history, kept under a heading
that says "known issues", which is how a reader ends up believing a fixed bug is live. The
accounts worth keeping moved to where the thing they describe lives: the map's second opinion
about the rules is `README.md` §3, the payment rule is the engine at `commitTaps`, and the
correction to the scribe's terminal-step failures is in `SCRIBE-FINDINGS.md`, which is the
document it corrects.

---

## 1. `validCmd` cannot distinguish some commands *(latent)*

`cmdKey` names `good` and `pid`, which fixed the worst of it. But `validCmd` approves a command
by matching its key against the menu, and a command whose *meaning* depends on the mode —
`{"t":"region","rid":"NIP"}` under `build` versus `entreat` — passes either way.

The world chain catches this when a stamp is present. An unstamped caller is still unprotected,
and replays and tests dispatch unstamped by design.

## 2. The scribe over-gifts at terminal steps

Told *"bearing cloth"*, the scribe lays cloth and then adds food. It contradicts an explicit
instruction and it recurred in all three runs — `long-02` position 15, 3 for 3.

This is the only surviving failure class in the winning condition, and
`SCRIBE-FINDINGS.md` says what to do about it: **do not ask the model whether it has
finished.** Whether the basket matches the named goods is arithmetic the interface can do.

## 3. What does a province say about itself? *(open, and the smaller half)*

The map panel carries what is *clickable and why*, which is the part that mattered. Buildings
and slot contents are still drawn from `g.b` directly, as world data alongside the coordinates.
Turning those into `facts` per region remains more trouble than it is obviously worth.

## 4. Should `view` be memoised? *(worth measuring now, where it was speculative before)*

`view` is called once per `band()` plus once for the map and once for the power cards —
seven-plus walks of `availableCommands` per render, and the map adds a `rejectReason` per
unreachable province during targeting steps. Nobody has profiled it and nothing feels slow.

If it becomes heavy the answer is unchanged: memoise on `g.chain`, which is exactly what the
chain is for.

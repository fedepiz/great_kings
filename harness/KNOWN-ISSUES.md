# KNOWN ISSUES

Things that are wrong and known to be wrong, and questions that are deliberately still open.
Nothing here is papered over: where a test can find one of these, it is left **failing**, so it
cannot be forgotten.

**Closed issues are deleted from this file, not struck through.** A page of resolved entries
reads as a page of problems, and the ones that mattered are recorded where they can still act on
someone: as a comment beside the code that got it wrong, or as one of the four ideas in
`README.md`. If you want the history, it is in git.

---

## 1. `validCmd` cannot distinguish some commands  *(latent)*

`cmdKey` includes `good` and `pid`, which fixed the worst of it. But `validCmd` still approves a
command by matching its key against the menu, and a command whose *meaning* depends on the mode
— `{"t":"region","rid":"NIP"}` under `build` versus under `entreat` — passes either way.

The world chain catches this whenever a stamp is present. An unstamped caller is still
unprotected, and replays and tests dispatch unstamped by design.

---

## 2. A province's buildings are read from `g.b`, not from `view`  *(open, and deliberate for now)*

The map panel carries what is **clickable and why**, which is the part that could hide a rule.
Building glyphs and slot contents are still drawn straight from `g.b[rid][i]` — one line in
`app.jsx` — as world data alongside the coordinates in `REG`.

This is the settled position rather than an oversight: where Ugarit sits and what stands in it
are both facts about the world, and neither is an answer to "what may be done here". Turning
them into per-region `facts` remains more trouble than it is obviously worth. Worth revisiting
only if a second front end appears and finds it needs them.

---

## 3. `view` is not memoised, and nobody has measured it  *(open)*

`view(g)` walks `availableCommands` from scratch on every call, and the table calls it three
times per render — once for the bands, once for the map, once for the power cards. During a
targeting step the map also adds a `rejectReason` per unreachable province.

It was seven-plus walks before the scribe came out, so this got better without being fixed.
Nothing feels slow and nothing has been profiled. If it ever does become heavy the answer is
already decided: **memoise on `g.chain`**, which is exactly what the chain is for.

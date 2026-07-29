# TODO

This document contains future things to do. Whenever we notice something not urgent or outside
the current task, add it to the TODO as a section. Whenever a TODO item is addressed, remove the
section. Do not leave behind text for completed todos.

Where an item has a site in the code, annotate that site with a `TODO:` comment naming the
section it belongs to, so the two ends stay findable from each other — `grep -rn "TODO:"` must
agree with the sections below. When a section goes because the work is done, its `TODO:`
comments go with it in the same change.

---

## Vestigial fields

Three fields exist in the state or on a struct but nothing reads them, or nothing writes them.
They are marked `VESTIGIAL` at their sites so nobody mistakes one for a working mechanism and
builds on it:

| field | site | condition |
|---|---|---|
| `bd.capGoods` | `yieldOf` | never written, so the branch is unconditionally `1` |
| `g.rot` | `nextPlayer`, `finishUpkeep` | maintained and reset, never read |
| `c.deny` | `commitUnit`, `resolveRaid` | written as `!!u.deny`, and `battleUnits` never sets `u.deny` — so always false, and the filter removes nothing |

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

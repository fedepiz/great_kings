# UI notes — reading the old table, and rebuilding it by hand

Notes taken from `main`: `index.html` (20 lines), `levant/main.jsx` (12), `levant/app.jsx` (533),
`levant/table.css` (63). Written for someone fluent in C/C++/Rust/OCaml and new to the browser.

**These notes describe the OLD table, and the old table consumes an engine vocabulary — panels,
bands, options, a step counter — that is an ENGINE design decision, not a UI one. Nothing here
obliges the new engine to speak that way.** Where a shape came from the engine rather than from
the browser, it is marked ENGINE-SHAPED. Skip or redesign those freely.

---

## 1. What it is, in one paragraph

A single screen with no navigation and no pages. A pannable, zoomable **vector board** fills the
window; a **panel column** floats over it on the left holding everything readable and every
button; a **chronicle** dialog floats bottom-right; a **modal** covers everything when open. On a
narrow window the left column becomes a drag-resizable **bottom sheet** with three snap heights.
That is the whole interface — five surfaces, one screen, no routing.

## 2. The data flow, which is the part worth copying

Two state atoms, deliberately separated:

```
   the engine's answer                  the table's own chrome
   ───────────────────                  ──────────────────────
   g      (a ref — never read)          camera {x, y, k}
   v = view(g)  (React state)           sheet height, modal, chronicle open, isMobile
```

- `g` lives in a **ref**: held only so it can be handed back to `dispatch`, read by nothing.
- `v = view(g)` is the one structure that gets drawn. It is recomputed **once per command**, not
  once per render — so panning the camera redraws the same `v`, because the world did not move.
- Every interaction in the entire file funnels through one four-line function:

```js
const go = (cmd) => {
  gRef.current = dispatch(gRef.current, { chain: v.chain, ...cmd })
  setV(view(gRef.current))
}
```

- Camera and sheet changes call their own setters and never touch the engine.

**The mental model: `view(g)` returns a display list, and the table is an interpreter for it.**
If you know Dear ImGui — this is the immediate-mode idea (state produces a fresh description of
the whole screen every time) running on top of a retained-mode tree (the DOM). That tension is
what React exists to resolve, and understanding it is 80% of understanding the browser.

## 3. Anatomy — the five surfaces

| surface | how it is built | key detail |
|---|---|---|
| board | one `<svg>` filling the window, everything inside one `<g transform>` | camera is *one* transform; children are authored in world coordinates |
| panel column | absolutely-positioned box over the board, `left:12 top:12 bottom:12 width:360` | scrolls internally; the page itself never scrolls |
| chronicle | floating box, `right:12 bottom:12`, collapsible to a button | desktop only |
| modal | full-window overlay, `position:fixed inset:0`, click backdrop to close | only ever shows one chronicle line |
| bottom sheet | the panel column again, re-styled, on narrow windows | drag handle, three snap heights, hand-rolled |

**Board geometry is arithmetic, not layout.** SVG has no layout engine, so the file computes it:

```js
const SLOT = 26, GAP = 5, PADX = 8, HEAD = 19
const regW = (place) => Math.max(PADX*2 + place.works.length*SLOT + (place.works.length-1)*GAP, 100)
const regH = HEAD + SLOT + 23
```

A province is a rounded `<rect>`, its name a `<text>`, its building slots a row of small squares,
its relation line a `<text>` of coloured `<tspan>`s. Roads are `<line>`s between region centres.
Painter's order = document order; there is no z-index inside SVG.

**The panel column is a table-driven renderer.** ENGINE-SHAPED, but the *technique* is the same
one your house style already calls "one general path, specialised by data":

- `BANDS` is a fixed ordered list of seven names; a band draws nothing if it holds nothing.
  Position carries meaning — exits are always last, so nothing lands under the hand where
  something else used to be.
- `drawPanel` dispatches on five *presentational* kinds — `note`, `notice`, `choices`, `facts`,
  `sides` — and knows nothing about verbs, costs, or legality.
- An option is a struct: `{ label, cmd, state, category, rank, why }`. `cmd === null` IS the
  refusal; the button is disabled and its `why` becomes the tooltip. Clicking ships `cmd` back
  verbatim. **A new verb needs no change in the UI.**
- Four small lookup tables carry all the styling knowledge: `LOOK` (by option state), `BY_CATEGORY`
  (seat/mercenary/danger/terminal tints), `NOTICE` (mark and colour per severity), `GLYPH`
  (building → two characters that fit a 26px box).

## 4. What you have to learn, in terms you already have

| browser thing | what it actually is |
|---|---|
| **DOM** | a retained-mode scene graph owned by the browser. You mutate nodes; it repaints. |
| **React** | you write a pure function `state → element tree`. React diffs your returned tree against the previous one and applies the minimal DOM mutations. Re-render ≠ repaint. |
| **JSX** | pure sugar. `<div a={1}>x</div>` is `createElement("div", {a:1}, "x")`. Nothing magic, no template language. |
| **hooks** | per-instance storage keyed by *call order*. `useState` = a slot that re-runs the function when written. `useRef` = a slot that does not. Call order must be identical every render — hence no hooks inside `if`. |
| **`useRef` vs `useState`** | the distinction the whole table is built on: the game is a *possession* (ref), the view is *render state*. Get this one and the rest follows. |
| **CSS** | a constraint solver you configure by setting properties on nodes. `position:absolute` = relative to nearest positioned ancestor. `flex` = a 1-D layout solver. There is no `goto`. |
| **SVG** | a retained vector scene graph inside the DOM. y grows down. `<g transform>` composes like a matrix stack. |
| **events** | bubble from target to root. `stopPropagation()` is how the panel keeps its scroll from panning the board. Pointer events unify mouse/touch/pen — prefer them. |

## 5. The rebuild ladder

Each rung runs, and each teaches one thing. Do not skip to 6.

0. **A div with text.** `main.tsx` mounts one component. Learn: what mounting means, what the
   element tree is, that your function's return value *is* the description.
1. **A static SVG board.** Two hardcoded rectangles with names. Learn: SVG coordinates, why the
   `<svg>` fills its parent, painter's order.
2. **Camera.** `useState({x,y,k})`, one `<g transform>`, wheel to zoom, drag to pan. Learn: event
   handlers, why setters take a function (`setCamera(c => ...)`), why zoom-at-cursor is
   `mx - (mx - x) * s`.
3. **Click a region.** Make it change a colour. Learn: the event → state → re-render loop. Add
   the drag-vs-click guard — a pan must not also count as a click.
4. **The panel as an overlay.** An absolutely-positioned box that scrolls internally while the
   page does not. Learn: the box model, `position`, `inset`, `overflow`, stacking.
5. **Render a list of structs.** Feed it a hardcoded array of panel objects; dispatch on `kind`.
   Learn: rendering arrays, `key`, conditional rendering, and why a lookup table beats a chain.
6. **Wire the engine.** `gRef` + `view` + the four-line `go`. Learn: ref vs state, and why the
   view is recomputed per command rather than per render.
7. **Option styling tables.** `LOOK`/`BY_CATEGORY`; disabled buttons carrying `why`.
8. **Chronicle and modal.** Learn: overlays, backdrop-click-to-close, `stopPropagation`.
9. **Mobile sheet, last.** Most fiddly, least conceptual. Consider not rebuilding it at all.

## 6. Things I would not copy

- **`isMobile` as state.** A `resize` listener sets a boolean that forks the entire render tree.
  A CSS media query does this declaratively with no re-render and no branch. The fork exists
  because the desktop and phone layouts place the *same* sections in different orders — worth
  solving with CSS grid areas instead.
- **Half inline styles, half utility classes**, split on no principle. Pick one.
- **`table.css` is a hand-written Tailwind imitation** — 63 lines covering exactly the classes
  used. Documented hazard: *a class name not in the file does nothing, silently.* No compiler
  catches it. If you rebuild in TS, this is one thing worth making type-checked.
- **Colours as bare hex literals scattered through the file** — the four lookup tables are good,
  but board colours are inline. One palette table.
- **`serif` / `mono` style objects rebuilt every render.** Harmless here, but they are constants;
  hoist them out of the component.
- **The modal is a general mechanism used for exactly one thing.** Either use it more or delete
  it.

## 7. The one rule the old table enforced on itself

`app.jsx` imports exactly three functions plus a scenario, and **reads no field off `g`**. Any
fact the interface needs becomes a field on the view. Any question about whether something is
allowed is already answered by `cmd` being `null`.

This is worth keeping regardless of what the new engine's vocabulary turns out to be, because
the failure it prevents is specific and this project has had it: a rule enforced by a disabled
button is not enforced at all — anything driving the game programmatically walks straight past
it.

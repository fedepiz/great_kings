// =====================================================================
//  THE GREAT KINGS — THE TABLE
// =====================================================================
//  The hot-seat interface. Everything here is presentation and interaction; the rules live
//  in engine.js and are imported, never restated.
// =====================================================================

import React, { useState, useRef } from "react";
// THE TABLE'S WHOLE REACH INTO THE ENGINE IS THREE FUNCTIONS: ask what the state shows
// (`view`), send one command (`dispatch`), start over (`initState`). Nothing else, and in
// particular nothing that answers "may this be done" — that lives behind `view`, which is the
// only question this file asks.
//
// There is NO world import. The map's own facts — names, colours, coordinates, roads, the
// ground on each slot — arrive on the view like everything else, because the world is
// scenario data and may differ from game to game: an import would draw the canon under every
// scenario. KEEP THIS LIST AT THREE. An imported rule is an invitation to enforce it here,
// and a rule enforced here is not enforced at all — see CLAUDE.md.
import { dispatch, initState, view } from "./engine.js";

export default function App() {
  const [g, setG] = useState(initState);
  const upd = (fn) => setG((old) => { const n = JSON.parse(JSON.stringify(old)); fn(n); return n; });
  // ONE QUESTION, ASKED ONCE PER RENDER. `g` is held so it can be handed back to `dispatch`,
  // and is never read from — every fact below comes off `v`. If something is missing from `v`,
  // the fix is a field on the view, not a read of `g` here.
  const v = view(g);
  const p = v.seat;

  const serif = { fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif" };
  const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

  // A click is written against the board the player is LOOKING AT, so it carries that
  // world's hash. If anything else lands a command while they are looking, the click is
  // refused rather than applied to a board they never saw. Nothing else does, in a hot seat —
  // but the stamp costs nothing and it is what makes a slow agent safe on shared state later.
  // A command that arrives already stamped is left alone.
  const go = (cmd) => upd((n) => dispatch(n, cmd && cmd.chain === undefined ? { ...cmd, chain: v.chain } : cmd));
  const [modal, setModal] = useState(null); // { title, lines }

  const closeModal = () => setModal(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 700);
  React.useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const SNAPS = () => [110, Math.round(window.innerHeight * 0.5), Math.round(window.innerHeight * 0.88)];
  const [sheet, setSheet] = useState(1); // 0 peek · 1 half · 2 full
  const [chronOpen, setChronOpen] = useState(true); // the desktop chronicle dialog, bottom-right
  const [sheetDragH, setSheetDragH] = useState(null); // live height while dragging
  const sheetDrag = useRef(null);
  // the docked controls set the sheet's FLOOR: whatever they need, the sheet is at least that
  // tall, so they never scroll inside themselves. The cards above keep their own scrollbar.
  const dockRef = useRef(null);
  const [dockH, setDockH] = useState(0);
  React.useEffect(() => {
    const el = dockRef.current;
    if (!isMobile || !el || typeof ResizeObserver === "undefined") { setDockH(0); return; }
    const measure = () => setDockH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);
  // THE SHEET FOLLOWS THE STEP: a peek when the board is where the work is, half when it is not.
  // It moves only when the step CHANGES, so a hand-dragged height is never yanked away.
  //
  // `v.step` is a counter and COMPARING IT IS THE ONLY LEGAL USE. Deriving this signal here
  // instead — out of modes, phases and raid state — would mean knowing the engine's own
  // vocabulary, and silently missing any boundary added to it later.
  const lastStep = useRef(-1);
  React.useEffect(() => {
    if (!isMobile) { lastStep.current = v.step; return; }
    if (lastStep.current === v.step) return;      // same step: leave a dragged height alone
    lastStep.current = v.step;
    setSheetDragH(null);
    setSheet(v.mapOnly ? 0 : 1);
  }, [v.step, isMobile, v.mapOnly]);

  const onSheetDown = (e) => { sheetDrag.current = { y: e.clientY, h: sheetDragH ?? SNAPS()[sheet] }; };
  const onSheetMove = (e) => {
    if (!sheetDrag.current) return;
    const h = Math.max(70, Math.min(window.innerHeight * 0.92, sheetDrag.current.h + (sheetDrag.current.y - e.clientY)));
    setSheetDragH(h);
  };
  const onSheetUp = () => {
    if (!sheetDrag.current) return;
    const h = sheetDragH ?? SNAPS()[sheet];
    sheetDrag.current = null;
    const sn = SNAPS();
    let best = 0; for (let i = 1; i < sn.length; i++) if (Math.abs(sn[i] - h) < Math.abs(sn[best] - h)) best = i;
    setSheet(best); setSheetDragH(null);
  };
  const [camera, setCamera] = useState({ x: 400, y: 16, k: 0.85 });   // pan and zoom: the table's own business
  const pan = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false });
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pan.current = { active: true, sx: e.clientX, sy: e.clientY, ox: camera.x, oy: camera.y, moved: false };
  };
  const onPointerMove = (e) => {
    const pr = pan.current;
    if (!pr.active) return;
    const dx = e.clientX - pr.sx, dy = e.clientY - pr.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) pr.moved = true;
    setCamera((v) => ({ ...v, x: pr.ox + dx, y: pr.oy + dy }));
  };
  const onPointerUp = () => { pan.current.active = false; };
  const zoomAt = (mx, my, factor) => setCamera((v) => {
    const k = Math.min(2.6, Math.max(0.3, v.k * factor));
    const s = k / v.k;
    return { k, x: mx - (mx - v.x) * s, y: my - (my - v.y) * s };
  });
  const onWheel = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };
  const pinch = useRef(null);
  const tDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e) => { if (e.touches.length === 2) { pinch.current = tDist(e.touches); pan.current.active = false; } };
  const onTouchMove = (e) => {
    if (e.touches.length !== 2 || !pinch.current) return;
    const d = tDist(e.touches);
    const r = e.currentTarget.getBoundingClientRect();
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
    zoomAt(mx, my, d / pinch.current);
    pinch.current = d;
  };
  const onTouchEnd = () => { pinch.current = null; };
  // a drag must not also count as a click on whatever was underneath
  const noDrag = (fn) => () => { if (pan.current.moved) { pan.current.moved = false; return; } fn(); };
  const SLOT = 26, GAP = 5, PADX = 8, HEAD = 19;
  const regW = (place) => Math.max(PADX * 2 + place.works.length * SLOT + (place.works.length - 1) * GAP, 100);
  const regH = HEAD + SLOT + 23;
  const cx = (place) => place.at[0] + regW(place) / 2;
  const cy = (place) => place.at[1] + regH / 2;

  // A capital says "home" rather than its king's relation to himself. Everything else lists who
  // stands there. Both readings come from the region's own facts — `subject` and `relations` —
  // never from walking `g.rel`, and each row arrives with its power's name and colour.
  const relLine = (place) => {
    const sj = place.subject;
    if (sj.home) return [[sj.home, sj.homeName, "home", sj.homeColor]];
    return (place.relations || []).map((rr) =>
      [rr.power, rr.name, `${rr.influence}${rr.rungLetter}${rr.strained ? "!" : ""}`, rr.color]);
  };

  // ---- the panel's sections, each with one home, so desktop and phone can place them differently ----
  const titleBlock = () => (<>
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl" style={serif}>The Great Kings</h1>
            <span style={mono} className="text-xs opacity-70">round {v.round} · five kings</span>
          </div>
  </>);
  // ============ THE TABLE DRAWS WHAT THE STATE SAYS ============
  // One question — view(g) — one structure. `drawPanel` below knows five PRESENTATIONAL kinds
  // (note · notice · choices · facts · sides) and nothing else: not what a command is, not
  // whether a payment suffices, not that raids differ from embassies. `map` is the sixth kind
  // and the board draws it, not the column. Each option carries its own command; clicking
  // ships it back verbatim. A new verb needs no change here.
  // The TABLE decides what a fact looks like. The state says an option is chosen, idle or
  // blocked, and what kind of thing it is; the colours below are this table's reading of
  // that — another front end could read the same facts quite differently.
  // ORDINARY IS ORDINARY. Every option that may simply be taken looks the same; colour is
  // spent only where it says something — what you have chosen, what will not serve, and the
  // two kinds of thing that behave differently from their neighbours.
  const LOOK = {
    chosen:    { background: "#7A3B0E", border: "1px solid #A85A1E" },   // lit: it is in
    available: { background: "#3A3226", border: "1px solid #54492F" },   // plain
    idle:      { background: "#2A2620", border: "1px solid #332C21", opacity: 0.5 },
    blocked:   { background: "#241F16", border: "1px solid #2A2620", opacity: 0.38 },
  };
  // a seat is an organ of state, a mercenary is bought: both behave unlike their neighbours
  const BY_CATEGORY = { seat: "#5C4322", mercenary: "#463655", danger: "#5C2B2B", terminal: "#2F5548" };
  // WHAT A BUILDING LOOKS LIKE IN A 26-PIXEL SQUARE, and therefore this table's business, not
  // the engine's: "WB" is not a fact about a bronze works, it is two characters that fit the box
  // drawn below. `BT[t].name` is the opposite case and rightly lives in the engine — the
  // chronicle is prose and needs the words.
  const GLYPH = {
    palace: "RP", farm: "FA", market: "MK", port: "PO", garrison: "GA", granary: "GR",
    wsB: "WB", wsC: "WC", wsP: "WP",
    chancery: "CH", stables: "ST", steward: "SW", fortress: "FT", warrior: "WR",
  };
  const drawOption = (o, k) => {
    const look = LOOK[o.state] || LOOK.available;
    const tint = o.state === "available" && BY_CATEGORY[o.category];
    // primacy shows in WEIGHT, not in size — buttons of wildly different heights in one row
    // read as a mistake rather than a hierarchy
    return (
      <button key={k} title={o.why || o.gloss}
        className="text-xs px-2 py-1 rounded"
        style={{ ...look, ...(tint ? { background: tint } : null), color: "#EDE4CF",
                 textAlign: "center", whiteSpace: "nowrap", lineHeight: 1.35,
                 cursor: o.cmd ? "pointer" : "default",
                 fontWeight: o.rank === "primary" ? 600 : 400 }}
        disabled={!o.cmd}
        onClick={() => o.cmd && go(o.cmd)}>
        {o.label}
      </button>
    );
  };
  const drawPanel = (pan, k) => {
    if (pan.kind === "note")
      return <div key={k} className="mt-1 text-sm" style={{ color: v.seatColor }}>{pan.text}</div>;
    if (pan.kind === "notice") {
      const n = NOTICE[pan.level] || NOTICE.info;
      return (
        <div key={k} className="text-xs" style={{ ...mono, color: n.color, lineHeight: 1.5 }}>
          {n.mark}&nbsp; {pan.text}
        </div>
      );
    }
    if (pan.kind === "choices") {
      // `pick` says what the options are to each other; this table reads that as a shape.
      // Everything wraps: a row that cannot wrap puts buttons on top of one another.
      const shell = pan.pick === "one" ? "grid grid-cols-2 gap-1" : "flex flex-wrap gap-1";
      // the asides sit apart from the turn's own choices, with room to breathe
      const apart = pan.id === "aside";
      return (
        <div key={k} className={apart ? "mt-4 pt-3" : "mt-2"}
          style={{ opacity: pan.state === "closed" ? 0.45 : 1,
                   borderTop: apart ? "1px solid #332C21" : undefined }}>
          {pan.label && (
            <div className="text-xs mb-1" style={{ ...mono, color: pan.state === "satisfied" ? "#8FBF9F" : "#8A7346" }}>
              {pan.label}
            </div>
          )}
          <div className={shell}>{pan.options.map(drawOption)}</div>
        </div>
      );
    }
    if (pan.kind === "facts")
      return (
        <div key={k} className="mt-2">
          {pan.label && <div className="text-xs mb-1" style={{ ...mono, color: "#8A7346" }}>{pan.label}</div>}
          {pan.rows.map((r, i) => (
            <div key={i} className="text-xs" style={{ ...mono, color: r.warn ? "#E09070" : "#C9B98A" }}>{r.label} {r.value}</div>
          ))}
        </div>
      );
    if (pan.kind === "sides")
      return (
        <div key={k} className="mt-2 flex gap-3">
          {pan.columns.map((col, i) => (
            <div key={i} className="flex-1">
              <div className="text-xs mb-1" style={{ ...mono, color: "#8A7346" }}>{col.label}</div>
              {(col.rows || []).map((r, j) => <div key={j} className="text-xs" style={{ ...mono }}>{r}</div>)}
              {col.total != null && <div className="text-sm mt-1">{col.total}</div>}
            </div>
          ))}
        </div>
      );
    return null;
  };
  // draw the state's own panels, chosen by band. The table never decides WHETHER a panel
  // applies — the state simply does not emit one that does not.
  // THE SKELETON. Seven bands, always in this order, each absent only when it holds nothing.
  // Position carries meaning: the exits are always last and always in the same place, so
  // nothing lands under the hand where something else used to be.
  const BANDS = ["actor", "errand", "standing", "detail", "commit", "notice", "turn"];
  // the state says how serious a word is; this table chooses the mark and the colour
  const NOTICE = {
    info:    { mark: "·", color: "#A2957A" },
    ok:      { mark: "✓", color: "#8FBF9F" },
    warning: { mark: "⚠", color: "#E0A070" },
    problem: { mark: "✕", color: "#E09070" },
  };
  const band = (name) => {
    const ps = v.panels.filter((pan) => pan.band === name);
    if (!ps.length) return null;
    return (
      <div key={name} className={name === "turn" ? "mt-4 pt-3" : "mt-2"}
        style={{ borderTop: name === "turn" ? "1px solid #332C21" : undefined }}>
        {ps.map(drawPanel)}
      </div>
    );
  };
  const bands = () => <>{BANDS.map(band)}</>;
  // THE MAP'S PANEL. Its own band, because it is not drawn in the column — the board places
  // it. `mapOf(rid)` is the whole of what the table knows about a province's standing and
  // what may be done there; there is no second route.
  const mapPanel = v.panels.find((pan) => pan.kind === "map") || { regions: {}, connections: [] };
  // THE CHRONICLE, from the view like everything else. Its own band, because the shell places
  // it rather than the column: a floating dialog on a desk, folded into the sheet on a phone.
  // Both draw the same panel. `fresh` is the state saying which line has just landed; drawing
  // the rest at 70% opacity is this table reading that.
  const chronicle = (v.panels.find((pan) => pan.kind === "chronicle") || { lines: [] }).lines;
  // A place may host several options at once; the first that may be taken is what a click on
  // it means. A blocked one still carries its `why`, which is what the hover says.
  const takeable = (os) => (os || []).find((o) => o.cmd) || null;

  // THE COURTS as the state reports them: stores, what is due, what winter will take. Every
  // number here is read, never computed — spoilage is a rule (`foodRots`), not a card's sum.
  const powerCards = () => (<>
          {v.panels.filter((pan) => String(pan.id).startsWith("court:")).map((pan, k) => (
            <div key={k} className="mt-3 p-2 rounded"
              style={{ background: pan.subject.self ? "#3A3226" : "#332C21", border: "1px solid #54492F" }}>
              <div className="flex justify-between text-sm">
                <b style={{ color: pan.subject.color }}>{pan.label}</b>
                <span style={mono} className="text-xs">food store {pan.subject.store}</span>
              </div>
              {pan.rows.map((r, i) => (
                <div key={i} className="text-xs mt-0.5" style={{ ...mono, color: r.warn ? "#E09070" : "#C9B98A" }}>
                  {r.label}&nbsp;&nbsp; {r.value}
                </div>
              ))}
            </div>
          ))}
  </>);
  // THE PANEL IS THE SKELETON, and holds no branches of its own. Which building, which verb,
  // the sourcing, the assembly, the bidding — each is a band the state fills or leaves empty.
  const actionPanel = () => bands();

  const chronicleBlock = () => (<>
          {isMobile && (
            <div className="mt-3">
              <div className="flex justify-between items-baseline">
                <div className="text-sm">Chronicle</div>
                <button className="text-xs px-2 py-0.5 rounded" style={{ background: "#54492F" }} onClick={() => setG(initState())}>reset</button>
              </div>
              <div className="mt-1 p-2 rounded text-xs leading-relaxed" style={{ background: "#241F16", maxHeight: 230, overflowY: "auto", ...mono }}>
                {chronicle.map((ln, i) => (
                  <div key={i} className={ln.fresh ? "" : "opacity-70"} style={{ cursor: "pointer" }}
                    onClick={() => setModal({ title: "From the chronicle", lines: [ln.text] })}>{ln.text}</div>
                ))}
              </div>
            </div>
          )}
  </>);

  return (
    <div style={{ background: "#E5D9B8", height: "100vh", overflow: "hidden", color: "#2A241B", position: "relative", ...serif }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <svg width="100%" height="100%" style={{ display: "block", background: "#E5D9B8", cursor: pan.current.active ? "grabbing" : "grab", touchAction: "none" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <g transform={`translate(${camera.x},${camera.y}) scale(${camera.k})`}>
          <rect x="40" y="365" width="390" height="290" rx="46" fill="#3E5F82" opacity="0.9" />
          <text x="205" y="640" fontSize="15" fill="#9FC0DA" opacity="0.75" style={{ ...serif, pointerEvents: "none", letterSpacing: 4 }}>
            THE GREAT SEA
          </text>
          {mapPanel.connections.map(([a, b], i) => (
            <line key={i} x1={cx(mapPanel.regions[a])} y1={cy(mapPanel.regions[a])} x2={cx(mapPanel.regions[b])} y2={cy(mapPanel.regions[b])} stroke="#B3A47F" strokeWidth="2.5" />
          ))}

          {Object.entries(mapPanel.regions).map(([rid, place]) => {
            // everything the board knows about this province comes from here — its geography
            // (`name`, `at`, `farm`, the ground on each work row) included
            const { home, holderColor, allyColor, coastal, wild, acting: isActPal } = place.subject;
            // home ground and held ground both wear a king's colour; which king is a fact,
            // that they are drawn alike is this table's reading
            const heldColor = holderColor || place.subject.homeColor;
            const [rx, ry] = place.at;
            const pick = takeable(place.options);
            const hotR = !!pick;
            const w = regW(place);
            return (
              <g key={rid}>
                <rect x={rx} y={ry} width={w} height={regH} rx={wild ? 2 : 9}
                  fill={heldColor ? heldColor + "26" : wild ? "#BCA678" : "#D8CCA8"}
                  stroke={hotR ? "#7A3B0E" : isActPal ? "#2A241B" : heldColor ? heldColor : allyColor ? allyColor : wild ? "#6E5C3A" : "#A69770"}
                  strokeWidth={hotR ? 3 : isActPal ? 2.5 : heldColor ? 2 : 1.4}
                  strokeDasharray={allyColor && !heldColor ? "6 3" : wild ? "2 3" : undefined}
                  style={{ cursor: hotR ? "pointer" : "default" }}
                  onClick={noDrag(() => pick && go(pick.cmd))}
                >
                  {/* a province out of reach still says why, on hover, as a blocked button does */}
                  {(place.options[0] || {}).why && <title>{place.options[0].why}</title>}
                </rect>
                {coastal && (
                  <rect x={rx + w - 11} y={ry + regH - 11} width="7" height="7" rx="1.5"
                    fill="#3E5F82" stroke="#22384D" strokeWidth="0.8" style={{ pointerEvents: "none" }} />
                )}
                <text x={rx + PADX} y={ry + 14} fontSize="11" fill={wild ? "#4A3D24" : "#2A241B"} style={{ ...serif, pointerEvents: "none" }}>
                  {wild ? "⌃ " : ""}{place.name}{home ? " ✶" : ""}{place.farm > 0 ? `  ·  f${place.farm}` : ""}{wild ? "  ·  wild" : ""}
                </text>
                {place.works.map((w, i) => {
                  // one row per slot, from the view: the GROUND (sea, a resource, plain) and
                  // what STANDS on it. An empty slot is `{ building: null }` plus its ground.
                  const sx = rx + PADX + i * (SLOT + GAP);
                  const sy = ry + HEAD;
                  // whether this slot may be clicked, and what the click MEANS — opening a
                  // building or picking one inside an activation — is the engine's to say.
                  const sPick = takeable(place.slots[i]);
                  const hotS = !!sPick;
                  return (
                    <g key={i} style={{ cursor: hotS ? "pointer" : "default" }} onClick={noDrag(() => sPick && go(sPick.cmd))}>
                      {wild ? (
                        <circle cx={sx + SLOT / 2} cy={sy + SLOT / 2} r={SLOT / 2 - 1}
                          fill="#D6C39A" stroke={hotS ? "#7A3B0E" : "#6E5C3A"} strokeWidth={hotS ? 2.5 : 1}
                          strokeDasharray={hotS ? undefined : "2 3"} />
                      ) : (
                        <rect x={sx} y={sy} width={SLOT} height={SLOT} rx="5"
                          fill={w.coast ? "#C7D5E2" : w.res ? "#D9C08F" : "#EFE7CE"}
                          stroke={hotS ? "#7A3B0E" : "#A69770"} strokeWidth={hotS ? 2.5 : 1} />
                      )}
                      {!w.building && (w.coast || w.res) && (
                        <text x={sx + SLOT / 2} y={sy + SLOT / 2 + 3} fontSize="8" textAnchor="middle" fill="#54492F" style={mono}>
                          {w.coast ? "sea" : { copper: "Cu", cloth: "Dy", clay: "Ky" }[w.res]}
                        </text>
                      )}
                      {w.building && (
                        // tilted and faded once it has acted: a building's year is spent.
                        // `w.color` is the owning king's colour or null — a province's own
                        // work, and a wild people's warband, both take the neutral brown.
                        <g transform={w.spent ? `rotate(12 ${sx + SLOT / 2} ${sy + SLOT / 2})` : undefined} opacity={w.spent ? 0.5 : 1}>
                          <title>{w.label}</title>
                          <rect x={sx + 3} y={sy + 3} width={SLOT - 6} height={SLOT - 6} rx="4"
                            fill="#F5EDD8"
                            stroke={w.color || "#8A6A2F"} strokeWidth="2.2" />
                          <text x={sx + SLOT / 2} y={sy + SLOT / 2 + 3.5} fontSize="10" textAnchor="middle" fill="#2A241B" style={mono}>{GLYPH[w.building]}</text>
                        </g>
                      )}
                    </g>
                  );
                })}
                <text x={rx + PADX} y={ry + regH - 6} fontSize="9" style={mono}>
                  {relLine(place).map(([q, nm, s, col], i) => (
                    <tspan key={q} fill={col}>{i > 0 ? "  " : ""}{nm.slice(0, 2)} {s}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
          </g>
        </svg>
        <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 6, zIndex: 15 }}>
          {[["+", 1.2], ["−", 1 / 1.2]].map(([lbl, f]) => (
            <button key={lbl} onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, f)}
              style={{ background: "rgba(28,24,18,0.9)", color: "#EDE4CF", border: "1px solid #6B5B3E", borderRadius: 8, width: 30, height: 30, fontSize: 16 }}>
              {lbl}
            </button>
          ))}
          <button onClick={() => setCamera({ x: 400, y: 16, k: 0.85 })}
            style={{ background: "rgba(28,24,18,0.9)", color: "#EDE4CF", border: "1px solid #6B5B3E", borderRadius: 8, padding: "0 10px", height: 30, fontSize: 12 }}>
            recentre
          </button>
        </div>
      </div>

      {!isMobile && (
        <div style={{ position: "absolute", right: 12, bottom: 12, zIndex: 25 }}
          onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
          {chronOpen ? (
            <div className="p-2 rounded" style={{ background: "rgba(26,22,17,0.95)", border: "1px solid #6B5B3E", width: 470, boxShadow: "0 10px 34px rgba(0,0,0,0.5)", backdropFilter: "blur(3px)", color: "#EDE4CF" }}>
              <div className="flex justify-between items-baseline mb-1">
                <div className="text-sm" style={serif}>The chronicle</div>
                <div className="flex gap-2">
                  <button className="text-xs px-2 py-0.5 rounded" style={{ background: "#54492F" }} onClick={() => setG(initState())}>reset</button>
                  <button className="text-xs px-2 py-0.5 rounded" style={{ background: "#3A3226", border: "1px solid #6B5B3E" }} onClick={() => setChronOpen(false)}>▾ hide</button>
                </div>
              </div>
              <div className="p-2 rounded text-xs" style={{ background: "#241F16", maxHeight: "44vh", overflowY: "auto", lineHeight: 1.65, ...mono }}>
                {chronicle.map((ln, i) => (
                  <div key={i} className={ln.fresh ? "" : "opacity-70"} style={{ cursor: "pointer" }}
                    onClick={() => setModal({ title: "From the chronicle", lines: [ln.text] })}>{ln.text}</div>
                ))}
              </div>
            </div>
          ) : (
            <button className="text-sm px-3 py-2 rounded" style={{ background: "rgba(26,22,17,0.95)", border: "1px solid #6B5B3E", color: "#EDE4CF", boxShadow: "0 6px 20px rgba(0,0,0,0.5)" }}
              onClick={() => setChronOpen(true)}>
              The chronicle
            </button>
          )}
        </div>
      )}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(10,8,5,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={closeModal} onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
          <div className="p-4" style={{ background: "#221D15", color: "#EDE4CF", width: "min(560px, 92vw)", maxHeight: "72vh", overflowY: "auto", borderRadius: 12, border: "1px solid #8A7346", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-baseline mb-2">
              <b className="text-sm" style={serif}>{modal.title}</b>
              <button className="text-sm px-2 rounded" style={{ background: "#3A3226" }} onClick={closeModal}>✕</button>
            </div>
            {(modal.lines || []).map((l, i) => (
              <div key={i} className="text-xs mb-1" style={{ lineHeight: 1.5, ...mono }}>{l}</div>
            ))}
          </div>
        </div>
      )}
      <div className="p-4" style={isMobile ? {
        background: "rgba(26,22,17,0.96)", color: "#EDE4CF",
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: Math.min(window.innerHeight * 0.92, Math.max(sheetDragH ?? SNAPS()[sheet], dockH + 34)),
        overflow: "hidden", display: "flex", flexDirection: "column",
        borderRadius: "14px 14px 0 0", borderTop: "1px solid #8A7346",
        boxShadow: "0 -8px 30px rgba(0,0,0,0.55)", zIndex: 20, backdropFilter: "blur(3px)",
        transition: sheetDragH == null ? "height 160ms ease" : "none",
      } : {
        background: "rgba(26,22,17,0.93)", color: "#EDE4CF",
        position: "absolute", left: 12, top: 12, bottom: 12, width: 360,
        overflowY: "auto", borderRadius: 12, border: "1px solid #6B5B3E",
        boxShadow: "0 10px 34px rgba(0,0,0,0.5)", zIndex: 20, backdropFilter: "blur(3px)",
      }}
        onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        {isMobile && (
          <div style={{ margin: "-16px -16px 8px", padding: "10px 0 8px", cursor: "grab", touchAction: "none", flexShrink: 0 }}
            onPointerDown={(e) => { e.stopPropagation(); onSheetDown(e); }}
            onPointerMove={onSheetMove} onPointerUp={onSheetUp} onPointerCancel={onSheetUp}
            onClick={() => sheetDrag.current === null && setSheet((sheet + 1) % 3)}>
            <div style={{ width: 44, height: 5, borderRadius: 3, background: "#8A7346", margin: "0 auto" }} />
          </div>
        )}
        {isMobile ? (<>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
            {titleBlock()}
            {powerCards()}
            {chronicleBlock()}
          </div>
          <div ref={dockRef} style={{ flexShrink: 0, margin: "8px -16px -16px", padding: "8px 16px 16px", background: "#1F1B14", borderTop: "1px solid #6B5B3E", maxHeight: "86vh", overflowY: "auto" }}>
            {actionPanel()}
          </div>
        </>) : (<>
          {titleBlock()}
          {actionPanel()}
          {powerCards()}
        </>)}
      </div>
    </div>
  );
}

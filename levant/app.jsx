// =====================================================================
//  THE GREAT KINGS — THE TABLE
// =====================================================================
//  The hot-seat interface, and the scribe desk. Everything here is presentation and
//  interaction; the rules live in engine.js and are imported, never restated.
// =====================================================================

import React, { useState, useRef } from "react";
import {
  BT, FLOOR, GOODS, HOME, NB, PCOL,
  PLAYERS, PNAME, R, REG, SLETTER, availableCommands,
  battleUnits, biddablePeoples, view, tapYields, foodRots, contestActor, costCaption, costTapCovered, costTapDead,
  currentDefender, defenceIdx, defenceOrder, describeCmd, dispatch, effectiveSeat,
  endActivation, endRaid, entreatRemark, foodStore, forfeit, fortressDef,
  infOf, initState, isCoastal, isCommitted, legalBuildTypes, legalTargets,
  live, mapOnlyStep, myPalaces, perish, progressLine, raidStrength,
  rank, reach, sideList, specOf, stockCovers, tapProducers,
  tapRegionsOf, tradeSeat, unitPrice, upkeepDue, view, yieldOf,
} from "./engine.js";

export default function App() {
  const [g, setG] = useState(initState);
  const upd = (fn) => setG((old) => { const n = JSON.parse(JSON.stringify(old)); fn(n); return n; });
  const p = g.turn;
  const legal = legalTargets(g);
  const bothPassed = live(g).every((q) => g.passed[q]);

  const serif = { fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif" };
  const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

  // A click is written against the board the player is LOOKING AT, so it carries that
  // world's hash. If the scribe landed a command while they were looking, the click is
  // refused rather than applied to a board they never saw. An explicit stamp (the scribe's)
  // is left alone.
  const go = (cmd) => upd((n) => dispatch(n, cmd && cmd.chain === undefined ? { ...cmd, chain: g.chain } : cmd));
  const gRef = React.useRef(g); gRef.current = g;
  const [modal, setModal] = useState(null); // { title, lines }

  // ==================================================================
  //                        THE SCRIBE
  // ==================================================================
  // An interface layer, not part of the core: it renders what the engine already
  // knows, asks for ONE command, and dispatches it. The core is untouched and does
  // not know a model exists.
  //
  // THE LAYERS, outermost first:
  //   sendAllToScribe(list) — several directives in order
  //   sendToScribe(text)    — ONE directive, carried through to a completed action.
  //                           This is the scribe: the loop that decides when it is done.
  //   scribeMessage(...)    — the message it is sent (pure; no I/O)
  //   callModel(prompt)     — transport: HTTP, retries, JSON. No game knowledge.
  //   matchOnMenu(g, obj)   — is the reply a command actually on offer?
  //
  // CONCURRENCY. A model call is slow and the world may move during it, so every request
  // is a PACKET naming the power it speaks for, and every step begins with ONE atomic read:
  //
  //     snapshot ← world
  //     h    = snapshot.chain            ─ taken FIRST, so hash and desk describe one world
  //     desk = effectiveSeat(snapshot)
  //     if desk ≠ packet.power  → DROP the packet before calling the model
  //     …build, call, and dispatch the answer stamped with h…
  //
  // Two failures, two meanings, two responses:
  //   · SEAT MISMATCH — this is not our desk. No call is made, nothing is retried, and the
  //     seat's queue is LEFT INTACT: a raid hands the desk to each protector and then gives
  //     it back, and the attacker's plan must survive the round trip. Costs no budget.
  //   · STALE STAMP — still our desk, but the world moved while we were thinking. The
  //     directive is still good; re-read the world and ask again. Costs budget, because a
  //     scribe retrying forever against a moving world is the old vizier wearing a new hat.
  //
  // Single-flight remains the practice — each message is built from the state the last
  // command produced, so there is nothing to overlap — but correctness no longer depends
  // on that discipline holding.
  //
  // The shape below is not a guess. It is the configuration the bench measured at
  // 97.5% per step, against 72.5% for the same model given a whole activation's plan
  // (see harness/SCRIBE-FINDINGS.md). Three things carry that difference:
  //   · ONE ACTION PER DIRECTIVE. The scribe never sees later steps. Position errors
  //     went 8 → 5 → 0 across whole-plan, whole-plan-with-a-marker, and per-action.
  //   · GLOSSES. Every legal command carries describeCmd's account of what it does.
  //   · GROUNDING. Where things stand, and what has been done since this action began.
  // Change any of it and the number is no longer the number that was measured.
  // ==================================================================
  const SCRIBE_MODEL = "claude-sonnet-4-6";
  const SCRIBE_MAX_STEPS = 16;    // measured: an action takes 6.2 dispatches, p90 12
  const SCRIBE_MAX_STALE = 3;     // re-readings allowed before we admit we cannot keep up
  const SCRIBE_PACE = 320;        // ms between commands, so the board can be watched
  const [scribeBusy, setScribeBusy] = useState(false);
  const [scribeLog, setScribeLog] = useState([]);   // { step, cmd, gloss, note, raw }
  const scribeStop = React.useRef(false);
  const busyRef = React.useRef(false);              // the desk is held here, not in render state
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // THE MESSAGE the scribe is sent, assembled exactly as the bench assembled it.
  function scribeMessage(gg, text, sinceLen) {
    const menu = availableCommands(gg).filter((c) => !["forfeit", "pass"].includes(c.t));
    const L = [];
    L.push("You are the scribe of a Late Bronze Age court, carrying out an instruction one command at a time.");
    L.push("");
    L.push("THE LEGAL COMMANDS RIGHT NOW — choose exactly ONE and copy its JSON verbatim:");
    for (const c of menu) {
      const clean = { ...c }; delete clean.standing; delete clean.b;
      L.push(`  ${JSON.stringify(clean)} — ${describeCmd(gg, c)}`);
    }
    L.push("");
    L.push("WHERE THINGS STAND: " + (gg.act ? progressLine(gg, gg.turn)
      : gg.raid ? `A raid is under way at ${R[gg.raid.t].n}.` : "No activation is open."));
    L.push("");
    const done = gg.log.slice(0, Math.max(0, gg.log.length - sinceLen)).reverse().slice(-10);
    if (done.length) {
      L.push("DONE SO FAR IN THIS ACTION (oldest first):");
      for (const l of done) L.push("  " + (l.length > 150 ? l.slice(0, 150) + "…" : l));
      L.push("");
    }
    L.push(`YOUR INSTRUCTION: "${text}"`);
    L.push("");
    L.push("Reply with ONLY the JSON of one command from the list above. No prose, no fences.");
    return L.join("\n");
  }

  // THE MODEL CALL. Transport and nothing else: it knows about HTTP, rate limits and
  // JSON, and knows nothing about the game, the menu or what a scribe is. Swap the model
  // or the provider and this is the only function that changes.
  // A call that never returned is not an answer: retry, then give up loudly.
  async function callModel(prompt, tries = 4) {
    let last = null;
    for (let a = 0; a < tries; a++) {
      if (a) await sleep(700 * Math.pow(2, a - 1) + Math.random() * 300);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: SCRIBE_MODEL, max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
        });
        if (res.status === 429 || res.status >= 500) { last = new Error("HTTP " + res.status); continue; }
        const raw = await res.text();
        let data; try { data = JSON.parse(raw); } catch (e) { last = new Error("non-JSON reply"); continue; }
        if (data.error) { last = new Error(data.error.message || "API error"); if (!/rate|overload|capacity/i.test(last.message)) break; continue; }
        const text = (data.content || []).map((b) => b.text || "").join("").replace(/```json|```/g, "").trim();
        let obj = null;
        try { obj = JSON.parse(text); } catch (e) {
          const i = text.indexOf("{"), j = text.lastIndexOf("}");
          if (i >= 0 && j > i) { try { obj = JSON.parse(text.slice(i, j + 1)); } catch (e2) {} }
        }
        return { text, obj };
      } catch (e) { last = e; }
    }
    throw last || new Error("no answer");
  }

  // Is the reply a command actually on offer? The one place that knows the menu's shape.
  function matchOnMenu(gg, obj) {
    if (!obj) return null;
    return availableCommands(gg).find((c) => {
      const clean = { ...c }; delete clean.standing; delete clean.b;
      return JSON.stringify(clean) === JSON.stringify(obj);
    }) || null;
  }

  // ONE ACTION-PROPER, then stop. The boundary is arithmetic, not judgement: a spent
  // command decrements capLeft, and a closed activation ends the action outright.
  // ONE STEP: at most one model call and one dispatch. The whole concurrency protocol
  // lives here, so the loops above it stay simple.
  async function scribeStep(packet) {
    const snap = gRef.current;                     // ONE read of the world…
    const chain = snap.chain;                              // …hash first…
    const desk = effectiveSeat(snap);              // …then whose desk it is
    if (desk !== packet.power) return { kind: "not-our-desk", desk };
    if (snap.shortfall) return { kind: "interrupted" };

    let answer;
    try { answer = await callModel(scribeMessage(snap, packet.text, packet.sinceLen)); }
    catch (e) { return { kind: "unanswered", detail: e.message }; }

    const cmd = matchOnMenu(snap, answer.obj);
    if (!cmd) return { kind: "off-menu", raw: answer.text };

    go({ ...cmd, chain });                             // stamped with the world we read
    await sleep(SCRIBE_PACE);
    // Refused? The chain did not move. That is how we learn the stamp was stale.
    if (gRef.current.chain === chain) return { kind: "stale", cmd };
    return { kind: "done", cmd, gloss: describeCmd(snap, cmd) };
  }

  // SEND ONE DIRECTIVE TO THE SCRIBE, who carries it out: consulting the model, checking
  // each answer against the live menu, dispatching, and stopping when the action-proper is
  // done. This IS the scribe — the loop, not the API call. It reads nothing from the
  // interface and knows nothing about a text box, so a planner, a queue or a test calls it
  // exactly as the button does. Returns why it stopped, so a caller can decide what next.
  async function sendToScribe(text, power) {
    text = String(text || "").trim();
    if (!text) return { ok: false, reason: "empty directive" };
    if (busyRef.current) return { ok: false, reason: "the scribe is already at the desk" };
    busyRef.current = true;
    setScribeBusy(true); scribeStop.current = false; setScribeLog([]);

    // THE PACKET names the power it speaks for. Ownership can change between the moment a
    // directive is written and the moment it is worked on; the packet is how the step knows.
    const packet = { power: power || effectiveSeat(gRef.current), text, sinceLen: gRef.current.log.length };
    const note = (n) => setScribeLog((L) => [...L, n]);

    let baseline = gRef.current.act ? gRef.current.act.capLeft : null;
    const hadAct = !!gRef.current.act;
    let steps = 0, stale = 0, calls = 0;
    let outcome = { ok: false, reason: "the scribe found no end", steps: 0 };
    const finish = (ok, reason) => { outcome = { ok, reason, steps, stale }; };

    while (steps < SCRIBE_MAX_STEPS && calls < SCRIBE_MAX_STEPS + SCRIBE_MAX_STALE) {
      if (scribeStop.current) { note({ note: "The king dismisses the scribe." }); finish(false, "dismissed"); break; }
      calls++;
      const r = await scribeStep(packet);

      if (r.kind === "not-our-desk") {
        note({ note: `The desk has passed to ${PNAME[r.desk] || "another court"}; the instruction waits.` });
        finish(false, "not our desk"); break;       // the packet is dropped, the plan is not
      }
      if (r.kind === "interrupted") { note({ note: "The court has other business first." }); finish(false, "interrupted"); break; }
      if (r.kind === "unanswered") { note({ note: "No answer from the scribe — " + r.detail }); finish(false, "unanswered"); break; }
      if (r.kind === "off-menu") { note({ note: "The scribe writes something that is not on the menu.", raw: r.raw }); finish(false, "off-menu"); break; }
      if (r.kind === "stale") {
        stale++;
        note({ note: "The world moved while the scribe was writing; it reads again." });
        if (stale > SCRIBE_MAX_STALE) { finish(false, "kept losing the thread"); break; }
        continue;                                    // same directive, fresh reading
      }

      steps++;
      note({ step: steps, cmd: r.cmd, gloss: r.gloss });

      const n = gRef.current;
      if (effectiveSeat(n) !== packet.power) { finish(true, "the desk passed with the action"); break; }
      if (hadAct || baseline !== null) {
        if (!n.act) { note({ note: "The activation closes." }); finish(true, "activation closed"); break; }
        if (baseline != null && n.act.capLeft < baseline) { note({ note: "The command is spent — the action is complete." }); finish(true, "action complete"); break; }
      } else if (n.act) {
        baseline = n.act.capLeft;            // the activation has just opened; measure from here
      }
    }
    if (steps >= SCRIBE_MAX_STEPS) note({ note: `The scribe has written ${steps} times without finishing; the court stops it.` });
    busyRef.current = false;
    setScribeBusy(false);
    return outcome;
  }

  // SEVERAL DIRECTIVES IN ORDER — a planner's whole turn, or a scripted opening. Stops the
  // moment one fails, because a plan whose second step assumed the first is not worth
  // continuing blind.
  async function sendAllToScribe(list) {
    const out = [];
    const power = effectiveSeat(gRef.current);
    for (const d of list) {
      const r = await sendToScribe(d, power);   // every directive speaks for the same court
      out.push({ directive: d, ...r });
      if (!r.ok || scribeStop.current) break;
    }
    return out;
  }
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
  // the sheet follows the step: peek when the map is where the work is, half when it is not.
  // it moves only when the STEP changes, so a hand-dragged height is never yanked away.
  const mapStep = mapOnlyStep(g);
  const stepSig = [!!g.act, g.mode ? g.mode.v : "-", g.mode && g.mode.region ? "r" : "",
    (g.mode && g.mode.phase) || "", g.shortfall ? "s" : "",
    g.raid ? "raid" + g.raid.strikes : "", g.turn].join("|");
  const lastStep = useRef("");
  React.useEffect(() => {
    if (!isMobile) { lastStep.current = stepSig; return; }
    if (lastStep.current === stepSig) return;
    lastStep.current = stepSig;
    setSheetDragH(null);
    setSheet(mapStep ? 0 : 1);
  }, [stepSig, isMobile, mapStep]);

  const onSheetDown = (e) => { sheetDrag.current = { y: e.clientY, h: sheetDragH ?? SNAPS()[sheet] }; };
  const onSheetMove = (e) => {
    if (!sheetDrag.current) return;
    const h = Math.max(70, Math.min(window.innerHeight * 0.92, sheetDrag.current.chain + (sheetDrag.current.y - e.clientY)));
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
  const regW = (r) => Math.max(PADX * 2 + r.slots.length * SLOT + (r.slots.length - 1) * GAP, 100);
  const regH = HEAD + SLOT + 23;
  const cx = (r) => r.x + regW(r) / 2;
  const cy = (r) => r.y + regH / 2;

  function relLine(rid) {
    if (rid === HOME.E) return [["E", "home", PCOL.E]];
    if (rid === HOME.H) return [["H", "home", PCOL.H]];
    const parts = [];
    for (const q of live(g)) {
      const rr = g.rel[q][rid];
      if (rr && (rr.i > 0 || rr.s !== "none")) parts.push([q, `${rr.i}${SLETTER[rr.s]}${rr.strained ? "!" : ""}`, PCOL[q]]);
    }
    return parts;
  }

  // ---- the panel's sections, each with one home, so desktop and phone can place them differently ----
  const titleBlock = () => (<>
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl" style={serif}>The Great Kings</h1>
            <span style={mono} className="text-xs opacity-70">round {g.round} · v0.25 · five kings</span>
          </div>
  </>);
  // ============ THE TABLE DRAWS WHAT THE STATE SAYS ============
  // One question — view(g) — one structure. These renderers know four PRESENTATIONAL kinds
  // and nothing else: not what a command is, not whether a payment suffices, not that raids
  // differ from embassies. Each option carries its own command; clicking ships it back
  // verbatim. A new verb needs no change here.
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
      return <div key={k} className="mt-1 text-sm" style={{ color: PCOL[p] }}>{pan.text}</div>;
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
  // draw the state's own panels, chosen by id. The table never decides WHETHER a panel
  // applies — the state simply does not emit one that does not.
  // THE SKELETON. Six bands, always in this order, each absent only when it holds nothing.
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
    const ps = view(g).panels.filter((pan) => pan.band === name);
    if (!ps.length) return null;
    return (
      <div key={name} className={name === "turn" ? "mt-4 pt-3" : "mt-2"}
        style={{ borderTop: name === "turn" ? "1px solid #332C21" : undefined }}>
        {ps.map(drawPanel)}
      </div>
    );
  };
  const bands = () => <>{BANDS.map(band)}</>;
  const fromView = (...ids) => {
    const pre = ids.filter((x) => x.endsWith(":"));
    const exact = new Set(ids.filter((x) => !x.endsWith(":")));
    return <>{view(g).panels
      .filter((pan) => exact.has(pan.id) || pre.some((x) => String(pan.id).startsWith(x)))
      .map(drawPanel)}</>;
  };

  // THE COURTS as the state reports them: stores, what is due, what winter will take. The
  // panel used to compute the spoilage itself — a rule in a card. It reads facts now.
  const powerCards = () => (<>
          {view(g).panels.filter((pan) => String(pan.id).startsWith("court:")).map((pan, k) => (
            <div key={k} className="mt-3 p-2 rounded"
              style={{ background: pan.subject.self ? "#3A3226" : "#332C21", border: "1px solid #54492F" }}>
              <div className="flex justify-between text-sm">
                <b style={{ color: PCOL[pan.subject.power] }}>{pan.label}</b>
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
  // every control the turn actually needs: on desktop it sits high in the panel, on the
  // phone it is docked to the foot of the sheet where the thumb already is
  // THE DESK is only a way to type a directive and hand it over. It owns its own text and
  // nothing else; the carrying-out belongs to sendToScribe(), which does not know it exists.
  const [deskText, setDeskText] = useState("");
  const sendDesk = () => sendToScribe(deskText);
  const scribeDesk = () => (<>
    {!g.shortfall && !bothPassed && g.turn === p && (
      <div className="mt-2 p-2 rounded" style={{ background: "#1F1B14", border: `1px solid ${scribeBusy ? "#6E9A86" : "#3A3226"}` }}>
        <div className="text-xs mb-1" style={{ ...mono, color: "#8A7346", letterSpacing: ".08em" }}>
          THE SCRIBE — one instruction, one action
        </div>
        <div className="flex gap-2 items-start">
          <textarea
            value={deskText} onChange={(e) => setDeskText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendDesk(); }}
            placeholder="Raise a granary at Nippur, paying with Nippur's farm"
            rows={2}
            style={{ flex: 1, background: "#15130E", color: "#EDE4CF", border: "1px solid #3A3226", borderRadius: 3,
                     padding: "6px 8px", lineHeight: 1.45, resize: "vertical", ...mono,
                     // iOS zooms the page for any field under 16px. The map is pinch-zoomable
                     // and must stay that way, so the type grows rather than the viewport locking.
                     fontSize: isMobile ? 16 : 12 }} />
          {scribeBusy ? (
            <button onClick={() => { scribeStop.current = true; }}
              style={{ background: "#5C2B2B", color: "#EDE4CF", border: "1px solid #8A4A4A", borderRadius: 3,
                       padding: "8px 14px", fontSize: 12, cursor: "pointer", ...mono }}>■ stop</button>
          ) : (
            <button onClick={sendDesk} disabled={!deskText.trim()}
              style={{ background: deskText.trim() ? "#2F5548" : "#2A241B", color: deskText.trim() ? "#EDE4CF" : "#6B624F",
                       border: `1px solid ${deskText.trim() ? "#4A7A6B" : "#3A3226"}`, borderRadius: 3,
                       padding: "8px 16px", fontSize: 12, cursor: deskText.trim() ? "pointer" : "default",
                       fontWeight: 600, ...mono }}>go</button>
          )}
        </div>
        {scribeLog.length > 0 && (
          <div className="mt-2 p-2 rounded text-xs" style={{ background: "#15130E", maxHeight: 132, overflowY: "auto", ...mono, lineHeight: 1.5 }}>
            {scribeLog.map((e, i) => (
              <div key={i} style={{ color: e.note ? "#C9A06A" : "#A2957A", marginBottom: 2 }}>
                {e.note ? `— ${e.note}` : `${e.step}. ${e.gloss}`}
                {e.raw && <div style={{ color: "#B4634A", marginTop: 2 }}>{e.raw.slice(0, 160)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </>);
  // THE PANEL IS THE SKELETON. Every branch it used to hold — which building, which verb,
  // the sourcing, the assembly, the bidding — is a band the state fills or leaves empty.
  const actionPanel = () => bands();

  const chronicleBlock = () => (<>
          {isMobile && (
            <div className="mt-3">
              <div className="flex justify-between items-baseline">
                <div className="text-sm">Chronicle</div>
                <button className="text-xs px-2 py-0.5 rounded" style={{ background: "#54492F" }} onClick={() => setG(initState())}>reset</button>
              </div>
              <div className="mt-1 p-2 rounded text-xs leading-relaxed" style={{ background: "#241F16", maxHeight: 230, overflowY: "auto", ...mono }}>
                {g.log.map((l, i) => (
                  <div key={i} className={i === 0 ? "" : "opacity-70"} style={{ cursor: "pointer" }}
                    onClick={() => setModal({ title: "From the chronicle", lines: [l] })}>{l}</div>
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
          {NB.map(([a, b], i) => (
            <line key={i} x1={cx(R[a])} y1={cy(R[a])} x2={cx(R[b])} y2={cy(R[b])} stroke="#B3A47F" strokeWidth="2.5" />
          ))}

          {REG.map((r) => {
            const hotR = legal.regions.has(r.id);
            const isActPal = g.act && g.act.palace === r.id;
            const w = regW(r);
            const home = PLAYERS.find((q) => HOME[q] === r.id) || null;
            const subj = home || PLAYERS.find((q) => !g.out[q] && rank(g, q, r.id) >= 3) || null;
            const allyOf = !subj ? PLAYERS.find((q) => !g.out[q] && rank(g, q, r.id) === 2) || null : null;
            return (
              <g key={r.id}>
                <rect x={r.x} y={r.y} width={w} height={regH} rx={r.wild ? 2 : 9}
                  fill={subj ? PCOL[subj] + "26" : r.wild ? "#BCA678" : "#D8CCA8"}
                  stroke={hotR ? "#7A3B0E" : isActPal ? "#2A241B" : subj ? PCOL[subj] : allyOf ? PCOL[allyOf] : r.wild ? "#6E5C3A" : "#A69770"}
                  strokeWidth={hotR ? 3 : isActPal ? 2.5 : subj ? 2 : 1.4}
                  strokeDasharray={allyOf && !subj ? "6 3" : r.wild ? "2 3" : undefined}
                  style={{ cursor: hotR ? "pointer" : "default" }}
                  onClick={noDrag(() => hotR && go({ t: "region", rid: r.id }))}
                />
                {isCoastal(r.id) && (
                  <rect x={r.x + w - 11} y={r.y + regH - 11} width="7" height="7" rx="1.5"
                    fill="#3E5F82" stroke="#22384D" strokeWidth="0.8" style={{ pointerEvents: "none" }} />
                )}
                <text x={r.x + PADX} y={r.y + 14} fontSize="11" fill={r.wild ? "#4A3D24" : "#2A241B"} style={{ ...serif, pointerEvents: "none" }}>
                  {r.wild ? "⌃ " : ""}{r.n}{home ? " ✶" : ""}{r.f > 0 ? `  ·  f${r.f}` : ""}{r.wild ? "  ·  wild" : ""}
                </text>
                {r.slots.map((s, i) => {
                  const bd = g.b[r.id][i];
                  const sx = r.x + PADX + i * (SLOT + GAP);
                  const sy = r.y + HEAD;
                  const hotS = legal.slots.has(r.id + ":" + i);
                  return (
                    <g key={i} style={{ cursor: hotS ? "pointer" : "default" }} onClick={noDrag(() => hotS && go(g.act ? { t: "slot", rid: r.id, i } : { t: "activate", rid: r.id, i }))}>
                      {r.wild ? (
                        <circle cx={sx + SLOT / 2} cy={sy + SLOT / 2} r={SLOT / 2 - 1}
                          fill="#D6C39A" stroke={hotS ? "#7A3B0E" : "#6E5C3A"} strokeWidth={hotS ? 2.5 : 1}
                          strokeDasharray={hotS ? undefined : "2 3"} />
                      ) : (
                        <rect x={sx} y={sy} width={SLOT} height={SLOT} rx="5"
                          fill={s.c ? "#C7D5E2" : s.res ? "#D9C08F" : "#EFE7CE"}
                          stroke={hotS ? "#7A3B0E" : "#A69770"} strokeWidth={hotS ? 2.5 : 1} />
                      )}
                      {!bd && (s.c || s.res) && (
                        <text x={sx + SLOT / 2} y={sy + SLOT / 2 + 3} fontSize="8" textAnchor="middle" fill="#54492F" style={mono}>
                          {s.c ? "sea" : { copper: "Cu", cloth: "Dy", clay: "Ky" }[s.res]}
                        </text>
                      )}
                      {bd && (
                        <g transform={bd.tap || bd.pill ? `rotate(12 ${sx + SLOT / 2} ${sy + SLOT / 2})` : undefined} opacity={bd.tap && !bd.pill ? 0.5 : 1}>
                          <rect x={sx + 3} y={sy + 3} width={SLOT - 6} height={SLOT - 6} rx="4"
                            fill={bd.pill ? "#D9A6A0" : "#F5EDD8"}
                            stroke={PCOL[bd.o] || "#8A6A2F"} strokeWidth="2.2" />
                          <text x={sx + SLOT / 2} y={sy + SLOT / 2 + 3.5} fontSize="10" textAnchor="middle" fill="#2A241B" style={mono}>{BT[bd.t].g}</text>
                        </g>
                      )}
                    </g>
                  );
                })}
                <text x={r.x + PADX} y={r.y + regH - 6} fontSize="9" style={mono}>
                  {relLine(r.id).map(([q, s, col], i) => (
                    <tspan key={q} fill={col}>{i > 0 ? "  " : ""}{PNAME[q].slice(0, 2)} {s}</tspan>
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
                {g.log.map((l, i) => (
                  <div key={i} className={i === 0 ? "" : "opacity-70"} style={{ cursor: "pointer" }}
                    onClick={() => setModal({ title: "From the chronicle", lines: [l] })}>{l}</div>
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
            {scribeDesk()}
            {actionPanel()}
          </div>
        </>) : (<>
          {titleBlock()}
          {scribeDesk()}
          {actionPanel()}
          {powerCards()}
        </>)}
      </div>
    </div>
  );
}

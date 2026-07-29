import React, { useState, useMemo, useRef } from "react";

// ===================================================================
// ORDERS BENCH — the control panel
// ===================================================================
// TEACHER FORCED. Every position's state is fixed: whatever a candidate answers, the
// bench advances by the oracle. All candidates and all conditions are therefore scored
// on identical boards, and per-step accuracy is comparable across runs.
//
// SCORED ON WHERE A PICK LEADS, not on which command it is. Every option carries the
// fingerprint of the board it reaches, and the accepted set is derived from what the
// ORDER licenses — so two different commands arriving at the same place both count.
//
// THIS FILE IS BUILT, NOT WRITTEN. harness/bench/build-bench.js assembles it from the
// engine, the corpus generator and the pack renderer, so the bench cannot drift from the
// game. It carries no corpus: it makes one from a seed, or loads one you saved.
// ===================================================================
// No pack is embedded. The bench GENERATES one from the engine above, or LOADS one you
// made earlier, and can SAVE what it holds. A corpus is data now, not part of the tool.

const F = {
  ink: "#EDE4CF", dim: "#A2957A", faint: "#6B624F", ground: "#14110C",
  panel: "#1C1913", panel2: "#242019", brass: "#8A7346", gold: "#D9C58A",
  good: "#6E9A86", bad: "#B4634A", warn: "#C9A06A", violet: "#9B7FB0",
};
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const serif = { fontFamily: "Spectral, Iowan Old Style, Palatino, Georgia, serif" };

let PACKREF = { commands: [] };
const CLASSES = ["activate", "verb", "target", "toggle", "payment", "terminal", "buildType"];

// ---------- prompt assembly: the thing actually under test ----------
function buildPrompt(pack, cse, pos, opt) {
  const S = (i) => pack.strings[i];
  const cmd = (i) => pack.commands[i];
  const lines = [];

  lines.push("You are the scribe of a Late Bronze Age court, carrying out an instruction one command at a time.");
  lines.push("");
  lines.push("THE LEGAL COMMANDS RIGHT NOW — choose exactly ONE and copy its JSON verbatim:");
  for (const [ci, gi] of pos.menu) {
    lines.push(opt.glosses ? `  ${JSON.stringify(cmd(ci))} — ${S(gi)}` : `  ${JSON.stringify(cmd(ci))}`);
  }
  lines.push("");
  if (opt.stand) { lines.push("WHERE THINGS STAND: " + S(pos.blocks.stand)); lines.push(""); }
  if (opt.stores) { lines.push("STORES:"); for (const s of pos.blocks.stores) lines.push("  " + S(s)); lines.push(""); }
  if (opt.done && pos.blocks.done.length) {
    lines.push("DONE SO FAR IN THIS ACTION (oldest first):");
    for (const l of pos.blocks.done) lines.push("  " + S(l));
    lines.push("");
  }
  if (opt.year && pos.blocks.year.length) {
    lines.push("THE YEAR SO FAR (oldest first):");
    for (const l of pos.blocks.year) lines.push("  " + S(l));
    lines.push("");
  }
  const instruction = instructionFor(cse, pos, opt);
  if (opt.register === "order") {
    lines.push("YOUR ORDER (structured — carry it out exactly):");
    lines.push("  " + instruction);
  } else {
    lines.push(`YOUR INSTRUCTION: "${instruction}"`);
  }
  if (opt.marker && cse.actions.length > 1) {
    lines.push(`(step ${pos.a + 1} of ${cse.actions.length}; the earlier steps are already done)`);
  }
  lines.push("");
  lines.push('Reply with ONLY the JSON of one command from the list above. No prose, no fences.');
  return lines.join("\n");
}

// ---------- candidates ----------
const CANDIDATES = {
  oracle: { label: "Oracle", hint: "always right — proves the bench can score 100%", color: F.good },
  wrong: { label: "Always wrong", hint: "always a legal but unacceptable pick — must score 0%", color: F.bad },
  random: { label: "Random legal", hint: "uniform over the menu — must land near the computed baseline", color: F.warn },
  expander: { label: "Expander", hint: "no model — the order licenses exactly one command", color: "#7FA8C9" },
  llm: { label: "Model", hint: "claude-sonnet-4-6 through the gateway", color: F.violet },
};

function pickFor(kind, pos, rnd) {
  if (kind === "oracle") return pos.oracle;
  // where EVERY option leads somewhere accepted there is no wrong answer to give. Saying so
  // is honest; falling back to menu[0] would quietly credit the candidate with a right one.
  if (kind === "wrong") return pos.wrong >= 0 ? pos.wrong : -4;
  if (kind === "random") return pos.menu[Math.floor(rnd() * pos.menu.length)][0];
  // THE EXPANDER: no model at all. The order licenses exactly one option here, or the
  // order does not say enough — and that is itself the result worth seeing.
  if (kind === "expander") {
    const lic = pos.lic || [];
    if (!lic.length) return -3;                       // the order says nothing here
    // several of the SAME kind is benign — the order named all of them and their sequence
    // is free. Several of DIFFERENT kinds means the order does not say enough.
    const kinds = new Set(lic.map((k) => (PACKREF.commands[pos.menu[k][0]] || {}).t));
    if (kinds.size > 1) return -3;
    return pos.menu[lic[0]][0];
  }
  return null;
}

// A pick is RIGHT if it reaches a position the order accepts. Comparing boards rather than
// commands means two different commands that arrive at the same place both count — which is
// what "did it carry out the order" actually means.
function bandOf(pos, pickIx) {
  if (pickIx === -4) return "no-wrong-answer";
  if (pickIx === -3) return "unlicensed";
  const k = pos.menu.findIndex(([ci]) => ci === pickIx);
  if (k < 0) return "illegal";
  const reached = pos.fp ? pos.fp[k] : null;
  const right = pos.fp ? (pos.ok || []).includes(reached) : pos.acc.includes(pickIx);
  if (right) return pickIx === pos.oracle ? "optimal" : "acceptable";
  return pos.traps.includes(pickIx) ? "trap" : "wrong";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A CALL THAT NEVER RETURNED IS NOT A WRONG ANSWER. Fired in a tight loop these calls get
// rate-limited, the body comes back as something other than JSON, res.json() throws, and
// the position is scored a failure the model never had a chance at. So: retry with backoff,
// and if it still will not answer, mark the position UNANSWERED and leave it out of the score.
async function askModel(prompt, pack, tries = 4) {
  let lastErr = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    if (attempt) await sleep(700 * Math.pow(2, attempt - 1) + Math.random() * 300);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
      });
      if (res.status === 429 || res.status >= 500) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch (e) { lastErr = new Error("non-JSON body: " + raw.slice(0, 60)); continue; }
      if (data.error) { lastErr = new Error(data.error.message || "API error"); if (!/rate|overload|529|capacity/i.test(lastErr.message)) break; continue; }
      return { ...extract(data), attempts: attempt + 1 };
    } catch (e) { lastErr = e; }
  }
  throw Object.assign(lastErr || new Error("no answer"), { unanswered: true, attempts: tries });
}

function extract(data) {
  const text = (data.content || []).map((b) => b.text || "").join("").replace(/```json|```/g, "").trim();
  let obj = null;
  try { obj = JSON.parse(text); } catch (e) {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a >= 0 && b > a) { try { obj = JSON.parse(text.slice(a, b + 1)); } catch (e2) {} }
  }
  return { text, obj };
}
const sameCmd = (a, b) => a && b && JSON.stringify(a) === JSON.stringify(b);

// WHICH INSTRUCTION APPLIES HERE. Directives are keyed by the power they speak for: an
// ordinary activation is one court's business, but a contest passes the desk around the
// table, and each court answers to its own plan. Scoring Egypt against Hatti's instruction
// is not a hard case — it is the wrong question.
function instructionFor(cse, pos, opt) {
  const forSeat = cse.directives[pos.seat] || cse.directives[cse.seat] || {};
  const whole = forSeat[opt.register] || forSeat.prose || "";
  // per-action phrasing applies only to the court whose plan the actions describe
  if (opt.scope === "action" && pos.seat === cse.seat && cse.actions && cse.actions[pos.a]) {
    const ph = cse.actions[pos.a].phrase;
    if (ph && (ph[opt.register] || ph.prose)) return ph[opt.register] || ph.prose;
  }
  return whole;
}

// One definition of "how did it do", shared by the panel and the downloaded file, so a
// result read later cannot disagree with the result seen at the time.
function summaryOf(allRows) {
  if (!allRows || !allRows.length) return null;
  // a position the model never answered tells us nothing: count it, then set it aside
  // positions that cannot discriminate tell us nothing about a candidate
  const unanswered = allRows.filter((r) => r.band === "unanswered").length;
  const rows = allRows.filter((r) => r.band !== "unanswered" && r.band !== "no-wrong-answer");
  if (!rows.length) return { micro: 0, macro: 0, classRows: [], modeRows: [], bands: { unanswered }, trapN: 0, trapPct: 0, unanswered, scored: 0 };
  const ok = (r) => r.band === "optimal" || r.band === "acceptable";
  const pct = (a) => (a.length ? (100 * a.filter(ok).length / a.length) : 0);
  const byClass = {};
  for (const r of rows) (byClass[r.cls] = byClass[r.cls] || []).push(r);
  const classRows = CLASSES.filter((c) => byClass[c]).map((c) => ({ cls: c, n: byClass[c].length, pct: +pct(byClass[c]).toFixed(1) }));
  const macro = classRows.length ? classRows.reduce((a, r) => a + r.pct, 0) / classRows.length : 0;
  const byMode = {};
  for (const r of rows) (byMode[r.mode] = byMode[r.mode] || []).push(r);
  const modeRows = Object.entries(byMode).map(([m, v]) => ({ mode: m, n: v.length, pct: +pct(v).toFixed(1) }))
    .sort((a, b) => b.n - a.n);
  const trapped = rows.filter((r) => r.trapped);
  const bands = {};
  for (const r of rows) bands[r.band] = (bands[r.band] || 0) + 1;
  for (const r of allRows) if (r.band === "unanswered") bands.unanswered = (bands.unanswered || 0) + 1;
  return {
    micro: +pct(rows).toFixed(1), macro: +macro.toFixed(1), classRows, modeRows, bands,
    trapN: trapped.length, trapPct: +pct(trapped).toFixed(1),
    unanswered, scored: rows.length,
  };
}

export default function App() {
  const EMPTY = { strings: [], commands: [], cases: [], meta: {} };
  const [pack, setPack] = useState(EMPTY);
  const [seed, setSeed] = useState(12345);
  const [making, setMaking] = useState(false);
  PACKREF = pack;

  // BUILD A CORPUS HERE, from the engine compiled into this file. Same code the harness
  // runs, so a bench corpus and a command-line corpus are the same artefact.
  function makeCorpus() {
    setMaking(true);
    setTimeout(() => {
      try {
        const corpus = main({ seeds: [seed, seed + 1, seed + 2, seed + 3, seed + 4, seed + 5] });
        const p = renderPack(corpus);
        setPack(p); setRows([]); setLastRun(null);
      } catch (e) {
        setShowText({ body: String(e && e.stack || e), note: "the corpus could not be generated" });
      }
      setMaking(false);
    }, 30);
  }

  function loadPack(text) {
    try {
      const p = JSON.parse(text);
      if (!p.cases || !p.commands) throw new Error("that does not look like a pack");
      setPack(p); setRows([]); setLastRun(null); setShowText(null);
    } catch (e) { setShowText({ body: String(e.message), note: "could not read that pack" }); }
  }

  function savePack() {
    const body = JSON.stringify(pack);
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `orders-pack-seed${seed}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const [opt, setOpt] = useState({
    glosses: true, stand: true, done: true, year: false, stores: false, marker: false,
    register: "prose", scope: "activation",
  });
  const [filter, setFilter] = useState({ short: true, long: true, contest: false });
  const [limit, setLimit] = useState(40);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showText, setShowText] = useState(null);
  const stop = useRef(false);

  const selected = useMemo(() => {
    const want = (c) => (c.cls === "contest" ? filter.contest : c.scope === "activation" ? filter.long : filter.short);
    const cases = pack.cases.filter(want);
    const out = [];
    for (const c of cases) for (const p of c.positions) if (!p.forced) out.push({ c, p });
    return out;
  }, [pack, filter]);

  const budget = Math.min(limit, selected.length);

  async function run(kind) {
    if (busy) return;
    setBusy(kind); stop.current = false; setRows([]); setProgress({ done: 0, total: budget });
    let s = 20260729 >>> 0;
    const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const acc = [];
    for (let i = 0; i < budget; i++) {
      if (stop.current) break;
      const { c, p } = selected[i];
      let pickIx = pickFor(kind, p, rnd), raw = null, err = null;
      let attempts = 0, unanswered = false;
      if (kind === "llm") {
        const prompt = buildPrompt(pack, c, p, opt);
        try {
          const r = await askModel(prompt, pack);
          raw = r.text; attempts = r.attempts;
          if (r.obj) { const hit = p.menu.find(([ci]) => sameCmd(pack.commands[ci], r.obj)); pickIx = hit ? hit[0] : -2; }
          else pickIx = -2;                       // answered, but not with a command on the menu
        } catch (e) { err = e.message; unanswered = !!e.unanswered; attempts = e.attempts || 1; pickIx = -2; }
        await sleep(120);                         // pace the loop so the limiter is not the experiment
      }
      const band = unanswered ? "unanswered" : bandOf(p, pickIx);
      const J = (ix) => (ix >= 0 && pack.commands[ix] ? pack.commands[ix] : null);
      acc.push({
        case: c.id, scope: c.scope, caseClass: c.cls,
        action: p.a, i: p.i, cls: p.cls, mode: p.mode, seat: p.seat,
        menuN: p.menu.length, trapped: p.traps.length > 0, band, attempts, unanswered,
        // everything needed to re-read this decision without the bench in front of you
        picked: J(pickIx), oracle: J(p.oracle),
        acceptable: p.acc.map(J), traps: p.traps.map(J),
        menu: p.menu.map(([ci]) => pack.commands[ci]),
        instruction: instructionFor(c, p, opt),
        raw, err,
      });
      setRows([...acc]); setProgress({ done: i + 1, total: budget });
      if (kind !== "llm") await new Promise((r) => setTimeout(r, 0));
    }
    setBusy(null); setProgress(null);
    setLastRun({ candidate: kind, at: new Date().toISOString(), options: { ...opt }, filter: { ...filter }, budget, rows: acc });
  }

  // A run is only useful if it can leave the bench. This writes everything needed to
  // reconstruct the experiment: the settings, every decision, and the full reply text.
  function runFile(fmt) {
    if (!lastRun) return { body: "", name: "" };
    let body, name, type;
    if (fmt === "json") {
      body = JSON.stringify({
        bench: "scribe-bench",
        candidate: lastRun.candidate,
        at: lastRun.at,
        options: lastRun.options,
        corpusFilter: lastRun.filter,
        positionsRun: lastRun.rows.length,
        summary: summaryOf(lastRun.rows),
        packMeta: pack.meta,
        rows: lastRun.rows,
      }, null, 1);
      name = `scribe-run-${lastRun.candidate}-${lastRun.at.slice(0, 19).replace(/[:T]/g, "")}.json`;
      type = "application/json";
    } else {
      const cols = ["case", "scope", "action", "i", "cls", "mode", "menuN", "trapped", "band",
        "picked", "oracle", "instruction", "raw", "err"];
      const esc = (v) => {
        const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      body = [cols.join(","), ...lastRun.rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
      name = `scribe-run-${lastRun.candidate}-${lastRun.at.slice(0, 19).replace(/[:T]/g, "")}.csv`;
      type = "text/csv";
    }
    return { body, name, type };
  }

  function download(fmt) {
    const { body, name, type } = runFile(fmt);
    if (!body) return;
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Downloads are not always available — a sandboxed frame may block them. So the run
  // can also be lifted out by hand: to the clipboard, or shown in a box to select.
  async function copyRun(fmt) {
    const { body } = runFile(fmt);
    if (!body) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(`copied ${(body.length / 1024).toFixed(0)}KB`);
      setTimeout(() => setCopied(null), 2500);
    } catch (e) {
      setShowText({ body, note: "clipboard refused — select all in the box below and copy" });
    }
  }

  // A model run of 600 positions is ~290KB, which is a lot to paste. This keeps the
  // fields that matter for diagnosis and drops the menus, which are the bulk.
  function compactRun() {
    if (!lastRun) return "";
    return JSON.stringify({
      bench: "scribe-bench", candidate: lastRun.candidate, at: lastRun.at,
      options: lastRun.options, corpusFilter: lastRun.filter,
      summary: summaryOf(lastRun.rows),
      rows: lastRun.rows.map((r) => ({
        case: r.case, i: r.i, cls: r.cls, mode: r.mode, menuN: r.menuN, trapped: r.trapped,
        band: r.band, picked: r.picked, oracle: r.oracle,
        acceptable: r.acceptable, instruction: r.instruction, raw: r.raw, err: r.err,
      })),
    }, null, 1);
  }

  // ---------- summaries ----------
  const summary = useMemo(() => summaryOf(rows), [rows]);
  const failByAction = useMemo(() => {
    const h = {};
    for (const r of rows) { const k = r.i; h[k] = h[k] || { n: 0, bad: 0 }; h[k].n++; if (!(r.band === "optimal" || r.band === "acceptable")) h[k].bad++; }
    return Object.entries(h).map(([k, v]) => ({ pos: +k, ...v })).sort((a, b) => a.pos - b.pos);
  }, [rows]);

  const Btn = ({ on, onClick, children, dim }) => (
    <button onClick={onClick} style={{
      background: on ? F.brass : F.panel2, color: on ? "#1A1610" : dim ? F.faint : F.ink,
      border: `1px solid ${on ? F.gold : "#3A3226"}`, borderRadius: 3, padding: "4px 9px",
      fontSize: 11, cursor: "pointer", ...mono, letterSpacing: ".03em",
    }}>{children}</button>
  );

  const bandColor = (b) => ({ optimal: F.good, acceptable: F.good, wrong: F.bad, trap: F.violet, illegal: F.warn, unanswered: F.faint, unlicensed: F.warn, "no-wrong-answer": F.faint }[b] || F.dim);

  return (
    <div style={{ background: F.ground, color: F.ink, minHeight: "100vh", padding: 18, ...serif, fontSize: 14 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        <div style={{ borderBottom: `1px solid ${F.brass}`, paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: ".24em", color: F.brass, textTransform: "uppercase" }}>Orders bench</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 27, fontWeight: 600, letterSpacing: "-.02em" }}>Can an order be carried out?</h1>
          <div style={{ ...mono, fontSize: 10.5, color: F.faint, marginTop: 8 }}>
            teacher-forced · every candidate sees identical boards · scored on where a pick LEADS, not which command it is
          </div>
        </div>

        {/* the corpus itself: made here, loaded, or saved */}
        <div style={{ background: F.panel, border: `1px solid ${pack.cases.length ? F.brass : "#5C4A2B"}`, borderRadius: 3, padding: 12, marginBottom: 14 }}>
          <div style={{ ...mono, fontSize: 9.5, letterSpacing: ".16em", color: F.brass, textTransform: "uppercase", marginBottom: 8 }}>
            The corpus
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...mono, fontSize: 11, color: F.dim }}>seed</span>
            <input type="number" value={seed} onChange={(e) => setSeed(+e.target.value || 0)}
              style={{ width: 90, background: "#15130E", color: F.gold, border: "1px solid #3A3226",
                       borderRadius: 3, padding: "5px 7px", fontSize: 16, ...mono }} />
            <button onClick={makeCorpus} disabled={making}
              style={{ background: making ? F.faint : F.brass, color: "#1A1610", border: `1px solid ${F.gold}`,
                       borderRadius: 3, padding: "6px 13px", ...mono, fontSize: 11.5, fontWeight: 600,
                       cursor: making ? "wait" : "pointer" }}>
              {making ? "walking the engine…" : "generate corpus"}
            </button>
            <label style={{ background: F.panel2, color: F.ink, border: "1px solid #3A3226", borderRadius: 3,
                            padding: "6px 13px", ...mono, fontSize: 11.5, cursor: "pointer" }}>
              load corpus
              <input type="file" accept=".json,application/json" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files && e.target.files[0]; if (!f) return;
                  const r = new FileReader(); r.onload = () => loadPack(String(r.result)); r.readAsText(f); e.target.value = ""; }} />
            </label>
            <button onClick={savePack} disabled={!pack.cases.length}
              style={{ background: F.panel2, color: pack.cases.length ? F.gold : F.faint,
                       border: `1px solid ${pack.cases.length ? F.brass : "#3A3226"}`, borderRadius: 3,
                       padding: "6px 13px", ...mono, fontSize: 11.5, cursor: pack.cases.length ? "pointer" : "default" }}>
              download corpus
            </button>
            <button onClick={() => setShowText({ body: JSON.stringify(pack), note: "select all and copy" })}
              disabled={!pack.cases.length}
              style={{ background: F.panel2, color: F.faint, border: "1px solid #3A3226", borderRadius: 3,
                       padding: "6px 13px", ...mono, fontSize: 11.5 }}>
              show as text
            </button>
          </div>
          <div style={{ ...mono, fontSize: 10.5, color: pack.cases.length ? F.dim : F.warn, marginTop: 8 }}>
            {pack.cases.length
              ? `${pack.meta.counts ? pack.meta.counts.cases : pack.cases.length} cases · ${pack.meta.scoredPositions} scored positions · ${pack.meta.trappedPositions} trapped · random baseline ${(100 * pack.meta.expectedRandomAccuracy).toFixed(1)}%`
              : "no corpus yet — generate one from a seed, or load one you made earlier"}
          </div>
        </div>

        {/* corpus selection */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14, marginBottom: 14 }}>
          <div style={{ background: F.panel, border: "1px solid #322B20", borderRadius: 3, padding: 12 }}>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: ".16em", color: F.brass, textTransform: "uppercase", marginBottom: 8 }}>Corpus</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {["short", "long", "contest"].map((k) => (
                <Btn key={k} on={filter[k]} onClick={() => setFilter({ ...filter, [k]: !filter[k] })}>{k}</Btn>
              ))}
            </div>
            <div style={{ ...mono, fontSize: 11, color: F.dim, marginBottom: 6 }}>
              positions to run: <span style={{ color: F.gold }}>{budget}</span> of {selected.length}
            </div>
            <input type="range" min="1" max={Math.max(1, selected.length)} value={Math.min(limit, Math.max(1, selected.length))}
              onChange={(e) => setLimit(+e.target.value)} style={{ width: "100%", accentColor: F.brass }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {[10, 25, 50, 100, 9999].map((n) => (
                <Btn key={n} on={limit === n} onClick={() => setLimit(n)}>{n === 9999 ? "all" : n}</Btn>
              ))}
            </div>
          </div>

          <div style={{ background: F.panel, border: "1px solid #322B20", borderRadius: 3, padding: 12 }}>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: ".16em", color: F.brass, textTransform: "uppercase", marginBottom: 8 }}>Ablations — what the scribe is shown</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {[["glosses", "glosses"], ["stand", "where it stands"], ["done", "done so far"], ["year", "the year"], ["stores", "stores"], ["marker", "step marker"]].map(([k, lbl]) => (
                <Btn key={k} on={opt[k]} onClick={() => setOpt({ ...opt, [k]: !opt[k] })}>{lbl}</Btn>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ ...mono, fontSize: 10, color: F.faint }}>register</span>
              {["template", "prose", "loose", "order"].map((r) => (
                <Btn key={r} on={opt.register === r} onClick={() => setOpt({ ...opt, register: r })}>{r}</Btn>
              ))}
              <span style={{ ...mono, fontSize: 10, color: F.faint, marginLeft: 8 }}>scope</span>
              {["activation", "action"].map((r) => (
                <Btn key={r} on={opt.scope === r} onClick={() => setOpt({ ...opt, scope: r })}>{r}</Btn>
              ))}
            </div>
          </div>
        </div>

        {/* candidates */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {Object.entries(CANDIDATES).map(([k, c]) => (
            <button key={k} onClick={() => run(k)} disabled={!!busy || !pack.cases.length}
              style={{
                background: busy === k ? c.color : F.panel2, color: busy === k ? "#14110C" : c.color,
                border: `1px solid ${c.color}`, borderRadius: 3, padding: "9px 14px", cursor: busy ? "wait" : "pointer",
                opacity: busy && busy !== k ? .4 : 1, ...mono, fontSize: 12, fontWeight: 500, letterSpacing: ".04em",
              }}
              title={c.hint}>
              {busy === k ? "running…" : c.label}
            </button>
          ))}
          {busy && <button onClick={() => { stop.current = true; }}
            style={{ background: "#5C2B2B", color: F.ink, border: "1px solid #8A4A4A", borderRadius: 3, padding: "9px 14px", ...mono, fontSize: 12 }}>stop</button>}
          <button onClick={() => { const { c, p } = selected[0] || {}; if (c) setPreview(buildPrompt(pack, c, p, opt)); }}
            style={{ background: F.panel2, color: F.dim, border: "1px solid #3A3226", borderRadius: 3, padding: "9px 14px", ...mono, fontSize: 12 }}>
            preview prompt
          </button>
        </div>

        {progress && (
          <div style={{ ...mono, fontSize: 11, color: F.dim, marginBottom: 10 }}>
            {progress.done} / {progress.total}
            <div style={{ height: 3, background: "#2A241B", marginTop: 4 }}>
              <div style={{ height: 3, width: `${100 * progress.done / progress.total}%`, background: F.brass }} />
            </div>
          </div>
        )}

        {/* results */}
        {summary && (
          <div style={{ background: F.panel, border: `1px solid ${F.brass}`, borderRadius: 3, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 26, flexWrap: "wrap", alignItems: "baseline", marginBottom: 12 }}>
              <div>
                <div style={{ ...mono, fontSize: 9.5, color: F.faint, letterSpacing: ".14em", textTransform: "uppercase" }}>accuracy</div>
                <div style={{ fontSize: 30, fontWeight: 600, color: F.gold }}>{summary.micro.toFixed(1)}%</div>
                <div style={{ ...mono, fontSize: 10, color: F.faint }}>
                  macro {summary.macro.toFixed(1)}% · scored {summary.scored}
                  {summary.unanswered ? ` · ${summary.unanswered} unanswered, excluded` : ""}
                </div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: 9.5, color: F.faint, letterSpacing: ".14em", textTransform: "uppercase" }}>on trapped positions</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: summary.trapN ? F.violet : F.faint }}>
                  {summary.trapN ? summary.trapPct.toFixed(0) + "%" : "—"}
                </div>
                <div style={{ ...mono, fontSize: 10, color: F.faint }}>{summary.trapN} positions</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ ...mono, fontSize: 9.5, color: F.faint, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 5 }}>bands</div>
                {Object.entries(summary.bands).map(([b, n]) => (
                  <span key={b} style={{ ...mono, fontSize: 11, color: bandColor(b), marginRight: 12 }}>{b} {n}</span>
                ))}
              </div>
            </div>

            {lastRun && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #2A241B", flexWrap: "wrap" }}>
                <span style={{ ...mono, fontSize: 9.5, color: F.faint, letterSpacing: ".14em", textTransform: "uppercase" }}>take the run with you</span>
                <button onClick={() => copyRun("json")} style={{ background: F.brass, color: "#1A1610", border: `1px solid ${F.gold}`, borderRadius: 3, padding: "5px 11px", ...mono, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  ⧉ copy full JSON
                </button>
                <button onClick={() => { const b = compactRun(); navigator.clipboard.writeText(b).then(() => { setCopied(`copied ${(b.length / 1024).toFixed(0)}KB (compact)`); setTimeout(() => setCopied(null), 2500); }).catch(() => setShowText({ body: b, note: "clipboard refused — select all below" })); }}
                  style={{ background: F.panel2, color: F.gold, border: `1px solid ${F.brass}`, borderRadius: 3, padding: "5px 11px", ...mono, fontSize: 11, cursor: "pointer" }}>
                  ⧉ copy compact — no menus
                </button>
                <button onClick={() => setShowText({ body: compactRun(), note: "select all and copy" })}
                  style={{ background: F.panel2, color: F.dim, border: "1px solid #3A3226", borderRadius: 3, padding: "5px 11px", ...mono, fontSize: 11, cursor: "pointer" }}>
                  show in a box
                </button>
                <button onClick={() => download("json")} style={{ background: F.panel2, color: F.faint, border: "1px solid #3A3226", borderRadius: 3, padding: "5px 11px", ...mono, fontSize: 11, cursor: "pointer" }}>
                  ⤓ download
                </button>
                {copied && <span style={{ ...mono, fontSize: 11, color: F.good }}>{copied}</span>}
                <span style={{ ...mono, fontSize: 10, color: F.faint }}>
                  {lastRun.candidate} · {lastRun.rows.length} positions · {lastRun.options.register}/{lastRun.options.scope}
                </span>
              </div>
            )}
            <div style={{ ...mono, fontSize: 9.5, color: F.faint, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>by step class</div>
            {summary.classRows.map((r) => (
              <div key={r.cls} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{ ...mono, fontSize: 11, width: 84, color: F.dim }}>{r.cls}</div>
                <div style={{ ...mono, fontSize: 10, width: 34, color: F.faint }}>n={r.n}</div>
                <div style={{ flex: 1, height: 11, background: "#241F17" }}>
                  <div style={{ height: 11, width: `${r.pct}%`, background: r.pct > 80 ? F.good : r.pct > 50 ? F.warn : F.bad }} />
                </div>
                <div style={{ ...mono, fontSize: 11, width: 46, textAlign: "right", color: F.ink }}>{r.pct.toFixed(0)}%</div>
              </div>
            ))}

            {failByAction.length > 1 && (
              <>
                <div style={{ ...mono, fontSize: 9.5, color: F.faint, letterSpacing: ".14em", textTransform: "uppercase", margin: "12px 0 6px" }}>failures by position in the activation</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 46 }}>
                  {failByAction.map((h) => (
                    <div key={h.pos} title={`position ${h.pos}: ${h.bad}/${h.n} wrong`} style={{ flex: 1, minWidth: 6 }}>
                      <div style={{ height: `${h.n ? 44 * h.bad / h.n : 0}px`, background: F.bad }} />
                      <div style={{ ...mono, fontSize: 8, color: F.faint, textAlign: "center" }}>{h.pos}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* per-row detail */}
        {rows.length > 0 && (
          <div style={{ background: F.panel, border: "1px solid #322B20", borderRadius: 3, maxHeight: 300, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 10.5 }}>
              <thead><tr style={{ background: "#17140F", position: "sticky", top: 0 }}>
                {["case", "pos", "class", "mode", "menu", "band", "reply"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: F.faint, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", fontSize: 9 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #241F17" }}>
                    <td style={{ padding: "4px 8px", color: F.dim }}>{r.case}</td>
                    <td style={{ padding: "4px 8px", color: F.faint }}>{r.i}</td>
                    <td style={{ padding: "4px 8px", color: F.dim }}>{r.cls}{r.trapped ? " ⚑" : ""}</td>
                    <td style={{ padding: "4px 8px", color: F.faint }}>{r.mode}</td>
                    <td style={{ padding: "4px 8px", color: F.faint }}>{r.menuN}</td>
                    <td style={{ padding: "4px 8px", color: bandColor(r.band) }}>{r.band}</td>
                    <td style={{ padding: "4px 8px", color: F.faint, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.err ? "⚠ " + r.err : r.raw ? r.raw.slice(0, 90) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showText && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(8,6,4,.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
            <div style={{ ...mono, fontSize: 11, color: F.gold, marginBottom: 8 }}>
              {showText.note} · {(showText.body.length / 1024).toFixed(0)}KB
              <button onClick={() => { const el = document.getElementById("runbox"); el.focus(); el.select(); }}
                style={{ marginLeft: 10, background: F.brass, color: "#1A1610", border: "none", borderRadius: 3, padding: "3px 9px", ...mono, fontSize: 10, cursor: "pointer" }}>select all</button>
              <button onClick={() => setShowText(null)}
                style={{ marginLeft: 6, background: F.panel2, color: F.ink, border: "1px solid #3A3226", borderRadius: 3, padding: "3px 9px", ...mono, fontSize: 10, cursor: "pointer" }}>close</button>
            </div>
            <textarea id="runbox" readOnly value={showText.body}
              onFocus={(e) => e.target.select()}
              style={{ width: "min(900px,94vw)", height: "72vh", background: "#15130E", color: F.ink, border: `1px solid ${F.brass}`, borderRadius: 3, padding: 12, ...mono, fontSize: 10.5, lineHeight: 1.45, resize: "none" }} />
          </div>
        )}
        {preview && (
          <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(8,6,4,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
            <pre onClick={(e) => e.stopPropagation()} style={{ background: "#15130E", border: `1px solid ${F.brass}`, borderRadius: 3, padding: 16, maxWidth: 820, maxHeight: "80vh", overflow: "auto", ...mono, fontSize: 11.5, lineHeight: 1.55, color: F.ink, whiteSpace: "pre-wrap", margin: 0 }}>{preview}</pre>
          </div>
        )}

        <div style={{ ...mono, fontSize: 9.5, color: F.faint, marginTop: 16, borderTop: "1px solid #2A241B", paddingTop: 10 }}>
          Run Oracle (must be 100%), Always-wrong (must be 0%) and Random (must land near the baseline) before trusting any model number.
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from "react"
import type { PointerEvent, WheelEvent } from "react"
import * as Ng from "@gk/engine"

const CONF = JSON.stringify({
  factions: [
    { id: "MYC", name: "Mycenae", color: "#B01E3C" },
    { id: "HAT", name: "Hatti", color: "#8C4A2F" },
    { id: "MIT", name: "Mitanni", color: "#6B4A8C" },
    { id: "BAB", name: "Babylon", color: "#177268" },
    // Colours are chosen to be told APART, not to hold ink — the cream on a chip
    // carries its own dark halo, so gold may stay gold and keep its distance from
    // Hatti's brown.
    { id: "EGY", name: "Egypt", color: "#C9A227" },
  ],
  // A province states who stands in it and how far: `treaty` names the rung, and
  // `influence` opens at that rung's floor — friend 2, ally 5, subject 10, and a
  // home held absolutely. A province naming neither is a stranger to every court.
  // Wild peoples take no treaty and never will.
  //
  // `works` is the slot list, in board order, and a province IS its slot list.
  // Each entry is the GROUND the slot sits on and what STANDS on it; `type: ""`
  // is open ground, which is a slot like any other and never an absent one.
  provinces: [
    // Greece & the Balkan hinterland
    {
      id: "ister", name: "Ister", pos_x: 70, pos_y: 110, wild: true,
      works: [{ type: "warriors" }, { type: "warriors" }],
    },
    {
      id: "iolkos", name: "Iolkos", pos_x: 70, pos_y: 200, fertility: 1,
      treaty: [{ id: "MYC", name: "subject" }], influence: [{ id: "MYC", value: 10 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "", ground: "clay" },
        { type: "farm" },
      ],
    },
    {
      id: "mycenae", name: "Mycenae", pos_x: 40, pos_y: 290, fertility: 1,
      treaty: [{ id: "MYC", name: "home" }], influence: [{ id: "MYC", value: 10 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "potteries", ground: "clay" },
        { type: "royal_palace" },
        { type: "farm" },
      ],
    },
    // Anatolia
    {
      id: "kaska", name: "Kaska", pos_x: 370, pos_y: 20, wild: true,
      works: [{ type: "warriors" }, { type: "warriors" }, { type: "warriors" }],
    },
    {
      id: "wilusa", name: "Wilusa", pos_x: 200, pos_y: 110, fertility: 1,
      works: [
        { type: "port", ground: "coast" },
        { type: "garrison" },
        { type: "" },
      ],
    },
    {
      id: "hattusa", name: "Hattusa", pos_x: 360, pos_y: 110, fertility: 1,
      treaty: [{ id: "HAT", name: "home" }], influence: [{ id: "HAT", value: 10 }],
      works: [
        { type: "royal_palace" },
        { type: "farm" },
        { type: "garrison" },
        { type: "" },
      ],
    },
    {
      id: "isuwa", name: "Isuwa", pos_x: 540, pos_y: 110, fertility: 1,
      treaty: [{ id: "HAT", name: "subject" }], influence: [{ id: "HAT", value: 10 }],
      works: [
        { type: "bronze_works", ground: "copper" },
        { type: "" },
        { type: "" },
      ],
    },
    {
      id: "arzawa", name: "Arzawa", pos_x: 200, pos_y: 200, fertility: 2,
      works: [
        { type: "garrison", ground: "coast" },
        { type: "farm" },
        { type: "" },
      ],
    },
    {
      id: "tarhuntassa", name: "Tarhuntassa", pos_x: 360, pos_y: 200, fertility: 1,
      treaty: [{ id: "HAT", name: "subject" }], influence: [{ id: "HAT", value: 10 }],
      works: [
        { type: "bronze_works", ground: "copper" },
        { type: "farm" },
        { type: "market" },
      ],
    },
    {
      id: "millawanda", name: "Millawanda", pos_x: 200, pos_y: 290, fertility: 1,
      treaty: [{ id: "MYC", name: "friend" }], influence: [{ id: "MYC", value: 2 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "", ground: "clay" },
        { type: "market" },
      ],
    },
    {
      id: "lukka", name: "Lukka", pos_x: 320, pos_y: 290, wild: true,
      works: [
        { type: "warriors", ground: "coast" },
        { type: "warriors" },
      ],
    },
    {
      id: "kizzuwatna", name: "Kizzuwatna", pos_x: 450, pos_y: 290, fertility: 2,
      treaty: [{ id: "HAT", name: "subject" }], influence: [{ id: "HAT", value: 10 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "farm" },
        { type: "" },
      ],
    },
    // Upper Mesopotamia
    {
      id: "washukanni", name: "Washukanni", pos_x: 700, pos_y: 110, fertility: 2,
      treaty: [{ id: "MIT", name: "home" }], influence: [{ id: "MIT", value: 10 }],
      works: [
        { type: "royal_palace" },
        { type: "farm" },
        { type: "garrison" },
        { type: "" },
      ],
    },
    {
      id: "carchemish", name: "Carchemish", pos_x: 600, pos_y: 200, fertility: 2,
      treaty: [{ id: "MIT", name: "subject" }], influence: [{ id: "MIT", value: 10 }],
      works: [
        { type: "farm" },
        { type: "market" },
        { type: "" },
      ],
    },
    {
      id: "ashur", name: "Ashur", pos_x: 740, pos_y: 200, fertility: 2,
      treaty: [{ id: "MIT", name: "friend" }], influence: [{ id: "MIT", value: 2 }],
      works: [
        { type: "garrison" },
        { type: "farm" },
        { type: "" },
      ],
    },
    {
      id: "halab", name: "Halab", pos_x: 600, pos_y: 290, fertility: 2,
      treaty: [{ id: "MIT", name: "subject" }], influence: [{ id: "MIT", value: 10 }],
      works: [
        { type: "dye_works", ground: "cloth" },
        { type: "farm" },
        { type: "market" },
      ],
    },
    {
      id: "mari", name: "Mari", pos_x: 750, pos_y: 290, fertility: 1,
      treaty: [{ id: "BAB", name: "friend" }], influence: [{ id: "BAB", value: 2 }],
      works: [
        { type: "market" },
        { type: "farm" },
        { type: "" },
      ],
    },
    // islands in the water
    {
      id: "knossos", name: "Knossos", pos_x: 80, pos_y: 400, fertility: 1,
      treaty: [{ id: "MYC", name: "subject" }], influence: [{ id: "MYC", value: 10 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "potteries", ground: "clay" },
        { type: "" },
      ],
    },
    {
      id: "alashiya", name: "Alashiya", pos_x: 290, pos_y: 380, fertility: 1,
      works: [
        { type: "bronze_works", ground: "copper" },
        { type: "port", ground: "coast" },
        { type: "bronze_works", ground: "copper" },
      ],
    },
    {
      id: "sherden", name: "Sherden", pos_x: 90, pos_y: 550, wild: true,
      works: [
        { type: "warriors", ground: "coast" },
        { type: "warriors", ground: "coast" },
      ],
    },
    // the Levant: coast road, inland road, desert
    {
      id: "ugarit", name: "Ugarit", pos_x: 450, pos_y: 380, fertility: 1,
      treaty: [{ id: "HAT", name: "friend" }], influence: [{ id: "HAT", value: 2 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "dye_works", ground: "cloth" },
        { type: "farm" },
      ],
    },
    {
      id: "amurru", name: "Amurru", pos_x: 610, pos_y: 380, fertility: 2,
      works: [{ type: "garrison" }, { type: "" }, { type: "" }],
    },
    {
      id: "sutu", name: "Sutu", pos_x: 750, pos_y: 380, wild: true,
      works: [{ type: "warriors" }, { type: "warriors" }],
    },
    {
      id: "byblos", name: "Byblos", pos_x: 450, pos_y: 470, fertility: 1,
      treaty: [{ id: "EGY", name: "friend" }], influence: [{ id: "EGY", value: 2 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "dye_works", ground: "cloth" },
        { type: "farm" },
      ],
    },
    {
      id: "qadesh", name: "Qadesh", pos_x: 610, pos_y: 470, fertility: 2,
      works: [{ type: "garrison" }, { type: "farm" }, { type: "" }],
    },
    {
      id: "babylon", name: "Babylon", pos_x: 740, pos_y: 470, fertility: 3,
      treaty: [{ id: "BAB", name: "home" }], influence: [{ id: "BAB", value: 10 }],
      works: [
        { type: "royal_palace" },
        { type: "farm" },
        { type: "market" },
        { type: "" },
      ],
    },
    {
      id: "canaan", name: "Canaan", pos_x: 440, pos_y: 590, fertility: 2,
      works: [
        { type: "garrison", ground: "coast" },
        { type: "farm" },
        { type: "", ground: "cloth" },
        { type: "" },
      ],
    },
    {
      id: "apiru", name: "Apiru", pos_x: 610, pos_y: 560, wild: true,
      works: [{ type: "warriors" }, { type: "warriors" }],
    },
    {
      id: "nippur", name: "Nippur", pos_x: 740, pos_y: 560, fertility: 3,
      treaty: [{ id: "BAB", name: "subject" }], influence: [{ id: "BAB", value: 10 }],
      works: [
        { type: "farm" },
        { type: "granary" },
        { type: "" },
        { type: "potteries", ground: "clay" },
      ],
    },
    {
      id: "der", name: "Der", pos_x: 900, pos_y: 560, fertility: 1,
      treaty: [{ id: "BAB", name: "subject" }], influence: [{ id: "BAB", value: 10 }],
      works: [{ type: "farm" }, { type: "" }],
    },
    {
      id: "sinai", name: "Sinai", pos_x: 475, pos_y: 680,
      works: [{ type: "", ground: "copper" }, { type: "" }],
    },
    {
      id: "shasu", name: "Shasu", pos_x: 610, pos_y: 650, wild: true,
      works: [{ type: "warriors" }, { type: "warriors" }],
    },
    // Egypt
    {
      id: "libu", name: "Libu", pos_x: 90, pos_y: 700, wild: true,
      works: [{ type: "warriors" }, { type: "warriors" }],
    },
    {
      id: "lower_egypt", name: "Lower Egypt", pos_x: 260, pos_y: 700, fertility: 3,
      treaty: [{ id: "EGY", name: "home" }], influence: [{ id: "EGY", value: 10 }],
      works: [
        { type: "port", ground: "coast" },
        { type: "", ground: "coast" },
        { type: "royal_palace" },
        { type: "farm" },
        { type: "" },
      ],
    },
    {
      id: "middle_egypt", name: "Middle Egypt", pos_x: 230, pos_y: 800, fertility: 3,
      treaty: [{ id: "EGY", name: "subject" }], influence: [{ id: "EGY", value: 10 }],
      works: [{ type: "farm" }, { type: "granary" }, { type: "" }],
    },
    {
      id: "upper_egypt", name: "Upper Egypt", pos_x: 360, pos_y: 800, fertility: 2,
      treaty: [{ id: "EGY", name: "subject" }], influence: [{ id: "EGY", value: 10 }],
      works: [{ type: "farm" }, { type: "market" }, { type: "" }],
    },
  ],
  connections: [
    // Greece
    ["ister", "iolkos"],
    ["iolkos", "mycenae"],
    // Anatolia
    ["kaska", "hattusa"],
    ["kaska", "isuwa"],
    ["hattusa", "isuwa"],
    ["hattusa", "tarhuntassa"],
    ["wilusa", "arzawa"],
    ["arzawa", "millawanda"],
    ["arzawa", "tarhuntassa"],
    ["millawanda", "lukka"],
    ["lukka", "tarhuntassa"],
    ["tarhuntassa", "kizzuwatna"],
    // Upper Mesopotamia & the desert caravan
    ["isuwa", "washukanni"],
    ["washukanni", "carchemish"],
    ["washukanni", "ashur"],
    ["carchemish", "halab"],
    ["ashur", "mari"],
    ["mari", "sutu"],
    ["sutu", "qadesh"],
    // the Levant: coast road, inland road
    ["kizzuwatna", "ugarit"],
    ["kizzuwatna", "halab"],
    ["halab", "amurru"],
    ["ugarit", "amurru"],
    ["ugarit", "byblos"],
    ["amurru", "qadesh"],
    ["qadesh", "apiru"],
    ["apiru", "byblos"],
    ["apiru", "shasu"],
    ["apiru", "nippur"],
    ["byblos", "canaan"],
    ["canaan", "sinai"],
    ["shasu", "sinai"],
    // Mesopotamia
    ["qadesh", "babylon"],
    ["babylon", "nippur"],
    ["babylon", "der"],
    // Egypt
    ["canaan", "lower_egypt"],
    ["sinai", "lower_egypt"],
    ["lower_egypt", "middle_egypt"],
    ["middle_egypt", "upper_egypt"],
    ["libu", "lower_egypt"],
  ],
})

export function App() {
  const engine = useRef<Ng.StateHandle | null>(null)

  if (engine.current == null) engine.current = Ng.initialize(CONF)
  const [view, setView] = useState(() => Ng.view(engine.current!))

  return (
    <main>
      <GameMap view={view} />
      <div className="panel">
        {view.cards.map(card =>
          <div className="card" style={{ border: `1px solid ${card.color}` }}>
            <b style={{ fontSize: 18, color: card.color }}>{card.name}</b>
            <p>Some test text</p>
          </div>
        )}
      </div>
    </main>)
}


// What the ground under a slot looks like. The engine says which ground it is;
// what colour that reads as lives here, with the rest of the board's palette.
const GROUND_FILL: Record<Ng.MapSlot["ground"]["kind"], string> = {
  plain: "#EFE7CE",
  coast: "#C7D5E2",
  resource: "#D9C08F",
}

// Fertility by its own value: barren ground reads brown, and richer ground turns
// green by deepening rather than by brightening — the strongest land is the
// darkest mark on the board, not the most washed out.
const FERTILITY_FILL = ["#8A7350", "#A89A3C", "#5E8C3A", "#2E6B2A"]

// The water, for a province that reaches it.
const SEAFARING_FILL = "#3E5F82"


// The board and its camera. The camera is this component's own chrome: panning
// and zooming re-render the map alone, and the engine never hears of it.
function GameMap({ view }: { view: Ng.View }) {
  const [cam, setCam] = useState({ x: 650, y: 80, k: 1 })
  // A drag in progress: where the pointer went down, and where the camera was
  // at that moment. Between-events bookkeeping — a ref, not render state.
  const drag = useRef<{ sx: number, sy: number, camX: number, camY: number } | null>(null)

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { sx: e.clientX, sy: e.clientY, camX: cam.x, camY: cam.y }
    // Pin the rest of this drag to the svg, even when the cursor leaves it.
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (d == null) return
    setCam(c => ({ ...c, x: d.camX + (e.clientX - d.sx), y: d.camY + (e.clientY - d.sy) }))
  }

  const onPointerUp = () => { drag.current = null }

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    setCam(c => {
      // Multiplicative zoom, clamped; the world point under the cursor stays
      // under the cursor: x' = m - (m - x)·s.
      const k = Math.min(4, Math.max(0.3, c.k * Math.exp(-e.deltaY * 0.001)))
      const s = k / c.k
      return { x: mx - (mx - c.x) * s, y: my - (my - c.y) * s, k }
    })
  }

  // Geometry of a province box, in box-local units. The slots sit in one row
  // under the name, so a box is as wide as its slots need and never narrower
  // than the influence line wants.
  const PADX = 8
  const SLOT = 26
  const GAP = 5
  // The name band. It is taller than the name needs because the gap under the
  // name is what separates the head from the slots — no rule is drawn there, so
  // the space has to do that work on its own.
  const HEAD = 23

  const HEIGHT = HEAD + SLOT + 23

  // The marks ride the name band, not the foot: the bottom line belongs to the
  // influence tally, which grows with the number of courts standing here. They
  // fill from the right corner inwards, so the rightmost mark is always the one
  // every province carries.
  const MARK = 11
  const MARK_GAP = 3
  const MARK_RIGHT = 4
  const markX = (width: number, from_corner: number) =>
    width - MARK_RIGHT - MARK - from_corner * (MARK + MARK_GAP)

  // Name and marks share ONE centre line, and both take it from the band rather
  // than each holding its own tuned number — that is what kept them level when
  // the band was 19 tall and what keeps them level at 23. A text baseline sits
  // half a cap height below the line it should look centred on.
  const NAME_HALF_CAP = 4
  const MARK_Y = (HEAD - MARK) / 2
  const PADY = HEAD / 2 + NAME_HALF_CAP

  // A standing's mark, on the foot of the box. Wide enough for two digits, since
  // a subject stands at 10.
  const INF = 13
  const INF_W = 16
  const INF_GAP = 3
  const INF_Y = HEIGHT - 5 - INF

  const boxWidth = (slots: number) =>
    Math.max(PADX * 2 + slots * SLOT + (slots - 1) * GAP, 100)

  let boxes = view.map.boxes.map(box => {
    var fill = "#D8CCA8"
    var stroke = "#A69770"
    // A wild people is drawn as ground no court has shaped: blunt corners, a
    // broken outline, and its warbands standing in circles rather than slots.
    const wild = box.color.kind == "wild"
    var dash: string | undefined = undefined
    var corner = 9

    if (wild) {
      fill = "#BCA678"
      stroke = "#6E5C3A"
      dash = "2 3"
      corner = 2
    } else if (box.color.kind == "override") {
      stroke = box.color.value
      fill = box.color.value + "22"
    }

    let width = boxWidth(box.slots.length)

    // The standings laid out along the foot. A mark is as wide as its number
    // needs, so the row is measured rather than strided — a subject at 10 is
    // wider than a friend at 2 and must not be cramped into the same square.
    let influence = []
    var at = PADX
    for (let inf of box.influence) {
      let w = inf.value < 10 ? INF : INF_W
      influence.push({ ...inf, x: at, w })
      at += w + INF_GAP
    }

    return {
      id: box.id,
      name: box.name,
      x: box.pos_x - width / 2,
      y: box.pos_y - HEIGHT / 2,
      width,
      wild,
      seafaring: box.seafaring,
      fertility: box.fertility,
      fill,
      stroke,
      dash,
      corner,
      slots: box.slots,
      influence,
    }
  })

  return (
    <svg width="100%" height="100%" style={{ touchAction: "none" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onWheel={onWheel}>
      <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
        {view.map.connections.map(conn =>
          <line x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2} stroke="#A69770" strokeWidth={2} />
        )}

        {boxes.map(box =>
          <g key={box.name} transform={`translate(${box.x} ${box.y})`}>
            {/* A box is opaque: the roads beneath it must not read through it.
                The tint above carries a power's colour at the weight its alpha
                names, and the parchment underlay is what it composites against
                — so the box paints as though laid on the board, but stops it. */}
            <rect width={box.width} height={HEIGHT} rx={box.corner} style={{ fill: "var(--board-bg)" }} />
            <rect width={box.width} height={HEIGHT} rx={box.corner}
              fill={box.fill} stroke={box.stroke} strokeWidth={1.4} strokeDasharray={box.dash} />
            {/* No mark on the name: the blunt corners, the broken outline and the
                circles standing where slots would be already say wild. */}
            <text className={box.wild ? "map-box-name is-wild" : "map-box-name"}
              x={PADX} y={PADY}>{box.name}</text>

            {/* Fertility holds the corner, because every province has one. It
                says its number as well as its shade: the colour is read at a
                glance across the board, the digit when you look at one place. */}
            <rect x={markX(box.width, 0)} y={MARK_Y} width={MARK} height={MARK} rx={2}
              fill={FERTILITY_FILL[box.fertility]} stroke="#5A4A2E" strokeWidth={0.8}
              style={{ pointerEvents: "none" }} />
            <text className="map-box-mark"
              x={markX(box.width, 0) + MARK / 2} y={MARK_Y + MARK - 3}>{box.fertility}</text>

            {/* The water, one place further in, and only for those that reach it. */}
            {box.seafaring &&
              <rect x={markX(box.width, 1)} y={MARK_Y} width={MARK} height={MARK} rx={2}
                fill={SEAFARING_FILL} stroke="#22384D" strokeWidth={0.8}
                style={{ pointerEvents: "none" }} />}

            {/* One slot: the ground, and whatever stands on it. A slot with no
                work is not a missing slot — it is open ground, and it draws as
                such, so a province whose works are unauthored still reads. */}
            {box.slots.map((slot, i) => {
              const sx = PADX + i * (SLOT + GAP)
              const cx = sx + SLOT / 2
              const cy = HEAD + SLOT / 2
              const standing = slot.label != ""
              return (
                <g key={slot.id || i}>
                  {/* A wild people has no slots to build in: its warbands stand
                      on open ground, and the circle says the square is not on
                      offer. */}
                  {box.wild
                    ? <circle cx={cx} cy={cy} r={SLOT / 2 - 1}
                      fill="#D6C39A"
                      stroke={slot.highlight ? "#7A3B0E" : "#6E5C3A"}
                      strokeWidth={slot.highlight ? 2.5 : 1}
                      strokeDasharray={slot.highlight ? undefined : "2 3"} />
                    : <rect x={sx} y={HEAD} width={SLOT} height={SLOT} rx={5}
                      fill={GROUND_FILL[slot.ground.kind]}
                      stroke={slot.highlight ? "#7A3B0E" : "#A69770"}
                      strokeWidth={slot.highlight ? 2.5 : 1} />}

                  {!standing && slot.ground.label != "" &&
                    <text className="map-slot-ground" x={cx} y={cy + 3}>{slot.ground.label}</text>}

                  {/* Tilted and faded once it has acted: a work's year is spent. */}
                  {standing &&
                    <g transform={slot.active ? undefined : `rotate(12 ${cx} ${cy})`}
                      opacity={slot.active ? 1 : 0.5}>
                      <title>{slot.name}</title>
                      <rect x={sx + 3} y={HEAD + 3} width={SLOT - 6} height={SLOT - 6} rx={4}
                        fill="#F5EDD8" stroke="#8A6A2F" strokeWidth={2.2} />
                      <text className="map-slot-glyph" x={cx} y={cy + 3.5}>{slot.label}</text>
                    </g>}
                </g>
              )
            })}

            {/* Who stands here, and how far: one chip per power, the colour
                saying whose and the number how far. The power's name is not
                written — it is on the chip's hover title, which is where a
                colour you cannot place should send you.

                A chip widens at two digits rather than shrinking its number, so
                a subject standing at 10 is never cramped into a friend's square. */}
            {box.influence.map(inf =>
              <g key={inf.id}>
                <title>{inf.name}</title>
                <rect x={inf.x} y={INF_Y} width={inf.w} height={INF} rx={2.5}
                  fill={inf.color} stroke="#2A241B" strokeWidth={1.2} />
                <text className="map-box-mark"
                  x={inf.x + inf.w / 2} y={INF_Y + INF / 2 + 3}>{inf.value}</text>
              </g>
            )}
          </g>
        )}
      </g>
    </svg>
  )
}

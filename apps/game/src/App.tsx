import { useRef, useState } from "react"
import type { PointerEvent, WheelEvent } from "react"
import * as Ng from "@gk/engine"

const CONF = JSON.stringify({
  factions: [
    { id: "MYC", name: "Mycenae", color: "#B01E3C" },
    { id: "HAT", name: "Hatti", color: "#8C4A2F" },
    { id: "MIT", name: "Mitanni", color: "#6B4A8C" },
    { id: "BAB", name: "Babylon", color: "#177268" },
    { id: "EGY", name: "Egypt", color: "#C9A227" },
  ],
  provinces: [
    { id: "ister", name: "Ister", pos_x: 70, pos_y: 110 },
    { id: "iolkos", name: "Iolkos", pos_x: 70, pos_y: 200 },
    { id: "mycenae", name: "Mycenae", pos_x: 40, pos_y: 290 },
    { id: "kaska", name: "Kaska", pos_x: 370, pos_y: 20 },
    { id: "wilusa", name: "Wilusa", pos_x: 200, pos_y: 110 },
    { id: "hattusa", name: "Hattusa", pos_x: 360, pos_y: 110 },
    { id: "isuwa", name: "Isuwa", pos_x: 540, pos_y: 110 },
    { id: "arzawa", name: "Arzawa", pos_x: 200, pos_y: 200 },
    { id: "tarhuntassa", name: "Tarhuntassa", pos_x: 360, pos_y: 200 },
    { id: "millawanda", name: "Millawanda", pos_x: 200, pos_y: 290 },
    { id: "lukka", name: "Lukka", pos_x: 320, pos_y: 290 },
    { id: "kizzuwatna", name: "Kizzuwatna", pos_x: 450, pos_y: 290 },
    { id: "washukanni", name: "Washukanni", pos_x: 700, pos_y: 110 },
    { id: "carchemish", name: "Carchemish", pos_x: 600, pos_y: 200 },
    { id: "ashur", name: "Ashur", pos_x: 740, pos_y: 200 },
    { id: "halab", name: "Halab", pos_x: 600, pos_y: 290 },
    { id: "mari", name: "Mari", pos_x: 750, pos_y: 290 },
    { id: "knossos", name: "Knossos", pos_x: 80, pos_y: 400 },
    { id: "alashiya", name: "Alashiya", pos_x: 290, pos_y: 380 },
    { id: "sherden", name: "Sherden", pos_x: 90, pos_y: 550 },
    { id: "ugarit", name: "Ugarit", pos_x: 450, pos_y: 380 },
    { id: "amurru", name: "Amurru", pos_x: 610, pos_y: 380 },
    { id: "sutu", name: "Sutu", pos_x: 750, pos_y: 380 },
    { id: "byblos", name: "Byblos", pos_x: 450, pos_y: 470 },
    { id: "qadesh", name: "Qadesh", pos_x: 610, pos_y: 470 },
    { id: "babylon", name: "Babylon", pos_x: 740, pos_y: 470 },
    { id: "canaan", name: "Canaan", pos_x: 440, pos_y: 590 },
    { id: "apiru", name: "Apiru", pos_x: 610, pos_y: 560 },
    { id: "nippur", name: "Nippur", pos_x: 740, pos_y: 560 },
    { id: "der", name: "Der", pos_x: 900, pos_y: 560 },
    { id: "sinai", name: "Sinai", pos_x: 475, pos_y: 680 },
    { id: "shasu", name: "Shasu", pos_x: 610, pos_y: 650 },
    { id: "libu", name: "Libu", pos_x: 90, pos_y: 700 },
    { id: "lower_egypt", name: "Lower Egypt", pos_x: 260, pos_y: 700 },
    { id: "middle_egypt", name: "Middle Egypt", pos_x: 230, pos_y: 800 },
    { id: "upper_egypt", name: "Upper Egypt", pos_x: 360, pos_y: 800 },
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


// The board and its camera. The camera is this component's own chrome: panning
// and zooming re-render the map alone, and the engine never hears of it.
function GameMap({ view }: { view: Ng.View }) {
  const [cam, setCam] = useState({ x: 0, y: 0, k: 1 })
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

  // Geometry of a province box, in box-local units.
  const PADX = 8
  const PADY = 12

  const WIDTH = 100
  const HEIGHT = 60

  return (
    <svg width="100%" height="100%" style={{ touchAction: "none" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onWheel={onWheel}>
      <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
        {view.map.connections.map(conn =>
          <line x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2} stroke="#A69770" strokeWidth={2} />
        )}

        {view.map.boxes.map(box =>
          <g key={box.name} transform={`translate(${box.pos_x - WIDTH / 2} ${box.pos_y - HEIGHT / 2})`}>
            <rect width={WIDTH} height={HEIGHT} rx={9}
              fill="#D8CCA8" stroke="#A69770" strokeWidth={1.4} />
            <text className="map-box-name" x={PADX} y={PADY}>{box.name}</text>
          </g>
        )}
      </g>
    </svg>
  )
}

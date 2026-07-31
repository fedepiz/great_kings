import { useState } from "react"
import { initState, view, dispatch } from "@gk/engine"
import type { Command } from "@gk/engine"

// The table holds the state so it can hand it back to `dispatch`, and reads no
// field off it. Every fact drawn here comes from `view`.
export function App() {
  const [g, setG] = useState(initState)
  const v = view(g)

  const play = (cmd: Command | null) => {
    if (cmd) setG(dispatch(g, cmd))
  }

  return (
    <main>
      <h1>The Great Kings</h1>
      <p>Turn {v.turn}</p>
      {v.options.map((o, i) => (
        <button key={i} disabled={!o.cmd} onClick={() => play(o.cmd)}>
          {o.label}
        </button>
      ))}
    </main>
  )
}

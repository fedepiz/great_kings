// Everything the engine offers the outside world is named here, and
// nothing is exported without a caller. `package.json` maps "@gk/engine" to this
// file alone, so a consumer cannot reach past it.

export interface State {
  readonly chain: number
  readonly turn: number
}

export type Command = { readonly v: "pass" }

export interface View {
  readonly turn: number
  readonly options: readonly Option[]
}

/** `cmd` is null when the option is shown but not allowed. The table asks no
 *  further question: a null command IS the refusal. */
export interface Option {
  readonly label: string
  readonly cmd: Command | null
}

export function initState(): State {
  return { chain: 0, turn: 1 }
}

export function view(g: State): View {
  return {
    turn: g.turn,
    options: [{ label: "Pass", cmd: { v: "pass" } }],
  }
}

export function dispatch(g: State, cmd: Command): State {
  if (cmd.v !== "pass") return g
  return { chain: g.chain + 1, turn: g.turn + 1 }
}

// Everything the engine offers the outside world is named here, and
// nothing is exported without a caller. `package.json` maps "@gk/engine" to this
// file alone, so a consumer cannot reach past it.

export type StateHandle = unknown

type WorldConf = {
  factions: FactionConf[],
  provinces: ProvinceConf[],
  connections: [string, string][],
}

type FactionConf = {
  // Three-letters, all caps
  id: string,
  name: string,
  color: string,
}

type ProvinceConf = {
  // The province id in lower snake case
  id: string,
  name: string,
  pos_x: number,
  pos_y: number,
}

type Error = {
  message: string,
  timestamp: number,
}

type State = {
  timestamp: number,
  entities: Entity[]
  facts: Fact[]
  relations: Relation[],
  errors: Error[]
}

const NIL = "nil"

type EntityKind = typeof NIL | "faction" | "province"

type Entity = {
  id: string,
  kind: EntityKind,
  // General information
  name: string
  color: string
  // Relevant only for provinces
  pos_x: number,
  pos_y: number,
}

type FactKind = typeof NIL

type Fact = {
  subject: string,
  kind: FactKind,
  value: number
}

type RelationKind = typeof NIL | "adjacency"

type Relation = {
  kind: RelationKind,
  subject: string,
  target: string,
  value: number,
}

function relationOrder(a: Relation, b: Relation): number {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1
  if (a.target !== b.target) return a.target < b.target ? -1 : 1
  return 0
}

function stringOrder(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

export type CommandKind = typeof NIL

export type Command = {
  kind: CommandKind
}

export type View = {
  cards: CardView[],
  map: MapView,
  errors: string[],
}

export type CardView = {
  name: string
  color: string
}

export type MapView = {
  boxes: MapBox[],
  connections: MapEdge[],
}


export type MapBoxColor = {
  kind: "default" | "wild" | "override"
  value: string
}

export type MapBox = {
  name: string,
  pos_x: number,
  pos_y: number,
  color: MapBoxColor,
}

export type MapEdge = {
  x1: number,
  y1: number,
  x2: number,
  y2: number,
}

function duplicatesInSortedArray(array: string[]): Set<string> {
  let out = new Set<string>()
  for (var i = 1; i < array.length; ++i) {
    if (array[i - 1] == array[i]) {
      out.add(array[i])
    }
  }
  return out
}

function refineRelationList(list: Relation[]): { list: Relation[], errors: string[] } {
  let out_list = []
  let errors = []
  list.sort(relationOrder)

  for (var i = 0; i < list.length; ++i) {
    let item = list[i]
    if (i > 0) {
      let prev = list[i - 1]
      if (relationOrder(item, prev) == 0) {
        errors.push(`Duplicate entry in relation ${item.kind} between ${item.subject} -> ${item.target}`)
        continue;
      }
    }
    out_list.push(item)
  }

  return { list: out_list, errors }
}

function pushError(state: State, message: string) {
  state.errors.push({ timestamp: state.timestamp, message })
}

export function initialize(conf: string): StateHandle {
  let world: WorldConf = JSON.parse(conf)!

  let state: State = {
    timestamp: 0,
    entities: [],
    facts: [],
    relations: [],
    errors: [],
  }

  for (let faction of world.factions) {
    state.entities.push({
      id: faction.id,
      kind: "faction",
      name: faction.name,
      color: faction.color,
      pos_x: 0,
      pos_y: 0
    })
  }

  for (let province of world.provinces) {
    state.entities.push({
      id: province.id,
      kind: "province",
      name: province.name,
      color: "",
      pos_x: province.pos_x,
      pos_y: province.pos_y,
    })
  }

  // Sort the entities
  state.entities.sort((a, b) => stringOrder(a.id, b.id))

  {
    // Prepare the relations
    let raw_list: Relation[] = []
    for (let pair of world.connections) {
      var ok = true
      let [a, b] = pair[0] < pair[1] ? [pair[0], pair[1]] : [pair[1], pair[0]]

      // Make sure the ids are valid
      for (let item of [a, b]) {
        var found = false
        for (let entity of state.entities) {
          if (item == entity.id) { found = true; break }
        }
        if (!found) {
          pushError(state, `Invalid entity id ${item}`)
        }
        ok &&= found
      }

      // Make sure we have no self-relations
      if (a == b) {
        pushError(state, `Invalid self-adjacency for '${a}'`)
        ok = false
      }

      // Accululate entries
      if (ok) {
        raw_list.push({
          kind: "adjacency",
          subject: a,
          target: b,
          value: 1
        })
      }
    }

    let { list, errors } = refineRelationList(raw_list)

    for (let error of errors) {
      pushError(state, error)
    }

    state.relations = list
  }

  {
    // Validate everything is ok...
    let ids: string[] = []
    for (let entity of state.entities) {
      ids.push(entity.id)
    }

    ids.sort()
    for (let dup of duplicatesInSortedArray(ids)) {
      pushError(state, `Duplicate id '${dup}'`)
    }
  }

  return state
}

export function dispatch(state: StateHandle, command: Command) {

}

export function view(handle: StateHandle): View {
  let state = (handle as State)!

  let view: View = {
    cards: [],
    map: {
      boxes: [],
      connections: [],
    },
    errors: [],
  }

  for (let entity of state.entities) {
    if (entity.kind == "faction") {
      view.cards.push({
        name: entity.name,
        color: entity.color,
      })
    } else if (entity.kind == "province") {
      view.map.boxes.push({
        name: entity.name,
        pos_x: entity.pos_x,
        pos_y: entity.pos_y,
        color: {
          kind: "default",
          value: ""
        }
      })
    }
  }

  // Resolve adjacency endpoints to positions with one sort-merge join. A
  // halfedge names an entity and which end of its edge it anchors; both ends
  // of every edge ride the same sorted list through one merge. The gate
  // guarantees every halfedge id resolves — a miss here is corruption, not
  // input, and the cursor finishing short of the end would be the symptom.
  let halfedges: { out_idx: number, id: string, end: 0 | 1 }[] = []

  for (let relation of state.relations) {
    if (relation.kind == "adjacency") {
      let out_idx = view.map.connections.length
      halfedges.push({ out_idx, id: relation.subject, end: 0 })
      halfedges.push({ out_idx, id: relation.target, end: 1 })
      view.map.connections.push({ x1: 0, y1: 0, x2: 0, y2: 0 })
    }
  }

  halfedges.sort((a, b) => stringOrder(a.id, b.id))

  var halfedge_cursor = 0
  for (let entity of state.entities) {
    while (halfedge_cursor < halfedges.length) {
      let half = halfedges[halfedge_cursor]
      if (half.id > entity.id) {
        break
      }
      if (half.id == entity.id) {
        let out = view.map.connections[half.out_idx]
        if (half.end == 0) {
          out.x1 = entity.pos_x
          out.y1 = entity.pos_y
        } else {
          out.x2 = entity.pos_x
          out.y2 = entity.pos_y
        }
      }
      halfedge_cursor += 1
    }
  }

  for (let error of state.errors) {
    view.errors.push(error.message)
  }

  return view
}

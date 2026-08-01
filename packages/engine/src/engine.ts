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
  influence?: { id: string, value: number }[]
  treaty?: { id: string, name: string }[]
  // A wild people: no court holds it, and it never takes a treaty. Seafaring is
  // not authored — it is derived from the slots and stored at the gate.
  wild?: boolean
  // How much the ground gives, 0 to 3. Absent is barren.
  fertility?: number
  // Board order, and one entry per slot. A slot with no work is `type: ""` — it
  // is open ground, not an absent slot, so the list is never sparse.
  works?: { type: string, ground?: string }[]
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

type Entity = {
  id: string,
  kind: "faction" | "province" | "work",
  // General information
  name: string
  color: string
  // Relevant only for provinces
  pos_x: number,
  pos_y: number,
}


type FactKind = "work_type" | "ground" | "tapped" | "wild" | "seafaring" | "fertility"

// What the ground can give. Barren is the zero, so a province that says nothing
// about itself gives nothing.
const FERTILITY_MIN = 0
const FERTILITY_MAX = 3

type Fact = {
  subject: string,
  kind: FactKind,
  value: number
}

// Zero is untapped, so a work that says nothing about itself is ready.
const TAPPED_NO = 0
const TAPPED_YES = 1

// Which end of a connection a halfedge anchors. An adjacency is stored with its
// endpoints already ordered, so START is the lesser id and END the greater.
const EDGE_START = 0
const EDGE_END = 1

const TREATY_NONE = 0
const TREATY_FRIEND = 1
const TREATY_ALLY = 2
const TREATY_SUBJECT = 3
const TREATY_HOME = 4

type Relation = {
  kind: "influence" | "treaty" | "adjacency" | "location_of"
  subject: string,
  target: string,
  value: number,
}

type WorkType = {
  id: string,
  name: string,
  sigil: string,
}
// Index 0 is the empty work and must stay first: it is what a slot holds when
// nothing stands on it, and every zeroed slot resolves here. The sigil is two
// characters chosen to fit the square the board draws, not a fact about the work.
const WORK_TYPES: WorkType[] = [
  { id: "", name: "", sigil: "" },
  { id: "royal_palace", name: "Royal palace", sigil: "RP" },
  { id: "farm", name: "Farm", sigil: "FA" },
  { id: "market", name: "Market", sigil: "MK" },
  { id: "port", name: "Port", sigil: "PO" },
  { id: "garrison", name: "Garrison", sigil: "GA" },
  { id: "granary", name: "Granary", sigil: "GR" },
  { id: "bronze_works", name: "Bronze works", sigil: "WB" },
  { id: "dye_works", name: "Dye works", sigil: "WC" },
  { id: "potteries", name: "Potteries", sigil: "WP" },
  { id: "chancery", name: "Chancery", sigil: "CH" },
  { id: "stables", name: "Stables", sigil: "ST" },
  { id: "steward", name: "Steward", sigil: "SW" },
  { id: "fortress", name: "Fortress", sigil: "FT" },
  { id: "warriors", name: "Warriors", sigil: "WR" },
]

type GroundType = {
  id: string,
  kind: "plain" | "coast" | "resource",
  // The mark an empty slot shows, sized to the square the board draws.
  label: string,
}

// What a slot sits on. Index 0 is plain ground and must stay first: it is the
// answer for a slot that says nothing, which is most of them.
const GROUND_TYPES: GroundType[] = [
  { id: "", kind: "plain", label: "" },
  { id: "coast", kind: "coast", label: "sea" },
  { id: "copper", kind: "resource", label: "Cu" },
  { id: "cloth", kind: "resource", label: "Dy" },
  { id: "clay", kind: "resource", label: "Ky" },
]

// The INDEX into WORK_TYPES, which is what a fact carries; the string id is the
// author's name for it and never leaves the gate. Index 0 is the empty work, so
// an unknown name and "no work" answer alike, and the caller that must tell them
// apart asks before calling.
function workTypeIndex(id: string): number {
  var idx = 0
  for (let entry of WORK_TYPES) {
    if (entry.id == id) { return idx }
    idx++
  }
  return 0
}

// The INDEX into GROUND_TYPES. Index 0 is plain, so an unknown name reads as
// plain ground; the gate refuses it before it gets here.
function groundIndex(id: string): number {
  var idx = 0
  for (let entry of GROUND_TYPES) {
    if (entry.id == id) { return idx }
    idx++
  }
  return 0
}

// The one source of the relation order. It is major on SUBJECT because subject is
// the join key: relations meet the boxes, and the boxes ride the entity id order
// the gate established. `kind` is joined on by nothing — it is read at the leaf —
// so it sits in the tail, where it keeps a subject's rows of one kind contiguous.
// Sorting major on kind would reset the subject at every kind boundary and cost
// the meeting a cursor per kind.
function relationOrder(a: Relation, b: Relation): number {
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1
  if (a.target !== b.target) return a.target < b.target ? -1 : 1
  return 0
}

function factOrder(a: Fact, b: Fact): number {
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1
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

export type MapBox = {
  id: string,
  name: string,
  pos_x: number,
  pos_y: number,
  // Who holds this box, for the colour it wears. A wild people is held by no
  // court, and this is the one place the view says so — the board reads its
  // corners, its dashes and its slot shapes off the same answer.
  color: {
    kind: "default" | "wild" | "override"
    value: string
  },
  // Holds at least one sea slot, and so reaches the water.
  seafaring: boolean,
  // What the ground gives, 0 to 3. Zero is barren.
  fertility: number,
  slots: MapSlot[],
  // Name and colour are the power's own, resolved from its entity; a box never
  // carries a second copy of what a faction is.
  influence: { id: string, name: string, color: string, value: number }[]
}

// A slot on a province box. Every field zero-defaults to "nothing to draw", so a
// slot the world has not filled in yet renders as bare ground rather than a hole.
export type MapSlot = {
  // The work standing here — the handle an order names.
  id: string,
  // The mark that fits the square, and the words for a tooltip. Both empty is
  // what "no work stands here" looks like; the ground shows through instead.
  label: string,
  name: string,
  // What the slot sits on, and what it shows when nothing stands on it.
  ground: {
    kind: "plain" | "coast" | "resource",
    label: string,
  },
  highlight: boolean,
  // Tapped => false
  active: boolean,
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

    // Absent means no, so only a province that is one says it.
    if (province.wild) {
      state.facts.push({ subject: province.id, kind: "wild", value: 1 })
    }

    let fertility = province.fertility ?? FERTILITY_MIN
    if (fertility < FERTILITY_MIN || fertility > FERTILITY_MAX) {
      pushError(state, `Fertility ${fertility} out of range for province ${province.id}`)
    } else if (fertility != FERTILITY_MIN) {
      state.facts.push({ subject: province.id, kind: "fertility", value: fertility })
    }

    var seafaring = false
    var slot_idx = 0
    for (let work of province.works ?? []) {
      var type_idx = 0
      if (work.type != "") {
        type_idx = workTypeIndex(work.type)
        if (type_idx == 0) {
          // Invalid kind
          pushError(state, `Invalid work type ${work.type} for province ${province.id}`)
          continue;
        }
      }

      var ground_idx = 0
      if (work.ground != null && work.ground != "") {
        ground_idx = groundIndex(work.ground)
        if (ground_idx == 0) {
          pushError(state, `Invalid ground ${work.ground} for province ${province.id}`)
          continue;
        }
      }

      let type = WORK_TYPES[type_idx]
      let id = `${province.id}#${slot_idx + 1}`
      state.entities.push({
        id,
        kind: "work",
        name: type.name,
        color: "",
        pos_x: 0,
        pos_y: 0,
      })

      state.facts.push({
        subject: id,
        kind: "work_type",
        value: type_idx
      })

      // Plain ground is the zero, and absent means plain: most slots would carry
      // a row saying nothing, so they carry none.
      if (ground_idx != 0) {
        state.facts.push({
          subject: id,
          kind: "ground",
          value: ground_idx
        })
      }

      if (GROUND_TYPES[ground_idx].kind == "coast") { seafaring = true }

      state.facts.push({
        subject: id,
        kind: "tapped",
        value: TAPPED_NO
      })

      // The province is the SUBJECT: relations ride subject-major, so a province
      // and every work standing in it form one contiguous run under the cursor
      // the view already carries. Work-as-subject would scatter them and put the
      // join on `target`, against the order. The value is the 1-based slot.
      state.relations.push({
        subject: province.id,
        kind: "location_of",
        target: id,
        value: slot_idx + 1
      })
      slot_idx++
    }

    // A province is seafaring because it holds a sea slot,
    if (seafaring) {
      state.facts.push({ subject: province.id, kind: "seafaring", value: 1 })
    }
  }

  // Sort the entities
  state.entities.sort((a, b) => stringOrder(a.id, b.id))
  state.facts.sort(factOrder)

  {
    // Prepare the relations

    // Every relation endpoint names an entity, and the gate is the one place
    // that is checked — the view's merges ride that guarantee. Pass-local
    // scratch: it dies with `initialize`, so the sorted entity table stays the
    // single source of truth.
    let known_ids = new Set<string>()
    for (let entity of state.entities) {
      known_ids.add(entity.id)
    }

    for (let pair of world.connections) {
      var ok = true
      let [a, b] = pair[0] < pair[1] ? [pair[0], pair[1]] : [pair[1], pair[0]]

      // Make sure the ids are valid
      for (let item of [a, b]) {
        if (!known_ids.has(item)) {
          pushError(state, `Invalid entity id ${item}`)
          ok = false
        }
      }

      // Make sure we have no self-relations
      if (a == b) {
        pushError(state, `Invalid self-adjacency for '${a}'`)
        ok = false
      }

      // Accululate entries
      if (ok) {
        state.relations.push({
          kind: "adjacency",
          subject: a,
          target: b,
          value: 1
        })
      }
    }

    for (let province of world.provinces) {
      for (let { id, value } of province.influence ?? []) {
        if (!known_ids.has(id)) {
          pushError(state, `Invalid entity id ${id}`)
          continue
        }

        state.relations.push({
          kind: "influence",
          subject: province.id,
          target: id,
          value,
        })
      }

      for (let { id, name } of province.treaty ?? []) {
        if (!known_ids.has(id)) {
          pushError(state, `Invalid entity id ${id}`)
          continue
        }

        var value = 0
        if (name == "friend") {
          value = TREATY_FRIEND
        } else if (name == "ally") {
          value = TREATY_ALLY
        } else if (name == "subject") {
          value = TREATY_SUBJECT
        } else if (name == "home") {
          value = TREATY_HOME
        } else {
          pushError(state, `Invalid treaty name '${name}'`)
          continue
        }

        state.relations.push({
          kind: "treaty",
          subject: province.id,
          target: id,
          value,
        })
      }
    }

    let { list, errors } = refineRelationList(state.relations)
    state.relations = list

    for (let error of errors) {
      pushError(state, error)
    }

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

  // First pass over entitities
  {
    let fact_cursor = 0

    for (let entity of state.entities) {
      while (fact_cursor < state.facts.length
        && state.facts[fact_cursor].subject < entity.id) {
        fact_cursor += 1
      }
      let fact_start = fact_cursor
      while (fact_cursor < state.facts.length
        && state.facts[fact_cursor].subject == entity.id) {
        fact_cursor += 1
      }

      if (entity.kind == "faction") {
        view.cards.push({
          name: entity.name,
          color: entity.color,
        })
      } else if (entity.kind == "province") {
        let box: MapBox = {
          id: entity.id,
          name: entity.name,
          pos_x: entity.pos_x,
          pos_y: entity.pos_y,
          color: {
            kind: "default",
            value: ""
          },
          seafaring: false,
          fertility: FERTILITY_MIN,
          slots: [],
          influence: [],
        }

        for (var i = fact_start; i < fact_cursor; ++i) {
          let fact = state.facts[i]
          if (fact.kind == "wild") {
            box.color.kind = "wild"
          } else if (fact.kind == "seafaring") {
            box.seafaring = true
          } else if (fact.kind == "fertility") {
            box.fertility = fact.value
          }
        }

        view.map.boxes.push(box)
      }
    }
  }

  // A relation names its endpoints by id, and the view wants what the entity
  // behind each id holds. The pass below writes the view rows with those fields
  // left blank and records a BLANK: the id to look up, and the one field its
  // answer fills. An edge's end, an influence entry, a box and a work in its slot
  // are all the same shape of work, so they ride one sorted list through one
  // merge, and the kind tag picks the destination at the leaf.
  //
  // The gate resolves every id, so every blank finds its entity — a miss here is
  // corruption, not input, and the cursor finishing short of the end is the
  // symptom.
  type Blank = {
    // The entity whose answer fills this blank. NOT a relation's target: a blank
    // is filed against either end of one, whichever end holds the answer.
    entity: string,
    // The DESTINATION, never the field: a blank stamps whatever that destination
    // takes from the entity, so naming it for one field goes stale the day it
    // takes two.
    //   edge      connections[row], cell = EDGE_START | EDGE_END
    //   influence boxes[row].influence[cell]
    //   box       boxes[row] itself
    //   slot      boxes[row].slots[cell]
    kind: "edge" | "influence" | "box" | "slot"
    row: number,
    cell: number,
  }

  let blanks: Blank[] = []

  {
    // Relations ride subject-major and boxes ride id, so the subject only ever
    // moves forward: ONE cursor meets the boxes for every kind. It seeks and
    // parks — a subject carries many relations, and advancing it on a match
    // would strand the rest of them.
    let box_cursor = 0

    for (let relation of state.relations) {
      // An adjacency is the one relation that says nothing about a box, so it is
      // served before the box is resolved — its subject need not be a province,
      // and the cursor must not be moved on its behalf.
      if (relation.kind == "adjacency") {
        let edge = view.map.connections.length
        view.map.connections.push({ x1: 0, y1: 0, x2: 0, y2: 0 })
        blanks.push({ entity: relation.subject, kind: "edge", row: edge, cell: EDGE_START })
        blanks.push({ entity: relation.target, kind: "edge", row: edge, cell: EDGE_END })
        continue
      }

      while (box_cursor < view.map.boxes.length
        && view.map.boxes[box_cursor].id < relation.subject) {
        box_cursor += 1
      }

      let box = view.map.boxes[box_cursor]
      if (box == null || box.id != relation.subject) {
        // ASSERT!
        continue
      }

      if (relation.kind == "influence") {
        // A zero standing is no standing. This belongs to influence, whose value
        // counts something; it is not a property of relations at large.
        if (relation.value == 0) { continue }
        let cell = box.influence.length
        box.influence.push({ id: relation.target, name: "", color: "", value: relation.value })
        blanks.push({ entity: relation.target, kind: "influence", row: box_cursor, cell })
      } else if (relation.kind == "treaty" && relation.value >= TREATY_SUBJECT) {
        blanks.push({ entity: relation.target, kind: "box", row: box_cursor, cell: 0 })
      } else if (relation.kind == "location_of") {
        // The value IS the slot, 1-based, so the work is placed rather than
        // appended: nothing here depends on the order works arrive in. Blanks
        // hold positions, so growing the list cannot disturb one already filed.
        let cell = relation.value - 1
        while (box.slots.length <= cell) {
          box.slots.push({
            id: "", label: "", name: "",
            ground: { kind: "plain", label: "" },
            highlight: false, active: false,
          })
        }
        box.slots[cell].id = relation.target
        blanks.push({ entity: relation.target, kind: "slot", row: box_cursor, cell })
      }
    }
  }

  // The blanks are drained against the entity table, so they must ride its order
  // going in.
  blanks.sort((a, b) => stringOrder(a.entity, b.entity))

  {
    // One drain, three tables riding one order. The entities drive; the facts and
    // the blanks ride alongside on the same id. A blank never looks its facts up
    // — both are keyed by the entity, and the sweep is where they meet.
    //
    // The facts belong to the ENTITY, so their run is delimited once per entity,
    // before the blanks read it. The blanks are the WORK, so they drain in the
    // inner loop: one entity carries many blanks, and one blank outlives the
    // several facts it reads.
    let blank_cursor = 0
    let fact_cursor = 0

    for (let entity of state.entities) {
      while (fact_cursor < state.facts.length
        && state.facts[fact_cursor].subject < entity.id) {
        fact_cursor += 1
      }
      let fact_start = fact_cursor
      while (fact_cursor < state.facts.length
        && state.facts[fact_cursor].subject == entity.id) {
        fact_cursor += 1
      }

      // Anything the sweep has already passed names an entity that does not
      // exist. Step over it rather than stall.
      while (blank_cursor < blanks.length && blanks[blank_cursor].entity < entity.id) {
        blank_cursor += 1
      }

      while (blank_cursor < blanks.length && blanks[blank_cursor].entity == entity.id) {
        let blank = blanks[blank_cursor]

        if (blank.kind == "edge") {
          let edge = view.map.connections[blank.row]
          if (blank.cell == EDGE_START) {
            edge.x1 = entity.pos_x
            edge.y1 = entity.pos_y
          } else {
            edge.x2 = entity.pos_x
            edge.y2 = entity.pos_y
          }
        } else if (blank.kind == "influence") {
          let entry = view.map.boxes[blank.row].influence[blank.cell]
          // The name is the first two character of the ID
          entry.name = entity.id.substring(0, 2)
          entry.color = entity.color
        } else if (blank.kind == "box") {
          let box = view.map.boxes[blank.row]
          box.color.kind = "override"
          box.color.value = entity.color
        } else if (blank.kind == "slot") {
          let out = view.map.boxes[blank.row].slots[blank.cell]
          for (var i = fact_start; i < fact_cursor; ++i) {
            let fact = state.facts[i]
            if (fact.kind == "work_type") {
              let type = WORK_TYPES[fact.value]
              out.label = type.sigil
              out.name = type.name
            } else if (fact.kind == "ground") {
              let ground = GROUND_TYPES[fact.value]
              out.ground.kind = ground.kind
              out.ground.label = ground.label
            } else if (fact.kind == "tapped") {
              out.active = fact.value == TAPPED_NO
            }
          }
        }

        // One home for the advance, outside every kind branch: no leaf can stall
        // the drain, and none can consume a blank another leaf still needs.
        blank_cursor += 1
      }
    }
  }

  for (let error of state.errors) {
    view.errors.push(error.message)
  }

  return view
}

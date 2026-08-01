// The engine's entire boundary: `package.json` maps "@gk/engine" to this file
// alone, so a consumer reaches only what is exported here. Every export has a
// caller.

export type StateHandle = unknown

// An assertion states what must always hold. It throws and the run stops, since
// anything computed from a broken state is meaningless. The detail names the
// trajectory that reached here.
function assert(ok: boolean, detail: string): asserts ok {
  if (!ok) { throw new Error(detail) }
}

// -- The world as authored ---------------------------------------------------

type WorldConf = {
  factions: FactionConf[],
  provinces: ProvinceConf[],
  connections: [string, string][],
}

type FactionConf = {
  // Three letters, upper case.
  id: string,
  name: string,
  color: string,
}

type ProvinceConf = {
  // Lower snake case.
  id: string,
  name: string,
  pos_x: number,
  pos_y: number,
  influence?: { id: string, value: number }[]
  treaty?: { id: string, name: string }[]
  wild?: boolean
  fertility?: number
  works?: { type: string, ground?: string }[]
}

// -- The tables --------------------------------------------------------------

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

function pushError(state: State, message: string) {
  state.errors.push({ timestamp: state.timestamp, message })
}

const NIL = "nil"

type Entity = {
  id: string,
  kind: "faction" | "province" | "work",
  name: string
  color: string
  // Provinces only.
  pos_x: number,
  pos_y: number,
}

type FactKey = "work_type" | "ground" | "tapped" | "wild" | "seafaring" | "fertility"

type Fact = {
  subject: string,
  key: FactKey,
  value: number
}

type RelationKey = "influence" | "treaty" | "adjacency" | "location_of"

type Relation = {
  key: RelationKey,
  subject: string,
  target: string,
  value: number,
}

// What the ground gives. Zero is barren, and is a province's default.
const FERTILITY_MIN = 0
const FERTILITY_MAX = 3

// Zero is untapped, and is a work's default.
const TAPPED_NO = 0
const TAPPED_YES = 1

const TREATY_NONE = 0
const TREATY_FRIEND = 1
const TREATY_ALLY = 2
const TREATY_SUBJECT = 3
const TREATY_HOME = 4

type WorkType = {
  id: string,
  name: string,
  sigil: string,
}
// Index 0 is the empty work and must stay first: a zeroed slot resolves here.
// The sigil is two characters, sized to the square the board draws.
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

// What a slot sits on. Index 0 is plain ground and must stay first: it is a
// zeroed slot's ground.
const GROUND_TYPES: GroundType[] = [
  { id: "", kind: "plain", label: "" },
  { id: "coast", kind: "coast", label: "sea" },
  { id: "copper", kind: "resource", label: "Cu" },
  { id: "cloth", kind: "resource", label: "Dy" },
  { id: "clay", kind: "resource", label: "Ky" },
]

// The index into WORK_TYPES, which is what a fact carries; the string id is the
// author's name and stays at the gate. An unknown name returns index 0, the same
// answer as the empty work, so a caller that must tell them apart checks first.
function workTypeIndex(id: string): number {
  var idx = 0
  for (let entry of WORK_TYPES) {
    if (entry.id == id) { return idx }
    idx++
  }
  return 0
}

// The index into GROUND_TYPES. An unknown name returns index 0, plain ground,
// and the caller reports it.
function groundIndex(id: string): number {
  var idx = 0
  for (let entry of GROUND_TYPES) {
    if (entry.id == id) { return idx }
    idx++
  }
  return 0
}

// -- The order ---------------------------------------------------------------

// The one source of the order over every keyed table. Major on SUBJECT, which is
// the join key: rows meet the boxes, and the boxes ride the entity id order the
// gate established. `key` is read at the leaf and joined on by nothing, so it
// sits in the tail and keeps a subject's rows of one key contiguous — major on
// key would reset the subject at every boundary and cost the meeting a cursor
// per key.
//
// The parts pass loose, so facts, relations and deltas reach it under their own
// field names.
function keyOrder(
  a_subject: string, a_key: string, a_target: string,
  b_subject: string, b_key: string, b_target: string,
): number {
  if (a_subject !== b_subject) return a_subject < b_subject ? -1 : 1
  if (a_key !== b_key) return a_key < b_key ? -1 : 1
  if (a_target !== b_target) return a_target < b_target ? -1 : 1
  return 0
}

// A fact's target is empty.
function factOrder(a: Fact, b: Fact): number {
  return keyOrder(a.subject, a.key, "", b.subject, b.key, "")
}

function relationOrder(a: Relation, b: Relation): number {
  return keyOrder(a.subject, a.key, a.target, b.subject, b.key, b.target)
}

function stringOrder(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
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

// The relations sorted and made unique. A duplicate is reported and dropped.
function refineRelationList(list: Relation[]): { list: Relation[], errors: string[] } {
  let out_list = []
  let errors = []
  list.sort(relationOrder)

  for (var i = 0; i < list.length; ++i) {
    let item = list[i]
    if (i > 0) {
      let prev = list[i - 1]
      if (relationOrder(item, prev) == 0) {
        errors.push(`Duplicate entry in relation ${item.key} between ${item.subject} -> ${item.target}`)
        continue;
      }
    }
    out_list.push(item)
  }

  return { list: out_list, errors }
}

// -- Deltas ------------------------------------------------------------------

// One change to one value. A delta names its row by key, so it is independent of
// where the row sits. `target` is empty for a fact, and `table` selects the
// cursor.
//
// `old_value` is the value the delta was computed against; a delta that finds a
// different one is refused.
type Delta = {
  table: "fact" | "relation",
  subject: string,
  key: FactKey | RelationKey,
  target: string,
  old_value: number,
  new_value: number,
}

// Table-major, so a batch falls into one contiguous run per table and each
// table's cursor moves forward only.
function deltaOrder(a: Delta, b: Delta): number {
  if (a.table !== b.table) return a.table < b.table ? -1 : 1
  return keyOrder(a.subject, a.key, a.target, b.subject, b.key, b.target)
}

// A row against a delta. Facts pass "" as their target.
function deltaAgainst(subject: string, key: string, target: string, delta: Delta): number {
  return keyOrder(subject, key, target, delta.subject, delta.key, delta.target)
}

// A delta's name at the boundary, for errors.
function deltaName(delta: Delta): string {
  if (delta.target == "") { return `${delta.key} of ${delta.subject}` }
  return `${delta.key} ${delta.subject} -> ${delta.target}`
}

// The deltas sorted and made unique, which is the order applyDeltas rides. A row
// named twice by one batch is contested: the run is reported and dropped, so the
// row keeps what it had.
//
// A chain is written as one batch per link. Within a single batch, two deltas on
// one row disagree.
function refineDeltaList(list: Delta[]): { list: Delta[], errors: string[] } {
  let out_list: Delta[] = []
  let errors: string[] = []
  list.sort(deltaOrder)

  for (var i = 0; i < list.length; ++i) {
    var run = 1
    while (i + run < list.length && deltaOrder(list[i], list[i + run]) == 0) {
      run += 1
    }

    if (run > 1) {
      errors.push(`Duplicate delta on ${deltaName(list[i])}`)
      i += run - 1
      continue
    }

    out_list.push(list[i])
  }

  return { list: out_list, errors }
}

// A batch of deltas against the tables, as one sort-merge. The caller owes two
// things: the batch is in order, and every delta lands. Both are asserted.
//
// Landing is a precondition rather than an outcome because invertDeltas depends
// on it. A skipped delta leaves the caller holding a list that no longer
// describes what happened, and its inverse would write values the rows never
// held. The gate is where a key that names no row is turned into an error.
//
// Deltas on one row form a chain: each states the value it expects, so the second
// of a pair finds what the first left. Equal keys therefore have to reach here in
// the order the caller wrote them, which a stable sort gives.
function applyDeltas(state: State, deltas: Delta[]) {
  var fact_cursor = 0
  var relation_cursor = 0

  for (var i = 0; i < deltas.length; ++i) {
    let delta = deltas[i]

    // The cursors move forward only, so a delta behind one would read as a
    // missing row.
    if (i > 0) {
      assert(deltaOrder(deltas[i - 1], delta) <= 0,
        `Delta batch out of order at ${i}: ${deltaName(delta)}`)
    }

    var row: Fact | Relation | null = null

    if (delta.table == "fact") {
      while (fact_cursor < state.facts.length) {
        let at = state.facts[fact_cursor]
        if (deltaAgainst(at.subject, at.key, "", delta) >= 0) { break }
        fact_cursor += 1
      }
      let at = state.facts[fact_cursor]
      if (at != null && deltaAgainst(at.subject, at.key, "", delta) == 0) { row = at }
    } else {
      while (relation_cursor < state.relations.length) {
        let at = state.relations[relation_cursor]
        if (deltaAgainst(at.subject, at.key, at.target, delta) >= 0) { break }
        relation_cursor += 1
      }
      let at = state.relations[relation_cursor]
      if (at != null && deltaAgainst(at.subject, at.key, at.target, delta) == 0) { row = at }
    }

    assert(row != null, `No ${deltaName(delta)} for a delta to land on`)
    assert(row.value == delta.old_value,
      `Stale delta on ${deltaName(delta)}: found ${row.value}, wanted ${delta.old_value}`)

    row.value = delta.new_value
  }
}

// The inverse of a delta list: every change read backwards, ordered so that
// applyDeltas can ride it. Undoing is applying the inverse, so the machinery
// stays in one place.
//
// Reversing alone leaves the list descending. Reversing and then sorting stably
// gives both halves of what is needed: the keys ascend, and a row's chain runs
// backwards within its own run. Only a row's own order matters, since a delta
// reads no row but its own.
//
// The list must hold what LANDED. A delta that was refused never happened, and
// its inverse would write a value the row never held.
function invertDeltas(deltas: Delta[]): Delta[] {
  let out: Delta[] = []

  for (var i = deltas.length - 1; i >= 0; --i) {
    let delta = deltas[i]
    out.push({
      table: delta.table,
      subject: delta.subject,
      key: delta.key,
      target: delta.target,
      old_value: delta.new_value,
      new_value: delta.old_value,
    })
  }

  out.sort(deltaOrder)
  return out
}

// -- Loading a world ---------------------------------------------------------

// The fixed domain: every row the world can hold. Immutable values are authored
// here — a province's slots, the ground under them, who is adjacent to whom.
// Mutable values open at zero, so a value that changes has a row to change in,
// and the deltas fill them.
function blankState(world: WorldConf): State {
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

    // Only a wild province carries this row.
    if (province.wild) {
      state.facts.push({ subject: province.id, key: "wild", value: 1 })
    }

    let fertility = province.fertility ?? FERTILITY_MIN
    if (fertility < FERTILITY_MIN || fertility > FERTILITY_MAX) {
      pushError(state, `Fertility ${fertility} out of range for province ${province.id}`)
    } else if (fertility != FERTILITY_MIN) {
      state.facts.push({ subject: province.id, key: "fertility", value: fertility })
    }

    var seafaring = false
    var slot_idx = 0
    for (let work of province.works ?? []) {
      // Ground is immutable, so it is read here. An unreadable one leaves plain
      // ground: the slot stands regardless, and dropping it would shift every
      // slot number the world authored after it.
      var ground_idx = 0
      if (work.ground != null && work.ground != "") {
        ground_idx = groundIndex(work.ground)
        if (ground_idx == 0) {
          pushError(state, `Invalid ground ${work.ground} for province ${province.id}`)
        }
      }

      // A work's name belongs to its work type, which is mutable, so the entity
      // carries none and the board reads the type's own row.
      let id = `${province.id}#${slot_idx + 1}`
      state.entities.push({
        id,
        kind: "work",
        name: "",
        color: "",
        pos_x: 0,
        pos_y: 0,
      })

      // What stands on the slot is mutable: the row opens at the empty work, and
      // the world's answer arrives as a delta.
      state.facts.push({
        subject: id,
        key: "work_type",
        value: 0
      })

      // Plain ground is the zero; only other ground carries a row.
      if (ground_idx != 0) {
        state.facts.push({
          subject: id,
          key: "ground",
          value: ground_idx
        })
      }

      if (GROUND_TYPES[ground_idx].kind == "coast") { seafaring = true }

      state.facts.push({
        subject: id,
        key: "tapped",
        value: TAPPED_NO
      })

      // The province is the SUBJECT: relations ride subject-major, so a province
      // and its works form one contiguous run under the cursor the view carries.
      // Work-as-subject would put the join on `target`, against the order. The
      // value is the 1-based slot.
      state.relations.push({
        subject: province.id,
        key: "location_of",
        target: id,
        value: slot_idx + 1
      })
      slot_idx++
    }

    // A province is seafaring when it holds a sea slot.
    if (seafaring) {
      state.facts.push({ subject: province.id, key: "seafaring", value: 1 })
    }
  }

  // The order every later pass rides.
  state.entities.sort((a, b) => stringOrder(a.id, b.id))
  state.facts.sort(factOrder)

  // A standing and a rung are both mutable, so every province holds a row for
  // every faction. Zero in both is a stranger.
  for (let province of world.provinces) {
    for (let faction of world.factions) {
      state.relations.push({
        key: "influence",
        subject: province.id,
        target: faction.id,
        value: 0
      })

      state.relations.push({
        key: "treaty",
        subject: province.id,
        target: faction.id,
        value: TREATY_NONE
      })
    }
  }

  // Both halves of every connection, so a province's neighbours sit contiguous
  // under the subject-major order the rest of the table rides. Each half checks
  // its own end against the entity table, so the pair checks both — as a merge on
  // the order the entities were just put in.
  let edges: Relation[] = []
  for (let pair of world.connections) {
    if (pair[0] == pair[1]) {
      pushError(state, `Invalid self-adjacency for '${pair[0]}'`)
      continue
    }

    edges.push({ key: "adjacency", subject: pair[0], target: pair[1], value: 1 })
    edges.push({ key: "adjacency", subject: pair[1], target: pair[0], value: 1 })
  }

  edges.sort(relationOrder)

  var entity_cursor = 0
  for (let edge of edges) {
    while (entity_cursor < state.entities.length
      && state.entities[entity_cursor].id < edge.subject) {
      entity_cursor += 1
    }

    let at = state.entities[entity_cursor]
    if (at == null || at.id != edge.subject) {
      pushError(state, `Invalid entity id ${edge.subject}`)
      continue
    }

    state.relations.push(edge)
  }

  let { list, errors } = refineRelationList(state.relations)
  state.relations = list

  for (let error of errors) {
    pushError(state, error)
  }

  // The entities ride their own order, so the scan that proves them unique rides
  // the same one.
  let ids: string[] = []
  for (let entity of state.entities) {
    ids.push(entity.id)
  }

  for (let dup of duplicatesInSortedArray(ids)) {
    pushError(state, `Duplicate id '${dup}'`)
  }

  return state
}

// Whether the world names this faction. The faction list is small and fixed, so
// it is scanned, like the work and ground tables.
function isFaction(world: WorldConf, id: string): boolean {
  for (let faction of world.factions) {
    if (faction.id == id) { return true }
  }
  return false
}

// The world's authored values, as changes against the fixed domain. Every
// mutable value enters through this door, so loading a world and playing one are
// one operation.
//
// This is the gate for the batch applyDeltas asserts on: a key that names no
// faction, and a row the world speaks of twice, are turned into errors here.
function worldDeltas(world: WorldConf): { deltas: Delta[], errors: string[] } {
  let deltas: Delta[] = []
  let errors: string[] = []

  for (let province of world.provinces) {
    var slot_idx = 0
    for (let work of province.works ?? []) {
      let id = `${province.id}#${slot_idx + 1}`
      slot_idx++

      // The empty work is the zero already in place.
      if (work.type == "") { continue }

      let type_idx = workTypeIndex(work.type)
      if (type_idx == 0) {
        errors.push(`Invalid work type ${work.type} for province ${province.id}`)
        continue
      }

      deltas.push({
        table: "fact", subject: id, key: "work_type", target: "",
        old_value: 0, new_value: type_idx,
      })
    }

    for (let { id, value } of province.influence ?? []) {
      if (!isFaction(world, id)) {
        errors.push(`Invalid faction id ${id} in influence for ${province.id}`)
        continue
      }

      deltas.push({
        table: "relation", subject: province.id, key: "influence", target: id,
        old_value: 0, new_value: value,
      })
    }

    for (let { id, name } of province.treaty ?? []) {
      if (!isFaction(world, id)) {
        errors.push(`Invalid faction id ${id} in treaty for ${province.id}`)
        continue
      }

      var rung = TREATY_NONE
      if (name == "friend") {
        rung = TREATY_FRIEND
      } else if (name == "ally") {
        rung = TREATY_ALLY
      } else if (name == "subject") {
        rung = TREATY_SUBJECT
      } else if (name == "home") {
        rung = TREATY_HOME
      } else {
        errors.push(`Invalid treaty name '${name}'`)
        continue
      }

      deltas.push({
        table: "relation", subject: province.id, key: "treaty", target: id,
        old_value: 0, new_value: rung,
      })
    }
  }

  let refined = refineDeltaList(deltas)
  for (let error of refined.errors) {
    errors.push(error)
  }

  return { deltas: refined.list, errors }
}

export function initialize(conf: string): StateHandle {
  let world: WorldConf = JSON.parse(conf)!

  let state = blankState(world)

  let { deltas, errors } = worldDeltas(world)
  for (let error of errors) {
    pushError(state, error)
  }

  applyDeltas(state, deltas)

  return state
}

// -- Words -------------------------------------------------------------------

export type Word = {
  // The version of the world the word was written against. A word carrying an
  // older one is refused.
  stamp: number,
  kind: "point" | "commit" | "cancel" | "pass",
  // The entity named. Empty for the three control words.
  target: string,
  // How many, for a word that carries a count. Zero otherwise.
  amount: number,
}

function valid_words(state: State): Word[] {
  return []
}

export function submit(state: StateHandle, word: Word) {

}

// -- The view ----------------------------------------------------------------

// The two ends of a drawn edge. A connection is filed from its lesser end, so
// START is the lesser id and END the greater.
const EDGE_START = 0
const EDGE_END = 1

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
  // Who holds this box, and the colour it wears. This is the one place the view
  // reports a wild people: the board takes its corners, its dashes and its slot
  // shapes from the same answer.
  color: {
    kind: "default" | "wild" | "override"
    value: string
  },
  // Holds at least one sea slot.
  seafaring: boolean,
  // What the ground gives, 0 to 3. Zero is barren.
  fertility: number,
  slots: MapSlot[],
  // Name and colour resolve from the faction's own entity, which is their one
  // home.
  influence: { id: string, name: string, color: string, value: number }[]
}

// A slot on a province box. Every field zero-defaults to nothing to draw, so an
// unfilled slot renders as bare ground.
export type MapSlot = {
  // The work standing here, and the handle a word names.
  id: string,
  // The mark for the square, and the words for a tooltip. Both are empty on open
  // ground, and the ground shows through.
  label: string,
  name: string,
  // What the slot sits on, and what it shows when nothing stands on it.
  ground: {
    kind: "plain" | "coast" | "resource",
    label: string,
  },
  highlight: boolean,
  // False once the work has acted this year.
  active: boolean,
}

export type MapEdge = {
  x1: number,
  y1: number,
  x2: number,
  y2: number,
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

  // Cards and boxes, each taking its facts from the run beside it.
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
          if (fact.key == "wild") {
            box.color.kind = "wild"
          } else if (fact.key == "seafaring") {
            box.seafaring = true
          } else if (fact.key == "fertility") {
            box.fertility = fact.value
          }
        }

        view.map.boxes.push(box)
      }
    }
  }

  // A relation names its endpoints by id, and the view wants what the entity
  // behind each id holds. The pass below writes those fields empty and files a
  // BLANK: the id to look up, and the destination its answer fills. An edge's
  // end, an influence entry, a box and a work in a slot are one shape of work, so
  // they ride one sorted list through one merge, and the kind picks the
  // destination at the leaf.
  //
  // The gate resolves every id, so every blank finds its entity. A cursor
  // finishing short of the end is the symptom of corruption.
  type Blank = {
    // The entity whose answer fills this blank: either end of a relation,
    // whichever end holds the answer.
    entity: string,
    // The destination, not the field: a blank stamps whatever that destination
    // takes from the entity.
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
    // Relations ride subject-major and boxes ride id, so the subject moves
    // forward only: ONE cursor meets the boxes for every key. It seeks and parks,
    // since a subject carries many relations.
    let box_cursor = 0

    for (let relation of state.relations) {
      // An adjacency is the one relation that says nothing about a box. Its
      // subject may be any entity, so it is served before the box is resolved and
      // the cursor stays where it is.
      if (relation.key == "adjacency") {
        // Both halves are stored; the lesser end draws, so one line per pair.
        if (relation.subject < relation.target) {
          let edge = view.map.connections.length
          view.map.connections.push({ x1: 0, y1: 0, x2: 0, y2: 0 })
          blanks.push({ entity: relation.subject, kind: "edge", row: edge, cell: EDGE_START })
          blanks.push({ entity: relation.target, kind: "edge", row: edge, cell: EDGE_END })
        }
        continue
      }

      while (box_cursor < view.map.boxes.length
        && view.map.boxes[box_cursor].id < relation.subject) {
        box_cursor += 1
      }

      // Every relation past the adjacency has a province for its subject, and the
      // boxes carry every province.
      let box = view.map.boxes[box_cursor]
      assert(box != null && box.id == relation.subject,
        `No box for ${relation.key} ${relation.subject} -> ${relation.target}`)

      if (relation.key == "influence") {
        // A zero standing is no standing — influence's own rule, since its value
        // counts something.
        if (relation.value == 0) { continue }
        let cell = box.influence.length
        box.influence.push({ id: relation.target, name: "", color: "", value: relation.value })
        blanks.push({ entity: relation.target, kind: "influence", row: box_cursor, cell })
      } else if (relation.key == "treaty" && relation.value >= TREATY_SUBJECT) {
        blanks.push({ entity: relation.target, kind: "box", row: box_cursor, cell: 0 })
      } else if (relation.key == "location_of") {
        // The value is the slot, 1-based, so the work is placed rather than
        // appended and the arrival order is free. Blanks hold positions, so
        // growing the list leaves one already filed intact.
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

  // The blanks drain against the entity table, so they ride its order going in.
  blanks.sort((a, b) => stringOrder(a.entity, b.entity))

  {
    // One drain, three tables on one order. The entities drive; the facts and the
    // blanks ride alongside on the same id, and the sweep is where they meet.
    //
    // The facts belong to the ENTITY, so their run is delimited once per entity,
    // before the blanks read it. The blanks are the WORK, so they drain in the
    // inner loop: one entity carries many blanks, and one blank reads several
    // facts.
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

      // A blank behind the sweep names an entity that does not exist; step over
      // it.
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
          // The first two characters of the id.
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
            if (fact.key == "work_type") {
              let type = WORK_TYPES[fact.value]
              out.label = type.sigil
              out.name = type.name
            } else if (fact.key == "ground") {
              let ground = GROUND_TYPES[fact.value]
              out.ground.kind = ground.kind
              out.ground.label = ground.label
            } else if (fact.key == "tapped") {
              out.active = fact.value == TAPPED_NO
            }
          }
        }

        // One home for the advance, outside every branch, so every leaf leaves
        // the drain in the same place.
        blank_cursor += 1
      }
    }
  }

  for (let error of state.errors) {
    view.errors.push(error.message)
  }

  return view
}

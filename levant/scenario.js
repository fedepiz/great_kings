// =====================================================================
//  THE SCENARIO — the world as play opens
// =====================================================================
// One JSON-shaped object: the cast of powers, the map, and the opening position, linked
// together. `initState(scenario)` is the one door through which a world is born from this;
// the loader VALIDATES OR THROWS — a scenario is authored by a person, and a silent default
// would seat a broken world. This file is the canon; another scenario is another object of
// the same shape.
//
// JSON-SHAPED means data all the way down: no functions, no dates —
// `JSON.parse(JSON.stringify(scenario))` is the identity.
//
// The vocabulary is the AUTHOR'S, not the engine's. The loader translates it into the
// engine's own shapes, and the engine's internal encodings (see `bd.o` at `usable`) never
// appear here — ownership is said in domain terms, once, below.
//
//   powers     — seating order IS turn order; the first seat opens the game.
//     id         one letter, never equal to any region id (the loader enforces this;
//                ownership encoding depends on it)
//     home       the region holding this power's palace
//     stock      opening goods; an absent good is 0
//   regions    — a region IS its slot list. Order is board order, and it matters: menus
//                and walks enumerate regions in this order.
//     at         where it sits on the board, [x, y]
//     farm       the farm yield; farms may only rise where it is 1+
//     wild       a wild people: no foreign stones, allies never submit, its warbands are a
//                raid's lot
//     seafaring  a wild people whose warbands join sea raids
//     slots      each slot carries its GROUND (coast, a resource) and, optionally, the WORK
//                standing on it at the opening. No `work` = open ground.
//       res        gates the specialised workshop this slot accepts (copper/cloth/clay)
//       work.type  a building type out of the engine's `BT`
//       work.crown the owning power — REQUIRED for a palace or an organ of state, FORBIDDEN
//                  on a province's own works. A warband in a wild region carries no crown:
//                  it is the people's own.
//       work.tapped  opens the game already tapped; absent = fresh
//   roads      — adjacency, as pairs of region ids
//   standings  — power → region → opening standing. A bare rung string sits at the rung's
//                floor; the long form { rung, influence, strained } places it exactly.
//                A power's home never appears here — a court holds no standing ledger on
//                any capital.
//   year       — the opening year; absent = 1
// =====================================================================

export default {
  name: "The Late Bronze Age",

  powers: [
    { id: "Y", name: "Mycenae", color: "#B01E3C", home: "MYC", stock: { food: 2, pottery: 1 } },
    { id: "H", name: "Hatti", color: "#8C4A2F", home: "HAT", stock: { food: 2, bronze: 1 } },
    { id: "M", name: "Mitanni", color: "#6B4A8C", home: "WAS", stock: { food: 2, cloth: 1 } },
    { id: "B", name: "Babylon", color: "#177268", home: "BAB", stock: { food: 2 } },
    { id: "E", name: "Egypt", color: "#C9A227", home: "LEG", stock: { food: 2 } },
  ],

  regions: [
    // --- Greece & the Balkan hinterland ---
    { id: "ISTR", name: "Ister", at: [70, 110], farm: 0, wild: true, slots: [
      { work: { type: "warrior" } },
      { work: { type: "warrior" } },
    ] },
    { id: "IOL", name: "Iolkos", at: [70, 200], farm: 1, slots: [
      { coast: true, work: { type: "port" } },
      { res: "clay" },
      { work: { type: "farm" } },
    ] },
    { id: "MYC", name: "Mycenae", at: [40, 290], farm: 1, slots: [
      { coast: true, work: { type: "port" } },
      { res: "clay", work: { type: "wsP" } },
      { work: { type: "palace", crown: "Y" } },
      { work: { type: "farm" } },
    ] },
    // --- Anatolia ---
    { id: "KAS", name: "Kaska", at: [370, 20], farm: 0, wild: true, slots: [
      { work: { type: "warrior" } },
      { work: { type: "warrior" } },
      { work: { type: "warrior" } },
    ] },
    { id: "WIL", name: "Wilusa", at: [200, 110], farm: 1, slots: [
      { coast: true, work: { type: "port" } },
      { work: { type: "garrison" } },
      {},
    ] },
    { id: "HAT", name: "Hattusa", at: [360, 110], farm: 1, slots: [
      { work: { type: "palace", crown: "H" } },
      { work: { type: "farm" } },
      { work: { type: "garrison" } },
      {},
    ] },
    { id: "ISU", name: "Isuwa", at: [540, 110], farm: 1, slots: [
      { res: "copper", work: { type: "wsB" } },
      {},
      {},
    ] },
    { id: "ARZ", name: "Arzawa", at: [200, 200], farm: 2, slots: [
      { coast: true, work: { type: "garrison" } },
      { work: { type: "farm" } },
      {},
    ] },
    { id: "PLA", name: "Tarhuntassa", at: [360, 200], farm: 1, slots: [
      { res: "copper", work: { type: "wsB" } },
      { work: { type: "farm" } },
      { work: { type: "market" } },
    ] },
    { id: "MIL", name: "Millawanda", at: [200, 290], farm: 1, slots: [
      { coast: true, work: { type: "port" } },
      { res: "clay" },
      { work: { type: "market" } },
    ] },
    { id: "LUK", name: "Lukka", at: [320, 290], farm: 0, wild: true, seafaring: true, slots: [
      { coast: true, work: { type: "warrior" } },
      { work: { type: "warrior" } },
    ] },
    { id: "KIZ", name: "Kizzuwatna", at: [450, 290], farm: 2, slots: [
      { coast: true, work: { type: "port" } },
      { work: { type: "farm" } },
      {},
    ] },
    // --- Upper Mesopotamia ---
    { id: "WAS", name: "Washukanni", at: [700, 110], farm: 2, slots: [
      { work: { type: "palace", crown: "M" } },
      { work: { type: "farm" } },
      { work: { type: "garrison" } },
      {},
    ] },
    { id: "CAR", name: "Carchemish", at: [600, 200], farm: 2, slots: [
      { work: { type: "farm" } },
      { work: { type: "market" } },
      {},
    ] },
    { id: "ASH", name: "Ashur", at: [740, 200], farm: 2, slots: [
      { work: { type: "garrison" } },
      { work: { type: "farm" } },
      {},
    ] },
    { id: "HAL", name: "Halab", at: [600, 290], farm: 2, slots: [
      { res: "cloth", work: { type: "wsC" } },
      { work: { type: "farm" } },
      { work: { type: "market" } },
    ] },
    { id: "MAR", name: "Mari", at: [750, 290], farm: 1, slots: [
      { work: { type: "market" } },
      { work: { type: "farm" } },
      {},
    ] },
    // --- islands in the water ---
    { id: "KNO", name: "Knossos", at: [80, 400], farm: 1, slots: [
      { coast: true, work: { type: "port" } },
      { res: "clay", work: { type: "wsP" } },
      {},
    ] },
    { id: "ALA", name: "Alashiya", at: [290, 380], farm: 1, slots: [
      { res: "copper", work: { type: "wsB" } },
      { coast: true, work: { type: "port" } },
      { res: "copper", work: { type: "wsB" } },
    ] },
    { id: "SHK", name: "Sherden", at: [90, 550], farm: 0, wild: true, seafaring: true, slots: [
      { coast: true, work: { type: "warrior" } },
      { coast: true, work: { type: "warrior" } },
    ] },
    // --- the Levant: coast road, inland road, desert ---
    { id: "UGA", name: "Ugarit", at: [450, 380], farm: 1, slots: [
      { coast: true, work: { type: "port" } },
      { res: "cloth", work: { type: "wsC" } },
      { work: { type: "farm" } },
    ] },
    { id: "AMU", name: "Amurru", at: [610, 380], farm: 2, slots: [
      { work: { type: "garrison" } },
      {},
      {},
    ] },
    { id: "SUT", name: "Sutu", at: [750, 380], farm: 0, wild: true, slots: [
      { work: { type: "warrior" } },
      { work: { type: "warrior" } },
    ] },
    { id: "BYB", name: "Byblos", at: [450, 470], farm: 1, slots: [
      { coast: true, work: { type: "port" } },
      { res: "cloth", work: { type: "wsC" } },
      { work: { type: "farm" } },
    ] },
    { id: "QAD", name: "Qadesh", at: [610, 470], farm: 2, slots: [
      { work: { type: "garrison" } },
      { work: { type: "farm" } },
      {},
    ] },
    { id: "BAB", name: "Babylon", at: [740, 470], farm: 3, slots: [
      { work: { type: "palace", crown: "B" } },
      { work: { type: "farm" } },
      { work: { type: "market" } },
      {},
    ] },
    { id: "CAN", name: "Canaan", at: [440, 590], farm: 2, slots: [
      { coast: true, work: { type: "garrison" } },
      { work: { type: "farm" } },
      { res: "cloth" },
      {},
    ] },
    { id: "APR", name: "Apiru", at: [610, 560], farm: 0, wild: true, slots: [
      { work: { type: "warrior" } },
      { work: { type: "warrior" } },
    ] },
    { id: "NIP", name: "Nippur", at: [740, 560], farm: 3, slots: [
      { work: { type: "farm" } },
      { work: { type: "granary" } },
      {},
      { res: "clay", work: { type: "wsP" } },
    ] },
    { id: "DER", name: "Der", at: [900, 560], farm: 1, slots: [
      { work: { type: "farm" } },
      {},
    ] },
    { id: "SIN", name: "Sinai", at: [475, 680], farm: 0, slots: [
      { res: "copper" },
      {},
    ] },
    { id: "SHA", name: "Shasu", at: [610, 650], farm: 0, wild: true, slots: [
      { work: { type: "warrior" } },
      { work: { type: "warrior" } },
    ] },
    // --- Egypt ---
    { id: "LIB", name: "Libu", at: [90, 700], farm: 0, wild: true, slots: [
      { work: { type: "warrior" } },
      { work: { type: "warrior" } },
    ] },
    { id: "LEG", name: "Lower Egypt", at: [260, 700], farm: 3, slots: [
      { coast: true, work: { type: "port" } },
      { coast: true },
      { work: { type: "palace", crown: "E" } },
      { work: { type: "farm" } },
      {},
    ] },
    { id: "MEG", name: "Middle Egypt", at: [230, 800], farm: 3, slots: [
      { work: { type: "farm" } },
      { work: { type: "granary" } },
      {},
    ] },
    { id: "UEG", name: "Upper Egypt", at: [360, 800], farm: 2, slots: [
      { work: { type: "farm" } },
      { work: { type: "market" } },
      {},
    ] },
  ],

  roads: [
    // Greece
    ["ISTR", "IOL"], ["IOL", "MYC"],
    // Anatolia
    ["KAS", "HAT"], ["KAS", "ISU"], ["HAT", "ISU"], ["HAT", "PLA"],
    ["WIL", "ARZ"], ["ARZ", "MIL"], ["ARZ", "PLA"], ["MIL", "LUK"], ["LUK", "PLA"], ["PLA", "KIZ"],
    // Upper Mesopotamia & the desert caravan
    ["ISU", "WAS"], ["WAS", "CAR"], ["WAS", "ASH"], ["CAR", "HAL"], ["ASH", "MAR"], ["MAR", "SUT"], ["SUT", "QAD"],
    // the Levant: coast road, inland road
    ["KIZ", "UGA"], ["KIZ", "HAL"], ["HAL", "AMU"], ["UGA", "AMU"], ["UGA", "BYB"],
    ["AMU", "QAD"], ["QAD", "APR"], ["APR", "BYB"], ["APR", "SHA"], ["APR", "NIP"], ["BYB", "CAN"],
    ["CAN", "SIN"], ["SHA", "SIN"],
    // Mesopotamia
    ["QAD", "BAB"], ["BAB", "NIP"], ["BAB", "DER"],
    // Egypt
    ["CAN", "LEG"], ["SIN", "LEG"], ["LEG", "MEG"], ["MEG", "UEG"], ["LIB", "LEG"],
  ],

  standings: {
    Y: { IOL: "subject", MIL: "friend", KNO: "subject" },
    H: { ISU: "subject", PLA: "subject", KIZ: "subject", UGA: "friend" },
    M: { CAR: "subject", ASH: "friend", HAL: "subject" },
    B: { MAR: "friend", NIP: "subject", DER: "subject" },
    E: { BYB: "friend", MEG: "subject", UEG: "subject" },
  },
};

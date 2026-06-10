// All NPC dialog and placement. Edit lines freely — keep them player-safe.
//
// scene:    'town' | 'inn' | 'giant' — which 3D scene the NPC stands in
// position: [x, z] in that scene's coordinates
// facing:   yaw in radians (0 faces north/-Z, PI/2 faces west, -PI/2 faces east, PI faces south)
// look:     colors for the procedural body (body/head/hair as hex, hood: bool, child: bool)
// model:    KayKit Adventurers cast — 'barbarian' | 'knight' | 'mage' | 'rogue' | 'rogue-hooded'
// tint:     optional hex multiplier applied to the model's cloth meshes (clothes color)
// lines:    dialog shown one line per E press; villagers instead get waypoints to wander

export const npcs = [
  {
    id: 'toblen', name: 'Toblen Stonehill', role: 'Innkeeper',
    location: 'stonehill-inn', scene: 'inn', position: [-5.4, 0], facing: Math.PI / 2,
    look: { body: 0x7a5230, head: 0xe8b88a, hair: 0x4b3621 },
    model: 'barbarian', tint: 0xc9a978,
    lines: [
      "Welcome to the Stonehill! A room's five silver, and Trilena's stew is the best between here and Neverwinter.",
      "I came out here to prospect, truth be told. Turns out I'd rather keep a warm hearth than swing a pick.",
      "Folk are good here. Mostly. Keep your coin close at the east end of town, that's all I'll say.",
      "Miners swear something wails in the woods out by Conyberry. A banshee, they say. I just serve the ale and don't argue.",
    ],
  },
  {
    id: 'elmar', name: 'Elmar Barthen', role: 'Provisioner',
    location: 'barthens-provisions', scene: 'town', position: [12.5, -10], facing: Math.PI / 2,
    look: { body: 0x8a7a52, head: 0xdfae80, hair: 0x9a9a8c },
    model: 'mage', tint: 0x9a8262,
    lines: [
      "Barthen's Provisions, open dawn till dusk! Rope, lanterns, flour, mining picks — if it's sensible, I stock it.",
      "No blades or mail here, friend. Linene at the Lionshield handles steel.",
      "I'm expecting a wagonload of goods up from Neverwinter, and it's late. Roads aren't what they used to be.",
      "Phandalin's growing again, mark me. Good folk keep arriving... and a few bad ones, alas.",
    ],
  },
  {
    id: 'linene', name: 'Linene Graywind', role: 'Master of the Lionshield Coster',
    location: 'lionshield-coster', scene: 'town', position: [-19, 6], facing: -Math.PI / 2,
    look: { body: 0x3f5570, head: 0xd9a47c, hair: 0x6e3a1f },
    model: 'knight', tint: 0x6f86c0,
    lines: [
      'Lionshield Coster. Honest steel at honest prices. You break it, that\'s your business.',
      'We lost a whole shipment on the Triboar Trail not long back. Bandits. Find crates marked with a blue lion, and I\'ll make it worth your trouble.',
      'I don\'t sell weapons to troublemakers. You lot look... mostly trustworthy.',
    ],
  },
  {
    id: 'halia', name: 'Halia Thornton', role: "Guildmaster of the Miner's Exchange",
    location: 'miners-exchange', scene: 'town', position: [13, 27.5], facing: Math.PI,
    look: { body: 0x5c3a4e, head: 0xd9a47c, hair: 0x2b2b2b },
    model: 'rogue', tint: 0x6a5a32,
    lines: [
      'The Exchange weighs fair and pays fair. Bring your ore here, not to some Neverwinter middleman.',
      'I keep the records, settle the claims, witness the contracts. In a town with no lord, somebody must.',
      'You strike me as capable. Capable folk can always find... opportunities in Phandalin. Do come see me again.',
    ],
  },
  {
    id: 'qelline', name: 'Qelline Alderleaf', role: 'Halfling farmer',
    location: 'alderleaf-farm', scene: 'town', position: [-34, 33], facing: 3 * Math.PI / 4,
    look: { body: 0x6f7d3c, head: 0xe8b88a, hair: 0x7a4a22, child: true },
    model: 'rogue', tint: 0x7d8a4a,
    lines: [
      "You look road-worn, dears. There's cider on the porch and hay in the barn if you're short of coin.",
      'My cousin Reidoth knows every trail and ruin for fifty miles. A druid — keeps to himself, last seen near Thundertree.',
      "Carp! Out of the wagon! — sorry. The boy has more curiosity than sense.",
    ],
  },
  {
    id: 'carp', name: 'Carp Alderleaf', role: 'Aspiring adventurer, age 10',
    location: 'alderleaf-farm', scene: 'town', position: [-31.5, 35.5], facing: Math.PI / 2,
    look: { body: 0xb05a3c, head: 0xe8b88a, hair: 0x7a4a22, child: true },
    model: 'rogue', tint: 0xc8803a,
    lines: [
      "I found something! A secret way in the brush by the old manor hill! Don't tell mama I was up there.",
      "One of the red-cloak men chased me off. I'm faster though. Fastest in Phandalin!",
      "When I grow up I'm going to be an adventurer like you. Do you have a sword? Can I hold it?",
    ],
  },
  {
    id: 'garaele', name: 'Sister Garaele', role: 'Acolyte of Tymora',
    location: 'shrine-of-luck', scene: 'town', position: [4, -22.5], facing: Math.PI,
    look: { body: 0xc8b88f, head: 0xeec9a0, hair: 0xd8c25e },
    model: 'mage', tint: 0xd8e2ee,
    lines: [
      'Tymora smiles on the bold. Be welcome at her shrine, travelers.',
      'If luck has been unkind, I can tend your wounds. A small offering to the Lady is customary.',
      'There is an errand I would trust to brave souls. A banshee called Agatha haunts a grove near Conyberry — and she must be persuaded, not fought, to answer a question. Interested?',
    ],
  },
  {
    id: 'grista', name: 'Grista', role: 'Barkeep of the Sleeping Giant',
    location: 'sleeping-giant', scene: 'giant', position: [0, 3.0], y: 0.45, facing: 0,
    look: { body: 0x5a4632, head: 0xd9a47c, hair: 0xa8502e, child: true },
    model: 'barbarian', tint: 0x6f5a40,
    lines: [
      'What. You drinking or leaving?',
      "Ale's a copper. Don't like it? The well's outside.",
      "My regulars don't care for new faces. I'd drink quick, were I you.",
    ],
  },
  {
    id: 'harbin', name: 'Harbin Wester', role: 'Townmaster',
    location: 'townmasters-hall', scene: 'town', position: [7.5, 8.5], facing: Math.PI / 2,
    look: { body: 0x7d6a8e, head: 0xeab68f, hair: 0xcccccc },
    model: 'mage', tint: 0x9a7ab8,
    lines: [
      'Townmaster Harbin Wester, at your service. Within reason. Within reason.',
      "Trouble? There's no trouble in Phandalin. A few high-spirited lads in red cloaks, nothing more. Please don't make a fuss.",
      "Now, orcs — THAT is trouble worth paying for. A band's been raiding near Wyvern Tor. See the notice board. There's a reward!",
    ],
  },
  {
    id: 'daran', name: 'Daran Edermath', role: 'Orchardist, retired marshal',
    location: 'edermath-orchard', scene: 'town', position: [-52, -46.5], facing: -Math.PI / 2,
    look: { body: 0x4e6e51, head: 0xe3b58b, hair: 0xd8d8d8 },
    model: 'knight', tint: 0xb8895a,
    lines: [
      'Fine apples this year. Take one for the road — frontier hospitality.',
      'I marshaled for the Lords\' Alliance, once. These old bones still notice things. Like those red-cloaked louts swaggering about after dark.',
      "If you've a mind to do some good: travelers say someone's been digging at the ruins by Old Owl Well, and that the dead walk there. Worth a look, for the right sort.",
    ],
  },
  {
    id: 'redbrand-1', name: 'Redbrand Ruffian', role: 'Tough in a grubby scarlet cloak',
    // loiters by the barrels at the tavern's west corner — kept >4 m from the
    // door hotspot at (40, ~7.9) so his talk prompt can't shadow the Enter prompt
    location: 'sleeping-giant', scene: 'town', position: [33.7, 11.6], facing: Math.PI / 2,
    look: { body: 0x8c2f2f, head: 0xc9986f, hair: 0x2b2b2b, hood: true },
    model: 'rogue-hooded', tint: 0x8a1f1a,
    lines: [
      "You lost? The Sleeping Giant's for regulars. Everywhere else is... also for regulars.",
      'Nice gear. Be a shame if something happened to it.',
      "Move along, hero. This town's already under our— under good protection.",
    ],
  },
  {
    id: 'redbrand-2', name: 'Redbrand Ruffian', role: 'Tough in a grubby scarlet cloak',
    // east flank, by the broken crate — also kept >4 m from the door hotspot
    location: 'sleeping-giant', scene: 'town', position: [44.2, 6.9], facing: 0,
    look: { body: 0x7e2a2a, head: 0xd9a47c, hair: 0x4b3621, hood: true },
    model: 'rogue-hooded', tint: 0x7a1f1f,
    lines: [
      "Keep walking, friend. That's free advice, and the last free thing you'll get from me.",
      "New faces don't last long here unless they learn some respect.",
      'What are you looking at?',
    ],
  },
  {
    id: 'redbrand-3', name: 'Redbrand Ruffian', role: 'Tough in a grubby scarlet cloak',
    location: 'sleeping-giant', scene: 'giant', position: [-2.4, 0.4], facing: -Math.PI / 2,
    look: { body: 0x8c2f2f, head: 0xc9986f, hair: 0x6e3a1f, hood: true },
    model: 'rogue-hooded', tint: 0x9a2418,
    lines: [
      "This table's taken. So's that one. All of them, funny enough.",
      "You've got nerve, drinking here. Or no sense. Same thing, mostly.",
      "The boss doesn't like questions. Neither do we.",
    ],
  },
  {
    id: 'redbrand-4', name: 'Redbrand Ruffian', role: 'Tough in a grubby scarlet cloak',
    location: 'sleeping-giant', scene: 'giant', position: [1.7, -0.2], facing: Math.PI,
    look: { body: 0x7e2a2a, head: 0xd9a47c, hair: 0x2b2b2b, hood: true },
    model: 'rogue-hooded', tint: 0x83221c,
    lines: [
      "Grista! Another round, on the... town's tab. Heh.",
      "You smell like trouble. We're the only trouble allowed in Phandalin.",
      'Pretty sword. Mine is bigger.',
    ],
  },
  {
    id: 'villager-1', name: 'Villager', role: 'Townsfolk',
    location: 'townmasters-hall', scene: 'town', position: [-40, -37], facing: 0,
    look: { body: 0x927b4f, head: 0xe0ac69, hair: 0x5a4632 },
    model: 'rogue', tint: 0xa08648,
    lines: [],
    waypoints: [[-40, -37], [-12, -10], [0, 0], [-12, -10]],
  },
  {
    id: 'villager-2', name: 'Villager', role: 'Townsfolk',
    location: 'townmasters-hall', scene: 'town', position: [1, 30], facing: 0,
    look: { body: 0x6b7a8c, head: 0xd9a47c, hair: 0x2b2b2b },
    model: 'mage', tint: 0x6a7a8c,
    lines: [],
    waypoints: [[1, 30], [0, 4], [2, 48], [0, 4]],
  },
  {
    id: 'villager-3', name: 'Villager', role: 'Townsfolk',
    location: 'townmasters-hall', scene: 'town', position: [20, 5], facing: 0,
    look: { body: 0x84543a, head: 0xeab68f, hair: 0x9a9a8c },
    model: 'barbarian', tint: 0x8a9a6a,
    lines: [],
    waypoints: [[20, 5], [38, 8], [8, 2], [38, 8]],
  },
  {
    id: 'villager-4', name: 'Villager', role: 'Townsfolk',
    location: 'townmasters-hall', scene: 'town', position: [6, 0], facing: 0,
    look: { body: 0x7a6a9a, head: 0xe8b88a, hair: 0x7a4a22, child: true },
    model: 'rogue', tint: 0xa06a4a,
    lines: [],
    waypoints: [[6, 0], [0, 6], [-6, 0], [0, -6]],
  },
];

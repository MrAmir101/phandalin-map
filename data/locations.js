// All player-safe content for the ten locations of Phandalin.
// Edit freely — descriptions, services, and rumors are plain text.
// position = [x, z] world coordinates of the building center.

export const locations = [
  {
    id: 'stonehill-inn',
    name: 'Stonehill Inn',
    position: [-10, -12],
    interior: 'inn',
    blurb: 'A modest, newly built inn at the heart of town.',
    description: [
      'Fresh-cut timber and fieldstone walls mark this inn as one of the newest buildings in Phandalin. The taproom is warm and low-ceilinged, smelling of woodsmoke and good stew, and most evenings half the town drifts through to trade gossip.',
      'Toblen Stonehill keeps the place with his wife Trilena and their young son Pip. Six small rooms upstairs are clean, if spartan.',
    ],
    whoIsHere: [
      'Toblen Stonehill — the soft-spoken innkeeper',
      'Trilena Stonehill — his wife, the better cook and sharper wit',
      'Pip Stonehill — their boy, in and out underfoot',
      'A handful of farmers and miners at the tables',
    ],
    services: [
      'Room for the night — 5 sp',
      'Hearty meal — 1 sp',
      'Mug of ale — 4 cp',
    ],
    rumors: [
      'Miners swear a banshee wails in the woods near Conyberry.',
      'Nobody will say it above a whisper, but the red-cloaked toughs at the east end of town have folk scared.',
      "Pip's friend Carp claims he found something hidden near the old manor hill.",
    ],
  },
  {
    id: 'barthens-provisions',
    name: "Barthen's Provisions",
    position: [18, -12],
    blurb: 'The biggest trading post in town, open dawn to dusk.',
    description: [
      'Shelves and barrels crowd every wall of this long timber building: rope, lanterns, flour, pickaxes, salt pork, and most anything else a miner or traveler could want. What Barthen\'s doesn\'t stock, it can order up from Neverwinter — eventually.',
      'Elmar Barthen, a lean and balding shopkeep with an easy manner, runs the place with his young clerks Ander and Thistle.',
    ],
    whoIsHere: [
      'Elmar Barthen — proprietor',
      'Ander and Thistle — his clerks, stacking crates',
    ],
    services: [
      'Common adventuring gear and supplies at fair prices',
      'No weapons or armor — Barthen will point you to the Lionshield Coster',
    ],
    rumors: [
      'Barthen is fretting over a supply wagon from Neverwinter that should have arrived days ago.',
      'He remembers the old stories: the lost Phandelver mine made this town rich, once, before the orcs burned it all.',
    ],
  },
  {
    id: 'lionshield-coster',
    name: 'Lionshield Coster',
    position: [-24, 4],
    blurb: 'Arms and armor under the sign of the blue lion.',
    description: [
      'A blue wooden shield painted with a lion hangs over the door of this trading post, the local branch of a merchant company out of Yartar. Racks of spears, swords, shields, and hauberks line the walls — honest steel at honest prices.',
      'Linene Graywind, the sharp-eyed master of the post, sizes up every customer before she sells them so much as a dagger.',
    ],
    whoIsHere: [
      'Linene Graywind — master of the trading post',
    ],
    services: [
      'Simple weapons, armor, and shields for sale',
      'Linene refuses to arm anyone she suspects of being a troublemaker',
    ],
    rumors: [
      'The Coster lost a whole shipment on the Triboar Trail recently — bandits, most likely. Linene would pay well for news of crates marked with a blue lion.',
    ],
  },
  {
    id: 'miners-exchange',
    name: "Phandalin Miner's Exchange",
    position: [14, 32],
    blurb: 'Where prospectors weigh their finds and file their claims.',
    description: [
      'Scales, strongboxes, and ledgers fill this sturdy building by the south road. Prospectors come here to have ore assayed, dust weighed, and finds turned into coin without the long haul to the city.',
      'In a town with no lord and no laws to speak of, the Exchange also serves as the closest thing to a records office. Its guildmaster, Halia Thornton, is an ambitious woman who misses very little of what happens in Phandalin.',
    ],
    whoIsHere: [
      'Halia Thornton — guildmaster of the Exchange',
      'A few dusty prospectors waiting at the scales',
    ],
    services: [
      'Ore and gem assays, fair weights, honest coin',
      'Witnessing of claims and contracts',
    ],
    rumors: [
      'Halia always seems to know more than she lets on, and capable visitors tend to receive interesting offers.',
      'Some of the smaller claims to the east have been abandoned — their owners scared off, folk say.',
    ],
  },
  {
    id: 'alderleaf-farm',
    name: 'Alderleaf Farm',
    position: [-38, 36],
    blurb: 'A tidy halfling farmstead on the southwest edge of town.',
    description: [
      'A snug cottage, a weathered barn, and neat rows of vegetables make up this halfling farm. Chickens scratch in the yard and a wagon sits half-loaded by the gate.',
      'Qelline Alderleaf has farmed here for years and knows everyone in town and most of their business. Her son Carp has a talent for turning up where he shouldn\'t be.',
    ],
    whoIsHere: [
      'Qelline Alderleaf — halfling farmer, wise and welcoming',
      'Carp Alderleaf — her ten-year-old son, would-be adventurer',
    ],
    services: [
      'A warm meal and a night in the hayloft for polite travelers',
      'Sound advice about the town and the lands around it',
    ],
    rumors: [
      'Carp brags he found a secret way into the brush near the old manor hill — and that a red-cloaked man chased him off.',
      "Qelline's cousin Reidoth, a druid, knows every trail and ruin for fifty miles, and was last headed to Thundertree.",
    ],
  },
  {
    id: 'shrine-of-luck',
    name: 'Shrine of Luck',
    position: [4, -26],
    blurb: "Phandalin's only temple — a small shrine of Tymora.",
    description: [
      'A simple stone shrine stands at the edge of the town square, dressed with candles and small offerings. It is sacred to Tymora, Lady Luck, the goddess of good fortune — a sensible patron for miners and adventurers alike.',
      'The shrine is tended by Sister Garaele, a zealous young elf who came to Phandalin more recently than most.',
    ],
    whoIsHere: [
      'Sister Garaele — elf acolyte of Tymora',
    ],
    services: [
      'Healing for the wounded, in exchange for a modest offering',
      'Blessings of the Lady before a dangerous venture',
    ],
    rumors: [
      'Sister Garaele seeks brave souls for a delicate errand involving Agatha, a banshee said to haunt a grove near Conyberry.',
      'She seems unusually well informed for a village acolyte.',
    ],
  },
  {
    id: 'sleeping-giant',
    name: 'The Sleeping Giant',
    position: [40, 12],
    interior: 'giant',
    blurb: 'A rundown, dirty taproom at the east end of town.',
    description: [
      'The Sleeping Giant leans like it has had a few too many of its own ales. Inside, the floor is sticky, the light is bad, and the welcome is worse.',
      'The tap is kept by Grista, a surly dwarf who serves cheap ale to a clientele of hard-eyed men in grubby scarlet cloaks. Decent townsfolk drink at the Stonehill Inn instead.',
    ],
    whoIsHere: [
      'Grista — the foul-tempered dwarf barkeep',
      'Several Redbrand ruffians, drinking and glaring',
    ],
    services: [
      'Watery ale — 1 cp, served with a scowl',
    ],
    rumors: [
      'The red-cloaked ruffians — "Redbrands," folk call them — treat the Giant as their own private clubhouse.',
      'They swagger around town after dark, shaking down shopkeepers, and the Townmaster does nothing.',
    ],
  },
  {
    id: 'townmasters-hall',
    name: "Townmaster's Hall",
    position: [12, 6],
    blurb: 'The seat of what passes for government in Phandalin.',
    description: [
      'A sturdy stone-and-timber hall on the town square, with a small jail in the cellar and a notice board by the door. Phandalin has no lord; it elects a townmaster to keep records and keep the peace.',
      'The current townmaster is Harbin Wester, a plump, aging banker who treats every problem as either exaggerated or somebody else\'s.',
    ],
    whoIsHere: [
      'Harbin Wester — townmaster, banker, and dedicated avoider of trouble',
    ],
    services: [
      'Records, permits, and official complaints (filed, then ignored)',
    ],
    rumors: [
      'The notice board offers a reward: orcs have been raiding along the Triboar Trail near Wyvern Tor, and the town will pay to have them dealt with.',
      'Harbin insists the red-cloaked "lads" are harmless. He says it without meeting your eyes.',
    ],
  },
  {
    id: 'tresendar-manor',
    name: 'Tresendar Manor',
    position: [78, -14],
    blurb: 'A ruined manor brooding on the hill east of town.',
    description: [
      'Broken walls and empty windows crown the wooded hillside east of Phandalin. Tresendar Manor was old when the orcs sacked this valley centuries ago, and nothing but crows has lived in it since — officially, anyway.',
      'The cellars are said to remain beneath the ruin, cut deep into the rock. Townsfolk keep their distance.',
    ],
    whoIsHere: [],
    services: [],
    rumors: [
      'Locals say the ruin is haunted, and that lights have been seen among the stones after dark.',
      'Red-cloaked figures have been spotted on the hill at night. Nobody has been curious enough to follow them. Nobody healthy, anyway.',
    ],
  },
  {
    id: 'edermath-orchard',
    name: 'Edermath Orchard',
    position: [-48, -42],
    blurb: 'Neat rows of apple trees beside a small cottage.',
    description: [
      'Apple trees stand in disciplined ranks beside a modest cottage on the northwest edge of town. The orchard is the work of Daran Edermath, a silver-haired half-elf with the bearing of an old soldier — which is exactly what he is.',
      'Daran served as a marshal in the Dragon Coast lands for decades before retiring to grow apples. He still notices everything that happens in Phandalin.',
    ],
    whoIsHere: [
      'Daran Edermath — orchardist, retired marshal and adventurer',
    ],
    services: [
      'Crisp apples, free to polite visitors',
      'Sober advice from a man who has seen real trouble before',
    ],
    rumors: [
      'Daran has no patience for the Redbrands and quietly hopes someone will put some fear into them.',
      'Prospectors tell him someone has been digging around the ruins at Old Owl Well — and that the dead walk there. He thinks it warrants a look by capable folk.',
    ],
  },
];

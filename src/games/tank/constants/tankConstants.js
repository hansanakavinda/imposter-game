/**
 * Tank Arena Constants & Configuration
 * 1v1 and 2v2 tactical open battlefield top-down shooter
 */

export const ARENA_WIDTH = 1000
export const ARENA_HEIGHT = 650

export const TANK_RADIUS = 16
export const TANK_SPEED = 2.4
export const TANK_REVERSE_SPEED = 1.4
export const TANK_TURN_SPEED = 0.052
export const TANK_MUD_SPEED_MULT = 0.52
export const TANK_MAX_HP = 3

export const BULLET_RADIUS = 3.5
export const BULLET_SPEED = 5.2
export const BULLET_LIFETIME_MS = 6500

// Floor on the hold-to-fire interval, so a very short cooldown cannot spin
// the timer faster than the UI can keep up with.
export const MIN_AUTOFIRE_INTERVAL_MS = 120

// Floating joystick feel. The two sticks deliberately differ: the aim stick is
// a little less twitchy than the move stick.
export const MOVE_DEADZONE_PX = 8
export const AIM_DEADZONE_PX = 10

// A quick flick of the aim stick fires one aimed shot instead of holding.
export const FLICK_MAX_MS = 320
export const FLICK_MIN_DIST_PX = 16

export const TARGET_SCORE_DEFAULT = 3

export const MODES = {
  '1v1': {
    id: '1v1',
    label: '1 v 1 Duel',
    description: 'Quick 1 on 1 showdown across devices',
    maxPlayers: 2,
    teamSize: 1,
    slots: [
      { id: 'p1', team: 'blue', label: 'Blue Tank' },
      { id: 'p2', team: 'red', label: 'Red Tank' },
    ],
  },
  '2v2': {
    id: '2v2',
    label: '2 v 2 Squad',
    description: 'Cooperative tactical team battle',
    maxPlayers: 4,
    teamSize: 2,
    slots: [
      { id: 'p1', team: 'blue', label: 'Blue Tank 1 (Lead)' },
      { id: 'p2', team: 'blue', label: 'Blue Tank 2 (Wing)' },
      { id: 'p3', team: 'red', label: 'Red Tank 1 (Lead)' },
      { id: 'p4', team: 'red', label: 'Red Tank 2 (Wing)' },
    ],
  },
}

export const TEAMS = {
  blue: {
    id: 'blue',
    name: 'Team Blue',
    color: '#06b6d4', // Cyan 500
    darkColor: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.7)',
    badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    primaryBg: 'bg-cyan-500',
    text: 'text-cyan-400',
    // Lobby roster column. Full literal class strings so Tailwind's scanner
    // sees them, matching the three fields above.
    lobbyBaseLabel: 'West Base',
    lobbyJoinLabel: 'Join Blue',
    lobbyPanel: 'border-cyan-500/30',
    lobbyDivider: 'border-cyan-500/20',
    lobbyDot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
    lobbySelfSlot: 'bg-cyan-950/40 border-cyan-500/60',
    lobbyOpenSlot: 'hover:border-cyan-500/40',
    lobbyAvatar: 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20',
    lobbyYouBadge: 'bg-cyan-500/20 text-cyan-300',
    lobbyJoinBtn: 'text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20',
  },
  red: {
    id: 'red',
    name: 'Team Red',
    color: '#f43f5e', // Rose 500
    darkColor: '#e11d48',
    glow: 'rgba(244, 63, 94, 0.7)',
    badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    primaryBg: 'bg-rose-500',
    text: 'text-rose-400',
    lobbyBaseLabel: 'East Base',
    lobbyJoinLabel: 'Join Red',
    lobbyPanel: 'border-rose-500/30',
    lobbyDivider: 'border-rose-500/20',
    // Note: red's dot is shade 500 where blue's is 400, and red's avatar sits
    // on white where blue's sits on zinc-950. Both predate this merge and are
    // preserved deliberately -- restyling is the UI pass's call, not this one's.
    lobbyDot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    lobbySelfSlot: 'bg-rose-950/40 border-rose-500/60',
    lobbyOpenSlot: 'hover:border-rose-500/40',
    lobbyAvatar: 'bg-rose-500 text-white shadow-md shadow-rose-500/20',
    lobbyYouBadge: 'bg-rose-500/20 text-rose-300',
    lobbyJoinBtn: 'text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20',
  },
}

export const TERRAIN_TYPES = {
  STEEL: 'steel',     // Indestructible solid bunker, stops bullets
  BRICK: 'brick',     // Destructible (HP: 2), shatters when shot
  BUSH: 'bush',       // Stealth tall grass (tanks inside are hidden to enemy)
  WATER: 'water',     // Impassable for tanks, bullets pass over
  MUD: 'mud',         // Slows tanks down, leaves deep tracks
  BARREL: 'barrel',   // Red explosive fuel barrel (AOE blast when shot)
}

export const WEAPON_TYPES = {
  STANDARD: {
    id: 'standard',
    name: 'Standard Shell',
    cooldownMs: 500,
    speed: BULLET_SPEED,
    maxBounces: 0,
    damage: 1,
    color: '#fbbf24', // Amber
  },
  LASER: {
    id: 'laser',
    name: 'Laser Railgun',
    cooldownMs: 1100,
    speed: 12.0,
    maxBounces: 0,
    damage: 1,
    color: '#a855f7', // Purple
  },
  ROCKET: {
    id: 'rocket',
    name: 'Heavy Rocket',
    cooldownMs: 1000,
    speed: 4.2,
    maxBounces: 0,
    blastRadius: 55,
    damage: 2,
    color: '#f97316', // Orange
  },
  SHOTGUN: {
    id: 'shotgun',
    name: 'Triple Spread',
    cooldownMs: 800,
    speed: 4.8,
    maxBounces: 0,
    pellets: 3,
    damage: 1,
    color: '#38bdf8', // Sky
  },
  SHIELD: {
    id: 'shield',
    name: 'Armor Shield',
    color: '#10b981', // Emerald
  },
}

export const CRATE_DROP_INTERVAL_MS = 22000
export const CRATE_SIZE = 24

export const TANK_TYPES = {
  striker: {
    id: 'striker',
    name: 'Striker',
    role: 'Assault',
    icon: '⚔️',
    tagline: 'Balanced All-Rounder',
    description: 'Versatile combatant with balanced mobility, 3 HP armor, and standard cannon fire rate.',
    maxHp: 3,
    speed: 2.4,
    reverseSpeed: 1.4,
    turnSpeed: 0.052,
    radius: 16,
    cooldownMs: 480,
    bulletSpeed: 5.4,
    bulletRadius: 3.5,
    bulletColor: '#fbbf24', // Amber
    stats: {
      hp: 3,
      speed: 3,
      fireRate: 3,
      range: 3,
    },
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    role: 'Juggernaut',
    icon: '🛡️',
    tagline: 'Fortified 4 HP Armor',
    description: 'Heavily armored juggernaut boasting 4 HP and heavy cannon shells. Slower hull movement.',
    maxHp: 4,
    speed: 1.85,
    reverseSpeed: 1.1,
    turnSpeed: 0.040,
    radius: 18,
    cooldownMs: 640,
    bulletSpeed: 4.8,
    bulletRadius: 4.4,
    bulletColor: '#f97316', // Orange
    stats: {
      hp: 4,
      speed: 1,
      fireRate: 2,
      range: 2,
    },
    accentColor: 'text-orange-400',
    borderColor: 'border-orange-500/50',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  specter: {
    id: 'specter',
    name: 'Specter',
    role: 'Scout',
    icon: '⚡',
    tagline: 'High-Speed Autocannon',
    description: 'Extremely agile speedster with rapid-fire autocannon. High skill ceiling with fragile 2 HP.',
    maxHp: 2,
    speed: 3.1,
    reverseSpeed: 1.8,
    turnSpeed: 0.066,
    radius: 14.5,
    cooldownMs: 330,
    bulletSpeed: 6.0,
    bulletRadius: 3.0,
    bulletColor: '#38bdf8', // Sky Cyan
    stats: {
      hp: 2,
      speed: 4,
      fireRate: 4,
      range: 3,
    },
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/50',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  ballista: {
    id: 'ballista',
    name: 'Ballista',
    role: 'Sniper',
    icon: '🎯',
    tagline: 'High-Velocity Railgun',
    description: 'Long-barrel precision sniper firing high-velocity shells across the arena. Longer reload.',
    maxHp: 3,
    speed: 2.1,
    reverseSpeed: 1.25,
    turnSpeed: 0.046,
    radius: 16,
    cooldownMs: 740,
    bulletSpeed: 7.6,
    bulletRadius: 3.5,
    bulletColor: '#c084fc', // Violet
    stats: {
      hp: 3,
      speed: 2,
      fireRate: 1,
      range: 4,
    },
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
}

export const DEFAULT_TANK_TYPE = 'striker'


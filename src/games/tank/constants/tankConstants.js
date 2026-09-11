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

export const BULLET_RADIUS = 3.5
export const BULLET_SPEED = 5.2
export const BULLET_MAX_BOUNCES = 0
export const BULLET_LIFETIME_MS = 6500

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
    damage: 1,
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

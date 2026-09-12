import { describe, it, expect } from 'vitest'
import {
  buildRoundWorld,
  toSnapshot,
  effectiveWeapon,
  fireFromTank,
  stepWorld,
  EVENTS,
} from './tankSimulation'
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TERRAIN_TYPES,
  TANK_TYPES,
  CRATE_DROP_INTERVAL_MS,
} from '../constants/tankConstants'

// --- fixtures ---------------------------------------------------------------

/** Fixed clock for every test, so cooldowns and lifetimes are deterministic. */
const NOW = 10000

const tank = (overrides = {}) => ({
  id: 'p1',
  slotId: 'p1',
  name: 'P1',
  team: 'blue',
  tankType: 'striker',
  x: 500,
  y: 300,
  angle: 0,
  turretAngle: 0,
  hp: 3,
  maxHp: 3,
  speed: 2.4,
  reverseSpeed: 1.4,
  turnSpeed: 0.052,
  radius: 16,
  cooldownMs: 480,
  bulletSpeed: 5.4,
  bulletRadius: 3.5,
  bulletColor: '#fbbf24',
  isAlive: true,
  shield: false,
  weapon: 'STANDARD',
  lastFiredAt: 0,
  ...overrides,
})

const bullet = (overrides = {}) => ({
  id: 'b1',
  x: 500,
  y: 300,
  vx: 5,
  vy: 0,
  radius: 3.5,
  damage: 1,
  color: '#fff',
  team: 'blue',
  ownerSlotId: 'p1',
  // fired this tick; a stale createdAt would expire the shell on lifetime before it
  // ever reached a collision check
  createdAt: NOW,
  ...overrides,
})

const world = (overrides = {}) => ({
  tanks: [],
  bullets: [],
  obstacles: [],
  barrels: [],
  crates: [],
  pings: [],
  score: { blue: 0, red: 0 },
  roundStatus: 'playing',
  roundWinner: null,
  mapIndex: 0,
  lastCrateDropAt: 1000,
  ...overrides,
})

const step = (w, opts = {}) => stepWorld(w, { now: NOW, ...opts })
const typesOf = (events) => events.map((e) => e.type)

// --- world construction -----------------------------------------------------

describe('buildRoundWorld', () => {
  const players = [
    { slotId: 'p1', name: 'Alice', tankType: 'titan' },
    { slotId: 'p2', name: 'Bob', tankType: 'specter' },
  ]

  it('spawns one tank per seated player with their class stats', () => {
    const w = buildRoundWorld({ mode: '1v1', players, score: { blue: 0, red: 0 } })

    expect(w.tanks).toHaveLength(2)
    expect(w.tanks[0]).toMatchObject({
      slotId: 'p1',
      name: 'Alice',
      team: 'blue',
      maxHp: TANK_TYPES.titan.maxHp,
      speed: TANK_TYPES.titan.speed,
      isAlive: true,
    })
    expect(w.tanks[1]).toMatchObject({ team: 'red', maxHp: TANK_TYPES.specter.maxHp })
  })

  it('leaves empty slots empty rather than spawning ghosts', () => {
    const w = buildRoundWorld({ mode: '2v2', players, score: { blue: 0, red: 0 } })
    expect(w.tanks.map((t) => t.slotId)).toEqual(['p1', 'p2'])
  })

  it('falls back to the default class for an unknown tankType', () => {
    const w = buildRoundWorld({
      mode: '1v1',
      players: [{ slotId: 'p1', name: 'X', tankType: 'nonsense' }],
      score: { blue: 0, red: 0 },
    })
    expect(w.tanks[0].maxHp).toBe(TANK_TYPES.striker.maxHp)
  })

  it('spawns both teams inside the arena and apart from each other', () => {
    const w = buildRoundWorld({ mode: '1v1', players, score: { blue: 0, red: 0 } })
    for (const t of w.tanks) {
      expect(t.x).toBeGreaterThan(0)
      expect(t.x).toBeLessThan(ARENA_WIDTH)
      expect(t.y).toBeGreaterThan(0)
      expect(t.y).toBeLessThan(ARENA_HEIGHT)
    }
    expect(Math.abs(w.tanks[0].x - w.tanks[1].x)).toBeGreaterThan(100)
  })

  it('carries the running score into the new round', () => {
    const w = buildRoundWorld({ mode: '1v1', players, score: { blue: 2, red: 1 } })
    expect(w.score).toEqual({ blue: 2, red: 1 })
    expect(w.roundStatus).toBe('playing')
    expect(w.bullets).toEqual([])
  })
})

describe('toSnapshot', () => {
  it('carries everything a client renders', () => {
    const w = world({ tanks: [tank()], score: { blue: 1, red: 0 } })
    expect(Object.keys(toSnapshot(w)).sort()).toEqual(
      ['barrels', 'bullets', 'crates', 'obstacles', 'roundStatus', 'roundWinner', 'score', 'tanks'].sort()
    )
  })
})

// --- weapons ----------------------------------------------------------------

describe('effectiveWeapon', () => {
  it('uses the tank class when no crate weapon is held', () => {
    expect(effectiveWeapon(tank({ tankType: 'specter', cooldownMs: 330 }))).toMatchObject({
      cooldownMs: 330,
      damage: 1,
      pellets: 1,
    })
  })

  it('lets a crate weapon override the class', () => {
    const w = effectiveWeapon(tank({ tankType: 'specter', weapon: 'ROCKET' }))
    expect(w.cooldownMs).toBe(1000)
    expect(w.damage).toBe(2)
  })

  it('reports the shotgun spread', () => {
    expect(effectiveWeapon(tank({ weapon: 'SHOTGUN' })).pellets).toBe(3)
  })
})

describe('fireFromTank', () => {
  it('spawns a shell in front of the barrel, moving where the turret points', () => {
    const w = world({ tanks: [tank({ turretAngle: 0 })] })
    const next = fireFromTank(w, 'p1', 0, NOW)

    expect(next.bullets).toHaveLength(1)
    expect(next.bullets[0].x).toBeGreaterThan(500)
    expect(next.bullets[0].vx).toBeCloseTo(TANK_TYPES.striker.bulletSpeed)
    expect(next.bullets[0].vy).toBeCloseTo(0)
    expect(next.bullets[0].team).toBe('blue')
  })

  it('stamps lastFiredAt, which drives both the cooldown and the bush reveal', () => {
    const next = fireFromTank(world({ tanks: [tank()] }), 'p1', 0, NOW)
    expect(next.tanks[0].lastFiredAt).toBe(NOW)
  })

  it('refuses a shot that is still on cooldown', () => {
    const w = world({ tanks: [tank({ lastFiredAt: NOW - 100, cooldownMs: 480 })] })
    expect(fireFromTank(w, 'p1', 0, NOW)).toBeNull()
  })

  it('allows the shot once the cooldown has elapsed', () => {
    const w = world({ tanks: [tank({ lastFiredAt: NOW - 500, cooldownMs: 480 })] })
    expect(fireFromTank(w, 'p1', 0, NOW)).not.toBeNull()
  })

  it('honours the faster crate cooldown', () => {
    const w = world({ tanks: [tank({ weapon: 'LASER', lastFiredAt: NOW - 900 })] })
    expect(fireFromTank(w, 'p1', 0, NOW)).toBeNull() // laser is 1100ms
  })

  it('refuses to fire for a dead or unknown tank', () => {
    expect(fireFromTank(world({ tanks: [tank({ isAlive: false })] }), 'p1', 0, NOW)).toBeNull()
    expect(fireFromTank(world({ tanks: [tank()] }), 'p9', 0, NOW)).toBeNull()
  })

  it('throws three pellets for a shotgun', () => {
    const w = world({ tanks: [tank({ weapon: 'SHOTGUN' })] })
    const next = fireFromTank(w, 'p1', 0, NOW)
    expect(next.bullets).toHaveLength(3)
    expect(new Set(next.bullets.map((b) => b.id)).size).toBe(3)
  })

  it('derives damage from the host tank, not from anything a caller passes', () => {
    const w = world({ tanks: [tank({ weapon: 'ROCKET' })] })
    expect(fireFromTank(w, 'p1', 0, NOW).bullets[0].damage).toBe(2)
  })

  it('falls back to the tank turret when given a nonsense angle', () => {
    const w = world({ tanks: [tank({ turretAngle: Math.PI })] })
    const next = fireFromTank(w, 'p1', Number.NaN, NOW)
    expect(next.bullets[0].vx).toBeLessThan(0)
  })
})

// --- the tick ---------------------------------------------------------------

describe('stepWorld', () => {
  it('does nothing between rounds', () => {
    const w = world({ tanks: [tank()], roundStatus: 'round_win' })
    const { world: next, events } = step(w)
    expect(next).toBe(w)
    expect(events).toEqual([])
  })

  it('does nothing with no tanks', () => {
    const { events } = step(world())
    expect(events).toEqual([])
  })

  it('never mutates the world it was given', () => {
    const original = world({ tanks: [tank()], bullets: [bullet()] })
    const snapshot = JSON.stringify(original)
    step(original, { localSlotId: 'p1', localInput: { forward: true } })
    expect(JSON.stringify(original)).toBe(snapshot)
  })
})

describe('movement', () => {
  it('drives the local tank forward on keyboard input', () => {
    const w = world({ tanks: [tank({ angle: 0 })] })
    const { world: next } = step(w, { localSlotId: 'p1', localInput: { forward: true } })
    expect(next.tanks[0].x).toBeGreaterThan(500)
  })

  it('reverses more slowly than it drives', () => {
    const forward = step(world({ tanks: [tank()] }), {
      localSlotId: 'p1',
      localInput: { forward: true },
    }).world.tanks[0].x
    const back = step(world({ tanks: [tank()] }), {
      localSlotId: 'p1',
      localInput: { reverse: true },
    }).world.tanks[0].x

    expect(forward - 500).toBeGreaterThan(500 - back)
  })

  it('steers with the keyboard', () => {
    const { world: next } = step(world({ tanks: [tank({ angle: 0 })] }), {
      localSlotId: 'p1',
      localInput: { steerLeft: true },
    })
    expect(next.tanks[0].angle).toBeLessThan(0)
  })

  it('drives a remote tank from the input its owner last sent', () => {
    const w = world({ tanks: [tank({ slotId: 'p2', id: 'p2', remoteInput: { forward: true } })] })
    const { world: next } = step(w, { localSlotId: 'p1' })
    expect(next.tanks[0].x).toBeGreaterThan(500)
  })

  it('leaves a destroyed tank where it fell', () => {
    const w = world({ tanks: [tank({ isAlive: false })] })
    const { world: next } = step(w, { localSlotId: 'p1', localInput: { forward: true } })
    expect(next.tanks[0].x).toBe(500)
  })

  it('slows a tank crossing mud', () => {
    const mud = {
      id: 'm1',
      type: TERRAIN_TYPES.MUD,
      x: 400,
      y: 250,
      width: 200,
      height: 100,
    }
    const clean = step(world({ tanks: [tank()] }), {
      localSlotId: 'p1',
      localInput: { forward: true },
    }).world.tanks[0].x
    const slowed = step(world({ tanks: [tank()], obstacles: [mud] }), {
      localSlotId: 'p1',
      localInput: { forward: true },
    }).world.tanks[0].x

    expect(slowed).toBeLessThan(clean)
  })

  it('aims the turret from the input', () => {
    const { world: next } = step(world({ tanks: [tank()] }), {
      localSlotId: 'p1',
      localInput: { turretAngle: 1.5 },
    })
    expect(next.tanks[0].turretAngle).toBe(1.5)
  })
})

describe('bullets', () => {
  it('advances by its velocity each tick', () => {
    const { world: next } = step(world({ tanks: [tank()], bullets: [bullet({ x: 100, vx: 5, vy: 0 })] }))
    expect(next.bullets[0].x).toBe(105)
  })

  it('vanishes at the arena edge', () => {
    const w = world({ tanks: [tank()], bullets: [bullet({ x: ARENA_WIDTH - 4, vx: 5 })] })
    const { world: next, events } = step(w)
    expect(next.bullets).toHaveLength(0)
    expect(typesOf(events)).toContain(EVENTS.RICOCHET)
  })

  it('expires after its lifetime', () => {
    const w = world({ tanks: [tank()], bullets: [bullet({ x: 100, createdAt: NOW - 99999 })] })
    expect(step(w).world.bullets).toHaveLength(0)
  })

  it('stops on steel without damaging it', () => {
    const steel = { id: 's1', type: TERRAIN_TYPES.STEEL, x: 100, y: 90, width: 40, height: 40 }
    const w = world({ tanks: [tank()], bullets: [bullet({ x: 95, y: 110, vx: 5, vy: 0 })], obstacles: [steel] })
    const { world: next } = step(w)

    expect(next.bullets).toHaveLength(0)
    expect(next.obstacles[0]).toEqual(steel)
  })

  it('knocks a hit point off brick and returns a new obstacle array', () => {
    const brick = { id: 'b1', type: TERRAIN_TYPES.BRICK, x: 100, y: 90, width: 40, height: 40, hp: 2, maxHp: 2 }
    const w = world({ tanks: [tank()], bullets: [bullet({ x: 95, y: 110, vx: 5, vy: 0 })], obstacles: [brick] })
    const { world: next } = step(w)

    expect(next.obstacles[0].hp).toBe(1)
    // the caller relies on identity changing to know it must re-render
    expect(next.obstacles).not.toBe(w.obstacles)
    expect(brick.hp).toBe(2)
  })

  it('passes straight through rubble and water', () => {
    const rubble = { id: 'b1', type: TERRAIN_TYPES.BRICK, x: 100, y: 90, width: 40, height: 40, hp: 0 }
    const water = { id: 'w1', type: TERRAIN_TYPES.WATER, x: 100, y: 90, width: 40, height: 40 }
    const w = world({
      tanks: [tank()],
      bullets: [bullet({ x: 95, y: 110, vx: 5, vy: 0 })],
      obstacles: [rubble, water],
    })
    expect(step(w).world.bullets).toHaveLength(1)
  })

  it('damages an enemy tank', () => {
    const target = tank({ id: 'p2', slotId: 'p2', team: 'red', x: 600, y: 300 })
    const w = world({ tanks: [tank(), target], bullets: [bullet({ x: 585, y: 300, vx: 5, vy: 0 })] })
    const { world: next, events } = step(w)

    expect(next.tanks[1].hp).toBe(2)
    expect(next.bullets).toHaveLength(0)
    expect(typesOf(events)).toContain(EVENTS.RICOCHET)
  })

  it('passes through a teammate', () => {
    const mate = tank({ id: 'p2', slotId: 'p2', team: 'blue', x: 600, y: 300 })
    const w = world({ tanks: [tank(), mate], bullets: [bullet({ x: 585, y: 300, vx: 5, vy: 0 })] })
    const { world: next } = step(w)

    expect(next.tanks[1].hp).toBe(3)
    expect(next.bullets).toHaveLength(1)
  })

  it('lets a shield absorb one hit and then break', () => {
    const target = tank({ id: 'p2', slotId: 'p2', team: 'red', x: 600, y: 300, shield: true })
    const w = world({ tanks: [tank(), target], bullets: [bullet({ x: 585, y: 300, vx: 5, vy: 0 })] })
    const { world: next } = step(w)

    expect(next.tanks[1].hp).toBe(3)
    expect(next.tanks[1].shield).toBe(false)
  })

  it('destroys a tank on the killing blow', () => {
    const target = tank({ id: 'p2', slotId: 'p2', team: 'red', x: 600, y: 300, hp: 1 })
    const w = world({ tanks: [tank(), target], bullets: [bullet({ x: 585, y: 300, vx: 5, vy: 0 })] })
    const { world: next, events } = step(w)

    expect(next.tanks[1].isAlive).toBe(false)
    expect(next.tanks[1].hp).toBe(0)
    expect(typesOf(events)).toContain(EVENTS.TANK_DESTROYED)
  })

  it('applies the bullet damage value, so a rocket takes two hit points', () => {
    const target = tank({ id: 'p2', slotId: 'p2', team: 'red', x: 600, y: 300 })
    const w = world({
      tanks: [tank(), target],
      bullets: [bullet({ x: 585, y: 300, vx: 5, vy: 0, damage: 2 })],
    })
    expect(step(w).world.tanks[1].hp).toBe(1)
  })

  it('hits only one tank per shell', () => {
    const a = tank({ id: 'p2', slotId: 'p2', team: 'red', x: 600, y: 300 })
    const b = tank({ id: 'p3', slotId: 'p3', team: 'red', x: 604, y: 300 })
    const w = world({ tanks: [tank(), a, b], bullets: [bullet({ x: 585, y: 300, vx: 5, vy: 0 })] })
    const { world: next } = step(w)

    const damaged = next.tanks.filter((t) => t.hp < 3)
    expect(damaged).toHaveLength(1)
  })
})

describe('barrels', () => {
  const barrel = { id: 'bar1', type: TERRAIN_TYPES.BARREL, x: 600, y: 300, radius: 14, hp: 1 }

  it('detonates when shot and returns a new barrel array', () => {
    const w = world({ tanks: [tank()], bullets: [bullet({ x: 580, y: 300, vx: 5 })], barrels: [barrel] })
    const { world: next, events } = step(w)

    expect(next.barrels[0].hp).toBe(0)
    expect(next.barrels).not.toBe(w.barrels)
    expect(barrel.hp).toBe(1)
    expect(typesOf(events)).toContain(EVENTS.BARREL_EXPLOSION)
  })

  it('damages every tank in the blast, teammates included', () => {
    const mate = tank({ id: 'p2', slotId: 'p2', team: 'blue', x: 620, y: 300 })
    const enemy = tank({ id: 'p3', slotId: 'p3', team: 'red', x: 640, y: 300 })
    const w = world({
      tanks: [tank({ x: 200, y: 300 }), mate, enemy],
      bullets: [bullet({ x: 580, y: 300, vx: 5 })],
      barrels: [barrel],
    })
    const { world: next } = step(w)

    expect(next.tanks[1].hp).toBe(1) // 3 - 2
    expect(next.tanks[2].hp).toBe(1)
    expect(next.tanks[0].hp).toBe(3) // far away
  })

  it('is ignored once destroyed', () => {
    const spent = { ...barrel, hp: 0 }
    const w = world({ tanks: [tank()], bullets: [bullet({ x: 580, y: 300, vx: 5 })], barrels: [spent] })
    expect(step(w).world.bullets).toHaveLength(1)
  })
})

describe('crates', () => {
  const crate = (type) => ({ id: 'c1', x: 505, y: 300, type })

  it('gives the tank that drives over it the weapon', () => {
    const w = world({ tanks: [tank()], crates: [crate('ROCKET')] })
    const { world: next, events } = step(w, { localSlotId: 'p1', localInput: {} })

    expect(next.tanks[0].weapon).toBe('ROCKET')
    expect(next.crates).toHaveLength(0)
    expect(typesOf(events)).toContain(EVENTS.CRATE_PICKUP)
  })

  it('raises a shield rather than changing the weapon', () => {
    const w = world({ tanks: [tank({ weapon: 'LASER' })], crates: [crate('SHIELD')] })
    const { world: next } = step(w, { localSlotId: 'p1', localInput: {} })

    expect(next.tanks[0].shield).toBe(true)
    expect(next.tanks[0].weapon).toBe('LASER')
  })

  it('leaves a crate nobody reached', () => {
    const w = world({ tanks: [tank({ x: 100 })], crates: [crate('LASER')] })
    expect(step(w, { localSlotId: 'p1', localInput: {} }).world.crates).toHaveLength(1)
  })

  it('is not collected by a destroyed tank', () => {
    const w = world({ tanks: [tank({ isAlive: false })], crates: [crate('LASER')] })
    expect(step(w, { localSlotId: 'p1', localInput: {} }).world.crates).toHaveLength(1)
  })

  it('drops a new crate once the interval elapses', () => {
    const w = world({ tanks: [tank({ x: 100 })], lastCrateDropAt: NOW - CRATE_DROP_INTERVAL_MS - 1 })
    const { world: next } = step(w, { localSlotId: 'p1', localInput: {} })

    expect(next.crates).toHaveLength(1)
    expect(next.lastCrateDropAt).toBe(NOW)
  })

  it('does not drop before the interval elapses', () => {
    const w = world({ tanks: [tank({ x: 100 })], lastCrateDropAt: NOW - 1000 })
    expect(step(w, { localSlotId: 'p1', localInput: {} }).world.crates).toHaveLength(0)
  })
})

describe('round win', () => {
  const blue = () => tank({ id: 'p1', slotId: 'p1', team: 'blue', x: 200, y: 300 })
  const red = (overrides) => tank({ id: 'p2', slotId: 'p2', team: 'red', x: 600, y: 300, ...overrides })

  it('is awarded when the last enemy dies', () => {
    const w = world({
      tanks: [blue(), red({ hp: 1 })],
      bullets: [bullet({ x: 585, y: 300, vx: 5 })],
    })
    const { world: next, events } = step(w)

    expect(next.roundStatus).toBe('round_win')
    expect(next.roundWinner).toBe('blue')
    expect(next.score).toEqual({ blue: 1, red: 0 })
    expect(events.find((e) => e.type === EVENTS.ROUND_WIN)).toMatchObject({ winner: 'blue' })
  })

  it('holds the round open while both teams still have someone standing', () => {
    const mate = tank({ id: 'p3', slotId: 'p3', team: 'red', x: 300, y: 300 })
    const w = world({ tanks: [blue(), red({ hp: 1 }), mate], bullets: [bullet({ x: 585, y: 300, vx: 5 })] })
    expect(step(w).world.roundStatus).toBe('playing')
  })

  it('adds to the running score rather than replacing it', () => {
    const w = world({
      tanks: [blue(), red({ hp: 1 })],
      bullets: [bullet({ x: 585, y: 300, vx: 5 })],
      score: { blue: 1, red: 2 },
    })
    expect(step(w).world.score).toEqual({ blue: 2, red: 2 })
  })

  it('is not awarded in a one-sided world, which is how the lobby looks', () => {
    const w = world({ tanks: [blue()] })
    expect(step(w, { localSlotId: 'p1', localInput: {} }).world.roundStatus).toBe('playing')
  })
})

/**
 * Tank Arena world simulation.
 *
 * Pure: no React, no network, no audio, no timers. `stepWorld` takes a world and the
 * inputs for this tick and returns a brand new world plus the events that happened,
 * which the host translates into sounds and broadcasts.
 *
 * Only the host runs this. Clients render the snapshots it produces.
 */

import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_RADIUS,
  TANK_SPEED,
  TANK_REVERSE_SPEED,
  TANK_TURN_SPEED,
  TANK_MUD_SPEED_MULT,
  TANK_MAX_HP,
  BULLET_RADIUS,
  BULLET_LIFETIME_MS,
  TERRAIN_TYPES,
  WEAPON_TYPES,
  TANK_TYPES,
  DEFAULT_TANK_TYPE,
  MODES,
  CRATE_DROP_INTERVAL_MS,
  CRATE_SIZE,
} from '../constants/tankConstants'
import { getBattlefieldMap, getSpawnPoints } from '../utils/tankTerrain'
import { moveTankWithCollision, isTankInMud, testCircleRect } from '../utils/tankPhysics'

/** Barrel blast radius, in world units. */
const BARREL_BLAST_RADIUS = 75
/** Damage a barrel deals to everything in range, friend or foe. */
const BARREL_DAMAGE = 2
/** Crates only drop in the middle of the arena, away from spawns. */
const CRATE_DROP_BOUNDS = { x: 350, width: 300, y: 150, height: 350 }
const CRATE_WEAPONS = ['LASER', 'ROCKET', 'SHOTGUN', 'SHIELD']

export const EVENTS = {
  RICOCHET: 'RICOCHET',
  BARREL_EXPLOSION: 'BARREL_EXPLOSION',
  TANK_DESTROYED: 'TANK_DESTROYED',
  CRATE_PICKUP: 'CRATE_PICKUP',
  ROUND_WIN: 'ROUND_WIN',
}

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

/** An empty world: what the lobby and a freshly left room hold. */
export function createEmptyWorld() {
  return {
    tanks: [],
    bullets: [],
    obstacles: [],
    barrels: [],
    crates: [],
    score: { blue: 0, red: 0 },
    roundStatus: 'playing',
    roundWinner: null,
    mapIndex: 0,
    lastCrateDropAt: Date.now(),
  }
}

/**
 * Build the world for one round: spawn every seated player on their mark and lay out
 * the map for `mapIndex`.
 */
export function buildRoundWorld({ mode, players, mapIndex = 0, score, now = Date.now() }) {
  const map = getBattlefieldMap(mapIndex)
  const spawns = getSpawnPoints(mode)
  const modeConfig = MODES[mode] || MODES['1v1']

  const tanks = []
  modeConfig.slots.forEach((slot) => {
    const player = players.find((p) => p.slotId === slot.id)
    if (!player) return

    const config = TANK_TYPES[player.tankType] || TANK_TYPES[DEFAULT_TANK_TYPE]
    const spawn = spawns[slot.id] || { x: 100, y: 300, angle: 0 }

    tanks.push({
      id: slot.id,
      slotId: slot.id,
      name: player.name,
      team: slot.team,
      tankType: player.tankType || DEFAULT_TANK_TYPE,
      x: spawn.x,
      y: spawn.y,
      angle: spawn.angle,
      turretAngle: spawn.angle,
      hp: config.maxHp,
      maxHp: config.maxHp,
      speed: config.speed,
      reverseSpeed: config.reverseSpeed,
      turnSpeed: config.turnSpeed,
      radius: config.radius,
      cooldownMs: config.cooldownMs,
      bulletSpeed: config.bulletSpeed,
      bulletRadius: config.bulletRadius,
      bulletColor: config.bulletColor,
      isAlive: true,
      shield: false,
      weapon: 'STANDARD',
      lastFiredAt: 0,
    })
  })

  return {
    tanks,
    bullets: [],
    obstacles: map.obstacles,
    barrels: map.barrels,
    crates: [],
    pings: [],
    score: score || { blue: 0, red: 0 },
    roundStatus: 'playing',
    roundWinner: null,
    mapIndex,
    lastCrateDropAt: now,
  }
}

/** The state a client needs to render; sent every tick as WORLD_STATE. */
export function toSnapshot(world) {
  return {
    tanks: world.tanks,
    bullets: world.bullets,
    obstacles: world.obstacles,
    barrels: world.barrels,
    crates: world.crates,
    score: world.score,
    roundStatus: world.roundStatus,
    roundWinner: world.roundWinner,
  }
}

// ---------------------------------------------------------------------------
// Firing
// ---------------------------------------------------------------------------

/** The weapon stats actually in force for a tank: a held crate weapon wins. */
export function effectiveWeapon(tank) {
  const classConfig = TANK_TYPES[tank.tankType] || TANK_TYPES[DEFAULT_TANK_TYPE]
  const crate = tank.weapon && tank.weapon !== 'STANDARD' ? WEAPON_TYPES[tank.weapon] : null

  if (crate) {
    return {
      cooldownMs: crate.cooldownMs,
      speed: crate.speed,
      radius: tank.weapon === 'ROCKET' ? 5.5 : BULLET_RADIUS,
      damage: crate.damage || (tank.weapon === 'ROCKET' ? 2 : 1),
      color: crate.color,
      pellets: crate.pellets || 1,
    }
  }

  return {
    cooldownMs: tank.cooldownMs || classConfig.cooldownMs,
    speed: tank.bulletSpeed || classConfig.bulletSpeed,
    radius: tank.bulletRadius || classConfig.bulletRadius,
    damage: 1,
    color: tank.bulletColor || classConfig.bulletColor,
    pellets: 1,
  }
}

/**
 * Fire from a tank the host owns the record for.
 *
 * Everything - muzzle position, velocity, damage, team - is derived from the host's own
 * tank, so a client can only ask *that* it fires and in which direction. The per-tank
 * cooldown is enforced here, which is what makes the rate limit authoritative rather
 * than a client-side courtesy.
 *
 * Returns null when the shot is refused (dead tank, unknown slot, still reloading).
 */
export function fireFromTank(world, slotId, turretAngle, now = Date.now()) {
  const tank = world.tanks.find((t) => t.slotId === slotId)
  if (!tank || !tank.isAlive) return null

  const weapon = effectiveWeapon(tank)
  if (now - (tank.lastFiredAt || 0) < weapon.cooldownMs) return null

  const aim = Number.isFinite(turretAngle) ? turretAngle : tank.turretAngle || 0
  const radius = tank.radius || TANK_RADIUS
  const muzzleX = tank.x + Math.cos(aim) * (radius + 12)
  const muzzleY = tank.y + Math.sin(aim) * (radius + 12)

  // A shotgun throws three pellets in a fixed spread; everything else fires one shell.
  const spread = weapon.pellets > 1 ? [-0.18, 0, 0.18] : [0]
  const bullets = spread.map((offset, index) => {
    const angle = aim + offset
    return {
      id: `bullet_${slotId}_${now}_${index}`,
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      radius: weapon.radius,
      damage: weapon.damage,
      color: weapon.color,
      team: tank.team,
      ownerSlotId: slotId,
      createdAt: now,
    }
  })

  return {
    ...world,
    bullets: [...world.bullets, ...bullets],
    // lastFiredAt drives both the cooldown and the 2.2s bush reveal.
    tanks: world.tanks.map((t) => (t.slotId === slotId ? { ...t, lastFiredAt: now, turretAngle: aim } : t)),
  }
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/** Resolve one tank's input into a new heading and position. */
function moveTank(tank, input, obstacles, barrels, allTanks) {
  const speedMult = isTankInMud(tank, obstacles) ? TANK_MUD_SPEED_MULT : 1.0
  const turnSpeed = tank.turnSpeed || TANK_TURN_SPEED
  const moveSpeed = tank.speed || TANK_SPEED
  const reverseSpeed = tank.reverseSpeed || TANK_REVERSE_SPEED

  let angle = tank.angle
  let targetX = tank.x
  let targetY = tank.y

  if (input.isMoving && input.moveAngle !== undefined && input.moveAngle !== null) {
    // Virtual joystick: steer toward the stick direction, and drive faster the better
    // the hull is already lined up with it.
    const diff = Math.atan2(Math.sin(input.moveAngle - angle), Math.cos(input.moveAngle - angle))
    if (Math.abs(diff) > 0.05) {
      angle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * 1.5)
    }
    const alignment = Math.max(0, Math.cos(diff))
    const speed = moveSpeed * speedMult * (input.moveMagnitude || 1.0) * (0.35 + 0.65 * alignment)
    targetX += Math.cos(angle) * speed
    targetY += Math.sin(angle) * speed
  } else {
    // Keyboard: tank-style turn-then-drive.
    if (input.steerLeft) angle -= turnSpeed
    if (input.steerRight) angle += turnSpeed
    if (input.forward) {
      targetX += Math.cos(angle) * moveSpeed * speedMult
      targetY += Math.sin(angle) * moveSpeed * speedMult
    } else if (input.reverse) {
      targetX -= Math.cos(angle) * reverseSpeed * speedMult
      targetY -= Math.sin(angle) * reverseSpeed * speedMult
    }
  }

  const resolved = moveTankWithCollision(tank, targetX, targetY, obstacles, barrels, allTanks)
  return {
    ...tank,
    x: resolved.x,
    y: resolved.y,
    angle,
    turretAngle: input.turretAngle ?? tank.turretAngle ?? angle,
  }
}

/** Apply damage to a tank, letting a shield absorb the hit instead. */
function damageTank(tank, amount) {
  if (tank.shield) return { tank: { ...tank, shield: false }, destroyed: false }

  const currentHp = tank.hp !== undefined ? tank.hp : tank.maxHp || TANK_MAX_HP
  const nextHp = Math.max(0, currentHp - amount)
  if (nextHp <= 0) {
    return { tank: { ...tank, hp: 0, isAlive: false }, destroyed: true }
  }
  return { tank: { ...tank, hp: nextHp }, destroyed: false }
}

const NO_INPUT = {
  forward: false,
  reverse: false,
  steerLeft: false,
  steerRight: false,
  isMoving: false,
}

/**
 * Advance the world by one tick.
 *
 * `localSlotId` / `localInput` are the host's own controls; every other tank is driven
 * by the `remoteInput` last received from its owner.
 */
export function stepWorld(world, { localSlotId, localInput, now = Date.now() } = {}) {
  if (world.roundStatus !== 'playing' || !world.tanks.length) {
    return { world, events: [] }
  }

  const events = []

  // 1. Movement -------------------------------------------------------------
  let tanks = world.tanks.map((tank) => {
    if (!tank.isAlive) return tank
    const input = tank.slotId === localSlotId ? localInput || NO_INPUT : tank.remoteInput || NO_INPUT
    return moveTank(tank, input, world.obstacles, world.barrels, world.tanks)
  })

  // 2. Crate pickups --------------------------------------------------------
  const crates = []
  for (const crate of world.crates) {
    const collector = tanks.find((t) => {
      if (!t.isAlive) return false
      const reach = (t.radius || TANK_RADIUS) + CRATE_SIZE / 2
      const dx = t.x - crate.x
      const dy = t.y - crate.y
      return dx * dx + dy * dy < reach * reach
    })

    if (!collector) {
      crates.push(crate)
      continue
    }

    events.push({ type: EVENTS.CRATE_PICKUP, slotId: collector.slotId, crateType: crate.type })
    tanks = tanks.map((t) => {
      if (t.id !== collector.id) return t
      return crate.type === 'SHIELD' ? { ...t, shield: true } : { ...t, weapon: crate.type }
    })
  }

  // 3. Crate drops ----------------------------------------------------------
  let lastCrateDropAt = world.lastCrateDropAt
  if (now - lastCrateDropAt > CRATE_DROP_INTERVAL_MS) {
    lastCrateDropAt = now
    crates.push({
      id: `crate_${now}`,
      x: CRATE_DROP_BOUNDS.x + Math.random() * CRATE_DROP_BOUNDS.width,
      y: CRATE_DROP_BOUNDS.y + Math.random() * CRATE_DROP_BOUNDS.height,
      type: CRATE_WEAPONS[Math.floor(Math.random() * CRATE_WEAPONS.length)],
    })
  }

  // 4. Bullets --------------------------------------------------------------
  // Obstacles and barrels are copied rather than mutated, so a damaged wall produces a
  // new array and consumers relying on reference identity actually see the change.
  let obstacles = world.obstacles
  let barrels = world.barrels
  const bullets = []

  for (const bullet of world.bullets) {
    const bx = bullet.x + bullet.vx
    const by = bullet.y + bullet.vy
    let destroyed = false

    // Arena bounds
    if (
      bx <= BULLET_RADIUS ||
      bx >= ARENA_WIDTH - BULLET_RADIUS ||
      by <= BULLET_RADIUS ||
      by >= ARENA_HEIGHT - BULLET_RADIUS
    ) {
      destroyed = true
      events.push({ type: EVENTS.RICOCHET })
    }

    // Steel stops shells; brick stops them and loses a hit point.
    if (!destroyed) {
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i]
        const isSolid =
          obs.type === TERRAIN_TYPES.STEEL ||
          (obs.type === TERRAIN_TYPES.BRICK && (obs.hp || 0) > 0)
        if (!isSolid) continue

        if (testCircleRect(bx, by, bullet.radius, obs.x, obs.y, obs.width, obs.height).collided) {
          destroyed = true
          events.push({ type: EVENTS.RICOCHET })
          if (obs.type === TERRAIN_TYPES.BRICK) {
            obstacles = obstacles.map((o, idx) => (idx === i ? { ...o, hp: o.hp - 1 } : o))
          }
          break
        }
      }
    }

    // Barrels detonate, hurting everything nearby regardless of team.
    if (!destroyed) {
      for (let i = 0; i < barrels.length; i++) {
        const barrel = barrels[i]
        if (barrel.hp <= 0) continue

        const dx = bx - barrel.x
        const dy = by - barrel.y
        const reach = bullet.radius + barrel.radius
        if (dx * dx + dy * dy >= reach * reach) continue

        destroyed = true
        barrels = barrels.map((b, idx) => (idx === i ? { ...b, hp: 0 } : b))
        events.push({ type: EVENTS.BARREL_EXPLOSION, x: barrel.x, y: barrel.y })

        tanks = tanks.map((t) => {
          if (!t.isAlive) return t
          const tdx = t.x - barrel.x
          const tdy = t.y - barrel.y
          if (tdx * tdx + tdy * tdy >= BARREL_BLAST_RADIUS * BARREL_BLAST_RADIUS) return t

          const { tank: hit, destroyed: died } = damageTank(t, BARREL_DAMAGE)
          if (died) events.push({ type: EVENTS.TANK_DESTROYED, slotId: t.slotId })
          return hit
        })
        break
      }
    }

    // Enemy tanks
    if (!destroyed) {
      let hit = false
      tanks = tanks.map((t) => {
        if (hit || !t.isAlive || t.team === bullet.team) return t

        const reach = bullet.radius + (t.radius || TANK_RADIUS)
        const dx = bx - t.x
        const dy = by - t.y
        if (dx * dx + dy * dy >= reach * reach) return t

        hit = true
        const { tank: damaged, destroyed: died } = damageTank(t, bullet.damage || 1)
        events.push(
          died ? { type: EVENTS.TANK_DESTROYED, slotId: t.slotId } : { type: EVENTS.RICOCHET }
        )
        return damaged
      })
      if (hit) destroyed = true
    }

    if (bullet.createdAt && now - bullet.createdAt > BULLET_LIFETIME_MS) {
      destroyed = true
    }

    if (!destroyed) {
      bullets.push({ ...bullet, x: bx, y: by })
    }
  }

  // 5. Round win ------------------------------------------------------------
  let roundStatus = world.roundStatus
  let roundWinner = world.roundWinner
  let score = world.score

  const hasBlue = tanks.some((t) => t.team === 'blue')
  const hasRed = tanks.some((t) => t.team === 'red')
  if (hasBlue && hasRed) {
    const blueAlive = tanks.some((t) => t.team === 'blue' && t.isAlive)
    const redAlive = tanks.some((t) => t.team === 'red' && t.isAlive)

    if (!blueAlive || !redAlive) {
      const winner = blueAlive ? 'blue' : redAlive ? 'red' : null
      if (winner) {
        roundStatus = 'round_win'
        roundWinner = winner
        score = { ...score, [winner]: (score[winner] || 0) + 1 }
        events.push({ type: EVENTS.ROUND_WIN, winner, score })
      }
    }
  }

  return {
    world: {
      ...world,
      tanks,
      bullets,
      obstacles,
      barrels,
      crates,
      lastCrateDropAt,
      roundStatus,
      roundWinner,
      score,
    },
    events,
  }
}

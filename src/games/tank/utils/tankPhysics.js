import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_RADIUS,
  TERRAIN_TYPES,
} from '../constants/tankConstants'

/**
 * Circle vs Rectangle collision test with contact normal
 */
export function testCircleRect(cx, cy, radius, rx, ry, rw, rh) {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rx, Math.min(cx, rx + rw))
  const closestY = Math.max(ry, Math.min(cy, ry + rh))

  const dx = cx - closestX
  const dy = cy - closestY
  const distSq = dx * dx + dy * dy

  if (distSq < radius * radius) {
    const dist = Math.sqrt(distSq) || 0.0001
    // Normal pointing outward from rectangle to circle center
    let nx = dx / dist
    let ny = dy / dist

    // If circle center is inside rect, choose closest edge normal
    if (distSq === 0) {
      const leftDist = cx - rx
      const rightDist = rx + rw - cx
      const topDist = cy - ry
      const bottomDist = ry + rh - cy
      const minDist = Math.min(leftDist, rightDist, topDist, bottomDist)
      if (minDist === leftDist) nx = -1
      else if (minDist === rightDist) nx = 1
      else if (minDist === topDist) ny = -1
      else ny = 1
    }

    return {
      collided: true,
      normal: { x: nx, y: ny },
      depth: radius - dist,
      closestX,
      closestY,
    }
  }

  return { collided: false }
}

/**
 * Check if tank center is inside a bush area
 */
export function isPointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

/**
 * Check if a tank is in mud (reduces speed)
 */
export function isTankInMud(tank, obstacles) {
  for (const obs of obstacles) {
    if (obs.type === TERRAIN_TYPES.MUD) {
      if (isPointInRect(tank.x, tank.y, obs.x, obs.y, obs.width, obs.height)) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if a tank is hidden in bushes from the perspective of an opponent
 */
export function isTankHiddenFrom(targetTank, observerTank, obstacles) {
  // If target recently fired within 2.2 seconds, they are revealed
  if (Date.now() - (targetTank.lastFiredAt || 0) < 2200) {
    return false
  }

  // Find if target tank is currently inside any bush
  for (const obs of obstacles) {
    if (obs.type === TERRAIN_TYPES.BUSH) {
      if (isPointInRect(targetTank.x, targetTank.y, obs.x, obs.y, obs.width, obs.height)) {
        // If observer is also in the exact same bush, target is spotted!
        if (
          observerTank &&
          isPointInRect(observerTank.x, observerTank.y, obs.x, obs.y, obs.width, obs.height)
        ) {
          return false
        }
        return true
      }
    }
  }
  return false
}

/**
 * Slide tank along obstacles smoothly
 */
export function moveTankWithCollision(tank, targetX, targetY, obstacles, barrels, allTanks = []) {
  let newX = targetX
  let newY = targetY

  // 1. Clamp to Arena Boundaries
  newX = Math.max(TANK_RADIUS + 4, Math.min(ARENA_WIDTH - TANK_RADIUS - 4, newX))
  newY = Math.max(TANK_RADIUS + 4, Math.min(ARENA_HEIGHT - TANK_RADIUS - 4, newY))

  // 2. Resolve collisions against solid obstacles (STEEL, BRICK, WATER)
  for (const obs of obstacles) {
    if (
      obs.type === TERRAIN_TYPES.STEEL ||
      (obs.type === TERRAIN_TYPES.BRICK && (obs.hp || 0) > 0) ||
      obs.type === TERRAIN_TYPES.WATER
    ) {
      const col = testCircleRect(newX, newY, TANK_RADIUS, obs.x, obs.y, obs.width, obs.height)
      if (col.collided) {
        newX += col.normal.x * col.depth
        newY += col.normal.y * col.depth
      }
    }
  }

  // 3. Resolve collisions against barrels
  if (barrels) {
    for (const barrel of barrels) {
      if (barrel.hp > 0) {
        const dx = newX - barrel.x
        const dy = newY - barrel.y
        const minDist = TANK_RADIUS + barrel.radius
        const distSq = dx * dx + dy * dy
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001
          const push = minDist - dist
          newX += (dx / dist) * push
          newY += (dy / dist) * push
        }
      }
    }
  }

  // 4. Resolve collisions against other alive tanks
  if (allTanks) {
    for (const other of allTanks) {
      if (other.id !== tank.id && other.isAlive) {
        const dx = newX - other.x
        const dy = newY - other.y
        const minDist = TANK_RADIUS * 2
        const distSq = dx * dx + dy * dy
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001
          const push = minDist - dist
          newX += (dx / dist) * push
          newY += (dy / dist) * push
        }
      }
    }
  }

  return { x: newX, y: newY }
}

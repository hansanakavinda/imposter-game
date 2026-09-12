import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  testCircleRect,
  isPointInRect,
  isTankInMud,
  isTankHiddenFrom,
  moveTankWithCollision,
} from './tankPhysics'
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_RADIUS,
  TERRAIN_TYPES,
} from '../constants/tankConstants'

const rect = (type, x, y, width, height, extra = {}) => ({
  id: `${type}-${x}-${y}`,
  type,
  x,
  y,
  width,
  height,
  ...extra,
})

const tank = (x, y, extra = {}) => ({
  id: 'p1',
  slotId: 'p1',
  team: 'blue',
  x,
  y,
  isAlive: true,
  ...extra,
})

describe('testCircleRect', () => {
  it('reports no collision when the circle is clear of the rectangle', () => {
    expect(testCircleRect(0, 0, 5, 100, 100, 50, 50).collided).toBe(false)
  })

  it('reports no collision when the circle just grazes past the edge', () => {
    // rect spans x 100-150; a radius-5 circle centred at x=94 stops 1px short
    expect(testCircleRect(94, 125, 5, 100, 100, 50, 50).collided).toBe(false)
  })

  it('detects an overlap and points the normal away from the rectangle', () => {
    const hit = testCircleRect(96, 125, 10, 100, 100, 50, 50)
    expect(hit.collided).toBe(true)
    expect(hit.normal.x).toBeCloseTo(-1)
    expect(hit.normal.y).toBeCloseTo(0)
    expect(hit.depth).toBeCloseTo(6)
  })

  it('reports the closest point on the rectangle', () => {
    const hit = testCircleRect(96, 125, 10, 100, 100, 50, 50)
    expect(hit.closestX).toBe(100)
    expect(hit.closestY).toBe(125)
  })

  it('pushes out through the nearest edge when the centre is inside', () => {
    // centred at (105, 125) inside x 100-150, y 100-150: the left edge is nearest
    const hit = testCircleRect(105, 125, 10, 100, 100, 50, 50)
    expect(hit.collided).toBe(true)
    expect(hit.normal.x).toBe(-1)
  })

  it('picks the top edge when the centre sits nearest the top', () => {
    const hit = testCircleRect(125, 104, 10, 100, 100, 50, 50)
    expect(hit.collided).toBe(true)
    expect(hit.normal.y).toBe(-1)
  })

  it('detects a corner overlap diagonally', () => {
    const hit = testCircleRect(97, 97, 10, 100, 100, 50, 50)
    expect(hit.collided).toBe(true)
    expect(hit.normal.x).toBeLessThan(0)
    expect(hit.normal.y).toBeLessThan(0)
  })
})

describe('isPointInRect', () => {
  it('includes the boundary', () => {
    expect(isPointInRect(100, 100, 100, 100, 50, 50)).toBe(true)
    expect(isPointInRect(150, 150, 100, 100, 50, 50)).toBe(true)
  })

  it('excludes points outside', () => {
    expect(isPointInRect(99, 125, 100, 100, 50, 50)).toBe(false)
    expect(isPointInRect(125, 151, 100, 100, 50, 50)).toBe(false)
  })
})

describe('isTankInMud', () => {
  const mud = rect(TERRAIN_TYPES.MUD, 100, 100, 80, 80)

  it('is true when the tank centre is in a mud patch', () => {
    expect(isTankInMud(tank(120, 120), [mud])).toBe(true)
  })

  it('is false when the centre is outside, even if the hull would overlap', () => {
    expect(isTankInMud(tank(95, 120), [mud])).toBe(false)
  })

  it('ignores non-mud terrain in the same place', () => {
    expect(isTankInMud(tank(120, 120), [rect(TERRAIN_TYPES.WATER, 100, 100, 80, 80)])).toBe(false)
  })

  it('is false with no obstacles', () => {
    expect(isTankInMud(tank(120, 120), [])).toBe(false)
  })
})

describe('isTankHiddenFrom', () => {
  const bush = rect(TERRAIN_TYPES.BUSH, 100, 100, 100, 100)
  const inBush = (extra) => tank(150, 150, extra)

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides a tank sitting in a bush from a distant observer', () => {
    expect(isTankHiddenFrom(inBush(), tank(500, 500), [bush])).toBe(true)
  })

  it('does not hide a tank standing outside any bush', () => {
    expect(isTankHiddenFrom(tank(500, 500), tank(600, 600), [bush])).toBe(false)
  })

  it('reveals a tank that fired within the last 2.2 seconds', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const firedRecently = inBush({ lastFiredAt: Date.now() - 1000 })
    expect(isTankHiddenFrom(firedRecently, tank(500, 500), [bush])).toBe(false)
  })

  it('re-hides a tank once the reveal window has elapsed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const firedLongAgo = inBush({ lastFiredAt: Date.now() - 3000 })
    expect(isTankHiddenFrom(firedLongAgo, tank(500, 500), [bush])).toBe(true)
  })

  it('spots a tank when the observer is in the same bush', () => {
    expect(isTankHiddenFrom(inBush(), tank(110, 110), [bush])).toBe(false)
  })

  it('still hides a tank when the observer is in a different bush', () => {
    const otherBush = rect(TERRAIN_TYPES.BUSH, 600, 600, 100, 100)
    expect(isTankHiddenFrom(inBush(), tank(650, 650), [bush, otherBush])).toBe(true)
  })

  it('hides from a null observer, which is how teammates are rendered', () => {
    expect(isTankHiddenFrom(inBush(), null, [bush])).toBe(true)
  })
})

describe('moveTankWithCollision', () => {
  const margin = TANK_RADIUS + 4

  it('lets a tank move freely across open ground', () => {
    const result = moveTankWithCollision(tank(500, 300), 520, 310, [], [], [])
    expect(result).toEqual({ x: 520, y: 310 })
  })

  it('clamps to the arena on every side', () => {
    expect(moveTankWithCollision(tank(50, 300), -100, 300, [], [], []).x).toBe(margin)
    expect(moveTankWithCollision(tank(50, 300), 300, -100, [], [], []).y).toBe(margin)
    expect(moveTankWithCollision(tank(950, 300), 9999, 300, [], [], []).x).toBe(
      ARENA_WIDTH - margin
    )
    expect(moveTankWithCollision(tank(500, 600), 500, 9999, [], [], []).y).toBe(
      ARENA_HEIGHT - margin
    )
  })

  it('pushes a tank out of a steel bunker', () => {
    const steel = rect(TERRAIN_TYPES.STEEL, 400, 200, 100, 100)
    // approach from the left; the hull should end up clear of x = 400
    const result = moveTankWithCollision(tank(370, 250), 395, 250, [steel], [], [])
    expect(result.x).toBeLessThanOrEqual(400 - TANK_RADIUS + 0.001)
  })

  it('blocks water, which stops tanks but not bullets', () => {
    const water = rect(TERRAIN_TYPES.WATER, 400, 200, 100, 100)
    const result = moveTankWithCollision(tank(370, 250), 395, 250, [water], [], [])
    expect(result.x).toBeLessThanOrEqual(400 - TANK_RADIUS + 0.001)
  })

  it('blocks intact brick but drives straight through rubble', () => {
    const intact = rect(TERRAIN_TYPES.BRICK, 400, 200, 100, 100, { hp: 2, maxHp: 2 })
    const rubble = rect(TERRAIN_TYPES.BRICK, 400, 200, 100, 100, { hp: 0, maxHp: 2 })

    expect(moveTankWithCollision(tank(370, 250), 395, 250, [intact], [], []).x).toBeLessThan(395)
    expect(moveTankWithCollision(tank(370, 250), 395, 250, [rubble], [], [])).toEqual({
      x: 395,
      y: 250,
    })
  })

  it('drives through bushes and mud without resistance', () => {
    const soft = [
      rect(TERRAIN_TYPES.BUSH, 400, 200, 100, 100),
      rect(TERRAIN_TYPES.MUD, 400, 200, 100, 100),
    ]
    expect(moveTankWithCollision(tank(400, 250), 450, 250, soft, [], [])).toEqual({
      x: 450,
      y: 250,
    })
  })

  it('separates a tank from an intact barrel', () => {
    const barrel = { id: 'b1', x: 500, y: 300, radius: 14, hp: 1 }
    const result = moveTankWithCollision(tank(480, 300), 495, 300, [], [barrel], [])
    const gap = Math.hypot(result.x - barrel.x, result.y - barrel.y)
    expect(gap).toBeGreaterThanOrEqual(TANK_RADIUS + barrel.radius - 0.001)
  })

  it('ignores a destroyed barrel', () => {
    const wreck = { id: 'b1', x: 500, y: 300, radius: 14, hp: 0 }
    expect(moveTankWithCollision(tank(480, 300), 495, 300, [], [wreck], [])).toEqual({
      x: 495,
      y: 300,
    })
  })

  it('separates two tanks that would overlap', () => {
    const other = tank(500, 300, { id: 'p2', slotId: 'p2' })
    const result = moveTankWithCollision(tank(470, 300), 490, 300, [], [], [other])
    const gap = Math.hypot(result.x - other.x, result.y - other.y)
    expect(gap).toBeGreaterThanOrEqual(TANK_RADIUS * 2 - 0.001)
  })

  it('does not collide a tank with itself', () => {
    const self = tank(500, 300)
    expect(moveTankWithCollision(self, 520, 300, [], [], [self])).toEqual({ x: 520, y: 300 })
  })

  it('drives through the wreck of a destroyed tank', () => {
    const wreck = tank(500, 300, { id: 'p2', slotId: 'p2', isAlive: false })
    expect(moveTankWithCollision(tank(480, 300), 495, 300, [], [], [wreck])).toEqual({
      x: 495,
      y: 300,
    })
  })

  it('respects a per-tank radius override', () => {
    const titan = tank(470, 300, { radius: 18 })
    const other = tank(500, 300, { id: 'p2', radius: 18 })
    const result = moveTankWithCollision(titan, 490, 300, [], [], [other])
    expect(Math.hypot(result.x - other.x, result.y - other.y)).toBeGreaterThanOrEqual(36 - 0.001)
  })

  it('never returns NaN when a tank is exactly on top of a barrel', () => {
    const barrel = { id: 'b1', x: 500, y: 300, radius: 14, hp: 1 }
    const result = moveTankWithCollision(tank(500, 300), 500, 300, [], [barrel], [])
    expect(Number.isFinite(result.x)).toBe(true)
    expect(Number.isFinite(result.y)).toBe(true)
  })
})

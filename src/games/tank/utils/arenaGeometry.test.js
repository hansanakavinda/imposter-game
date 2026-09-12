import { describe, it, expect } from 'vitest'
import {
  getCanvasSize,
  getWorldTransform,
  worldToScreen,
  screenToWorld,
  clampToArena,
  pointerToWorld,
  PORTRAIT_ROTATION,
} from './arenaGeometry'
import { ARENA_WIDTH, ARENA_HEIGHT } from '../constants/tankConstants'

// Sampled across the arena, including all four corners and the edges.
const SAMPLES = []
for (let x = 0; x <= ARENA_WIDTH; x += 125) {
  for (let y = 0; y <= ARENA_HEIGHT; y += 65) {
    SAMPLES.push({ x, y })
  }
}

describe('arenaGeometry - round trip', () => {
  // This is the whole reason the module exists: a wrong inverse breaks aiming
  // silently instead of throwing.
  it('screenToWorld undoes worldToScreen in landscape', () => {
    for (const p of SAMPLES) {
      const s = worldToScreen(p.x, p.y, false)
      const back = screenToWorld(s.x, s.y, false)
      expect(back.x).toBeCloseTo(p.x, 9)
      expect(back.y).toBeCloseTo(p.y, 9)
    }
  })

  it('screenToWorld undoes worldToScreen in portrait', () => {
    for (const p of SAMPLES) {
      const s = worldToScreen(p.x, p.y, true)
      const back = screenToWorld(s.x, s.y, true)
      expect(back.x).toBeCloseTo(p.x, 9)
      expect(back.y).toBeCloseTo(p.y, 9)
    }
  })

  it('worldToScreen undoes screenToWorld in portrait (the other direction)', () => {
    for (const p of SAMPLES) {
      const w = screenToWorld(p.x, p.y, true)
      const back = worldToScreen(w.x, w.y, true)
      expect(back.x).toBeCloseTo(p.x, 9)
      expect(back.y).toBeCloseTo(p.y, 9)
    }
  })
})

describe('arenaGeometry - portrait mapping', () => {
  it('matches the canvas transform: (x, y) -> (y, ARENA_WIDTH - x)', () => {
    expect(worldToScreen(0, 0, true)).toEqual({ x: 0, y: ARENA_WIDTH })
    expect(worldToScreen(ARENA_WIDTH, 0, true)).toEqual({ x: 0, y: 0 })
    expect(worldToScreen(0, ARENA_HEIGHT, true)).toEqual({ x: ARENA_HEIGHT, y: ARENA_WIDTH })
    expect(worldToScreen(ARENA_WIDTH, ARENA_HEIGHT, true)).toEqual({ x: ARENA_HEIGHT, y: 0 })
  })

  it('is the identity in landscape', () => {
    expect(worldToScreen(123, 456, false)).toEqual({ x: 123, y: 456 })
    expect(screenToWorld(123, 456, false)).toEqual({ x: 123, y: 456 })
  })

  it('keeps every corner on the canvas', () => {
    const { width, height } = getCanvasSize(true)
    for (const p of [
      { x: 0, y: 0 },
      { x: ARENA_WIDTH, y: 0 },
      { x: 0, y: ARENA_HEIGHT },
      { x: ARENA_WIDTH, y: ARENA_HEIGHT },
    ]) {
      const s = worldToScreen(p.x, p.y, true)
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThanOrEqual(width)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThanOrEqual(height)
    }
  })
})

describe('arenaGeometry - canvas size and transform descriptor', () => {
  it('portrait is the world on its side', () => {
    expect(getCanvasSize(false)).toEqual({ width: ARENA_WIDTH, height: ARENA_HEIGHT })
    expect(getCanvasSize(true)).toEqual({ width: ARENA_HEIGHT, height: ARENA_WIDTH })
  })

  it('describes the transform the renderer applies, and nothing in landscape', () => {
    expect(getWorldTransform(false)).toBeNull()
    expect(getWorldTransform(true)).toEqual({
      translateX: 0,
      translateY: ARENA_WIDTH,
      rotate: PORTRAIT_ROTATION,
    })
  })

  it('the descriptor agrees with worldToScreen', () => {
    // Apply the descriptor by hand the way a 2D context would, and compare.
    const t = getWorldTransform(true)
    for (const p of SAMPLES) {
      const rx = p.x * Math.cos(t.rotate) - p.y * Math.sin(t.rotate)
      const ry = p.x * Math.sin(t.rotate) + p.y * Math.cos(t.rotate)
      const s = worldToScreen(p.x, p.y, true)
      expect(rx + t.translateX).toBeCloseTo(s.x, 9)
      expect(ry + t.translateY).toBeCloseTo(s.y, 9)
    }
  })
})

describe('arenaGeometry - clamping', () => {
  it('holds points inside the arena', () => {
    expect(clampToArena(-50, -50)).toEqual({ x: 0, y: 0 })
    expect(clampToArena(99999, 99999)).toEqual({ x: ARENA_WIDTH, y: ARENA_HEIGHT })
    expect(clampToArena(500, 300)).toEqual({ x: 500, y: 300 })
  })
})

describe('arenaGeometry - pointerToWorld', () => {
  const rect = (w, h) => ({ left: 0, top: 0, width: w, height: h })

  it('undoes CSS scaling in landscape', () => {
    // Canvas displayed at half size: a click at (250,162.5) is world (500,325).
    const p = pointerToWorld(250, 162.5, rect(ARENA_WIDTH / 2, ARENA_HEIGHT / 2), false)
    expect(p.x).toBeCloseTo(500, 6)
    expect(p.y).toBeCloseTo(325, 6)
  })

  it('undoes CSS scaling and rotation in portrait', () => {
    // Portrait canvas 650x1000 shown at natural size. Screen (0, ARENA_WIDTH)
    // is world origin.
    const p = pointerToWorld(0, ARENA_WIDTH, rect(ARENA_HEIGHT, ARENA_WIDTH), true)
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(0, 6)
  })

  it('accounts for the canvas offset on the page', () => {
    const r = { left: 100, top: 50, width: ARENA_WIDTH, height: ARENA_HEIGHT }
    const p = pointerToWorld(100 + 400, 50 + 200, r, false)
    expect(p.x).toBeCloseTo(400, 6)
    expect(p.y).toBeCloseTo(200, 6)
  })

  it('clamps a pointer dragged outside the canvas', () => {
    const p = pointerToWorld(-500, -500, rect(ARENA_WIDTH, ARENA_HEIGHT), false)
    expect(p).toEqual({ x: 0, y: 0 })
  })
})

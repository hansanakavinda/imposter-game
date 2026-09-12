import { describe, it, expect } from 'vitest'
import { computeFlightPath } from './drawFlightGeometry'

const rect = (left, top, width = 72, height = 96) => ({ left, top, width, height })
const VIEW = { viewportWidth: 1000, viewportHeight: 800 }

describe('computeFlightPath - origin', () => {
  it('starts at the centre of the draw pile, offset by half a card', () => {
    const { startX, startY } = computeFlightPath({
      drawRect: rect(400, 300), trayRect: rect(0, 700), count: 1, ...VIEW,
    })
    expect(startX).toBe(400 + 36 - 36)
    expect(startY).toBe(300 + 48 - 48)
  })

  it('falls back to the viewport centre when the pile has no rect yet', () => {
    const { startX, startY } = computeFlightPath({
      drawRect: null, trayRect: null, count: 1, ...VIEW,
    })
    expect(startX).toBe(500 - 36)
    expect(startY).toBe(400 - 48)
  })
})

describe('computeFlightPath - targets', () => {
  it('produces one target per drawn card', () => {
    const { targets } = computeFlightPath({
      drawRect: rect(400, 300), trayRect: rect(0, 700), count: 4, ...VIEW,
    })
    expect(targets).toHaveLength(4)
  })

  it('spaces cards 48px apart from the tray inset', () => {
    const { targets } = computeFlightPath({
      drawRect: rect(400, 300), trayRect: rect(100, 700), count: 3, ...VIEW,
    })
    expect(targets.map((t) => t.x)).toEqual([112, 160, 208])
  })

  it('lands every card on the tray top', () => {
    const { targets } = computeFlightPath({
      drawRect: rect(400, 300), trayRect: rect(100, 700), count: 3, ...VIEW,
    })
    expect(targets.every((t) => t.y === 704)).toBe(true)
  })

  it('clamps a long draw so late cards stay on screen', () => {
    // A +4 stack against a narrow viewport is the case this exists for.
    const { targets } = computeFlightPath({
      drawRect: rect(100, 100), trayRect: rect(0, 500), count: 10,
      viewportWidth: 400, viewportHeight: 800,
    })
    expect(targets.every((t) => t.x <= 400 - 85)).toBe(true)
    expect(targets[9].x).toBe(315)
  })

  it('uses the fallback tray position when the tray has no rect', () => {
    const { targets } = computeFlightPath({
      drawRect: rect(400, 300), trayRect: null, count: 2, ...VIEW,
    })
    expect(targets.map((t) => t.x)).toEqual([20, 68])
    expect(targets.every((t) => t.y === 800 - 130)).toBe(true)
  })

  it('returns no targets for a zero-card draw', () => {
    const { targets } = computeFlightPath({
      drawRect: rect(400, 300), trayRect: rect(0, 700), count: 0, ...VIEW,
    })
    expect(targets).toEqual([])
  })
})

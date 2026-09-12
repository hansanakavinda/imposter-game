import { describe, it, expect } from 'vitest'
import { resolveJoystick, JOYSTICK_MAX_RADIUS, PORTRAIT_ROTATION } from './joystickMath'

const base = { deadzone: 8, isPortrait: false }

describe('resolveJoystick - deadzone', () => {
  it('reports centred below the deadzone', () => {
    const r = resolveJoystick({ ...base, dx: 3, dy: 3 })
    expect(r.inDeadzone).toBe(true)
    expect(r.knobX).toBe(0)
    expect(r.knobY).toBe(0)
    expect(r.magnitude).toBe(0)
  })

  it('is exclusive at the boundary - exactly the deadzone is live', () => {
    expect(resolveJoystick({ ...base, dx: 8, dy: 0 }).inDeadzone).toBe(false)
    expect(resolveJoystick({ ...base, dx: 7.99, dy: 0 }).inDeadzone).toBe(true)
  })

  it('honours a different deadzone (the aim stick uses 10, the move stick 8)', () => {
    expect(resolveJoystick({ dx: 9, dy: 0, deadzone: 10 }).inDeadzone).toBe(true)
    expect(resolveJoystick({ dx: 9, dy: 0, deadzone: 8 }).inDeadzone).toBe(false)
  })
})

describe('resolveJoystick - knob travel', () => {
  it('clamps the knob to maxRadius but keeps the heading', () => {
    const r = resolveJoystick({ ...base, dx: 500, dy: 0 })
    expect(r.knobX).toBeCloseTo(JOYSTICK_MAX_RADIUS, 6)
    expect(r.knobY).toBeCloseTo(0, 6)
    expect(r.screenAngle).toBeCloseTo(0, 6)
  })

  it('does not clamp inside maxRadius', () => {
    const r = resolveJoystick({ ...base, dx: 20, dy: 0 })
    expect(r.knobX).toBeCloseTo(20, 6)
  })

  it('saturates magnitude at 1', () => {
    expect(resolveJoystick({ ...base, dx: 45, dy: 0 }).magnitude).toBeCloseTo(1, 6)
    expect(resolveJoystick({ ...base, dx: 9000, dy: 0 }).magnitude).toBe(1)
    expect(resolveJoystick({ ...base, dx: 22.5, dy: 0 }).magnitude).toBeCloseTo(0.5, 6)
  })

  it('keeps the knob on the circle of radius maxRadius when saturated', () => {
    const r = resolveJoystick({ ...base, dx: 300, dy: -300 })
    expect(Math.hypot(r.knobX, r.knobY)).toBeCloseTo(JOYSTICK_MAX_RADIUS, 6)
  })
})

describe('resolveJoystick - portrait correction', () => {
  it('leaves the angle alone in landscape', () => {
    const r = resolveJoystick({ ...base, dx: 0, dy: -50 })
    expect(r.worldAngle).toBeCloseTo(r.screenAngle, 10)
  })

  it('rotates by +PI/2 in portrait', () => {
    const r = resolveJoystick({ dx: 0, dy: -50, deadzone: 8, isPortrait: true })
    expect(r.worldAngle).toBeCloseTo(r.screenAngle + PORTRAIT_ROTATION, 10)
  })

  it('maps UP on a portrait screen to world heading 0 (towards +x)', () => {
    // This is the property the whole correction exists for.
    const r = resolveJoystick({ dx: 0, dy: -50, deadzone: 8, isPortrait: true })
    expect(r.worldAngle).toBeCloseTo(0, 10)
  })

  it('does not rotate the knob, only the world angle', () => {
    const land = resolveJoystick({ dx: 30, dy: 10, deadzone: 8, isPortrait: false })
    const port = resolveJoystick({ dx: 30, dy: 10, deadzone: 8, isPortrait: true })
    expect(port.knobX).toBeCloseTo(land.knobX, 10)
    expect(port.knobY).toBeCloseTo(land.knobY, 10)
    expect(port.screenAngle).toBeCloseTo(land.screenAngle, 10)
  })
})

describe('resolveJoystick - headings', () => {
  it('matches atan2 for the four cardinal directions', () => {
    expect(resolveJoystick({ ...base, dx: 50, dy: 0 }).screenAngle).toBeCloseTo(0, 10)
    expect(resolveJoystick({ ...base, dx: 0, dy: 50 }).screenAngle).toBeCloseTo(Math.PI / 2, 10)
    expect(resolveJoystick({ ...base, dx: 0, dy: -50 }).screenAngle).toBeCloseTo(-Math.PI / 2, 10)
    expect(Math.abs(resolveJoystick({ ...base, dx: -50, dy: 0 }).screenAngle)).toBeCloseTo(Math.PI, 10)
  })
})

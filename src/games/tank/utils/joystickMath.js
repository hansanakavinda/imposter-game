/**
 * Pure maths shared by both floating joysticks.
 *
 * The move stick and the aim stick ran identical copies of this: hypot for
 * distance, a deadzone, atan2 for heading, a clamp for the knob, and the
 * portrait correction. Keeping one copy is what stops the two drifting apart.
 */

export const JOYSTICK_MAX_RADIUS = 45

/**
 * Portrait draws the world rotated 90 degrees (see arena rendering), so UP on
 * screen is not UP in world space. Screen angles are rotated by this to match.
 */
export const PORTRAIT_ROTATION = Math.PI / 2

/**
 * @param {object}  p
 * @param {number}  p.dx          pointer offset from the stick origin, px
 * @param {number}  p.dy
 * @param {number}  p.deadzone    px below which the stick reads as centred
 * @param {boolean} p.isPortrait  apply the portrait rotation to worldAngle
 * @param {number} [p.maxRadius]  knob travel limit, px
 */
export function resolveJoystick({ dx, dy, deadzone, isPortrait = false, maxRadius = JOYSTICK_MAX_RADIUS }) {
  const distance = Math.hypot(dx, dy)

  if (distance < deadzone) {
    return {
      inDeadzone: true,
      distance,
      screenAngle: 0,
      worldAngle: 0,
      knobX: 0,
      knobY: 0,
      magnitude: 0,
    }
  }

  const screenAngle = Math.atan2(dy, dx)
  const clamped = Math.min(maxRadius, distance)

  return {
    inDeadzone: false,
    distance,
    screenAngle,
    worldAngle: isPortrait ? screenAngle + PORTRAIT_ROTATION : screenAngle,
    knobX: Math.cos(screenAngle) * clamped,
    knobY: Math.sin(screenAngle) * clamped,
    magnitude: Math.min(1, distance / maxRadius),
  }
}

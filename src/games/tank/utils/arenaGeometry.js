import { ARENA_WIDTH, ARENA_HEIGHT } from '../constants/tankConstants'

/**
 * Screen <-> world mapping for the arena canvas.
 *
 * Kept apart from tankPhysics.js on purpose: that module owns world-space
 * collision, this one owns how the world is projected onto a canvas.
 *
 * Portrait draws the same 1000x650 world rotated a quarter turn onto a 650x1000
 * canvas. The forward transform and its inverse used to be maintained by hand at
 * opposite ends of TankCanvas.jsx -- and because a wrong inverse silently breaks
 * aiming rather than throwing, drift between them was invisible. They live
 * together here, with a round-trip test binding them.
 *
 *   rotate(-PI/2) maps (x, y) -> (y, -x)
 *   translate(0, ARENA_WIDTH) then gives (y, ARENA_WIDTH - x)
 */
export const PORTRAIT_ROTATION = -Math.PI / 2

/** Canvas pixel dimensions for an orientation. Portrait is the world on its side. */
export function getCanvasSize(isPortrait) {
  return isPortrait
    ? { width: ARENA_HEIGHT, height: ARENA_WIDTH }
    : { width: ARENA_WIDTH, height: ARENA_HEIGHT }
}

/**
 * A descriptor rather than ctx calls, so this module stays pure and the caller
 * decides when to apply it. null means "no transform needed".
 */
export function getWorldTransform(isPortrait) {
  if (!isPortrait) return null
  return { translateX: 0, translateY: ARENA_WIDTH, rotate: PORTRAIT_ROTATION }
}

/** World point -> canvas point. */
export function worldToScreen(x, y, isPortrait) {
  if (!isPortrait) return { x, y }
  return { x: y, y: ARENA_WIDTH - x }
}

/** Canvas point -> world point. The exact inverse of worldToScreen. */
export function screenToWorld(screenX, screenY, isPortrait) {
  if (!isPortrait) return { x: screenX, y: screenY }
  return { x: ARENA_WIDTH - screenY, y: screenX }
}

/** Keep a world point inside the arena. */
export function clampToArena(x, y) {
  return {
    x: Math.max(0, Math.min(ARENA_WIDTH, x)),
    y: Math.max(0, Math.min(ARENA_HEIGHT, y)),
  }
}

/**
 * A pointer event's position in world coordinates.
 * `rect` is the canvas's getBoundingClientRect(), so CSS scaling is undone too.
 */
export function pointerToWorld(clientX, clientY, rect, isPortrait) {
  const { width, height } = getCanvasSize(isPortrait)
  const screenX = (clientX - rect.left) * (width / rect.width)
  const screenY = (clientY - rect.top) * (height / rect.height)
  const world = screenToWorld(screenX, screenY, isPortrait)
  return clampToArena(world.x, world.y)
}

import { ARENA_WIDTH, ARENA_HEIGHT } from '../constants/tankConstants'

/**
 * Background wash, tactical grid and the arena border.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */

/** Screen space: wipe the canvas before anything else. */
export function clearCanvas(ctx, { canvasWidth, canvasHeight }) {
  ctx.fillStyle = '#09090b' // Zinc 950
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
}

/** World space: the tactical grid and the arena border. */
export default function drawGround(ctx) {
  // Subtle tactical grid
  ctx.strokeStyle = '#18181b'
  ctx.lineWidth = 1
  const gridSize = 40
  ctx.beginPath()
  for (let x = 0; x <= ARENA_WIDTH; x += gridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, ARENA_HEIGHT)
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(ARENA_WIDTH, y)
  }
  ctx.stroke()

  // Arena Outer Border
  ctx.strokeStyle = '#27272a'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, ARENA_WIDTH - 4, ARENA_HEIGHT - 4)
}

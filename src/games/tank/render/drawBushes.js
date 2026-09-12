import { TERRAIN_TYPES } from '../constants/tankConstants'

/**
 * Tall grass, drawn over tanks so it can hide them.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawBushes(ctx, { obstacles }) {
  obstacles.forEach((obs) => {
    if (obs.type === TERRAIN_TYPES.BUSH) {
      ctx.fillStyle = 'rgba(20, 83, 45, 0.88)' // Green 900
      ctx.beginPath()
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 16)
      ctx.fill()

      ctx.strokeStyle = '#15803d' // Green 700
      ctx.lineWidth = 2
      ctx.stroke()

      // Foliage textures
      ctx.fillStyle = '#22c55e'
      for (let bx = obs.x + 15; bx < obs.x + obs.width - 15; bx += 25) {
        ctx.beginPath()
        ctx.arc(bx, obs.y + 16, 6, 0, Math.PI * 2)
        ctx.arc(bx + 8, obs.y + obs.height - 16, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

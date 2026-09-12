import { TERRAIN_TYPES } from '../constants/tankConstants'

/**
 * Steel bunkers and destructible brick.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawObstacles(ctx, { obstacles }) {
  obstacles.forEach((obs) => {
    if (obs.type === TERRAIN_TYPES.STEEL) {
      // Hard Steel Bunker (Solid cover)
      const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y + obs.height)
      grad.addColorStop(0, '#334155')
      grad.addColorStop(1, '#1e293b')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4)
      ctx.fill()

      // Metallic bevel
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Rivets / Bolts
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(obs.x + 4, obs.y + 4, 3, 3)
      ctx.fillRect(obs.x + obs.width - 7, obs.y + 4, 3, 3)
      ctx.fillRect(obs.x + 4, obs.y + obs.height - 7, 3, 3)
      ctx.fillRect(obs.x + obs.width - 7, obs.y + obs.height - 7, 3, 3)
    } else if (obs.type === TERRAIN_TYPES.BRICK && (obs.hp || 0) > 0) {
      // Destructible Brick Wall
      ctx.fillStyle = obs.hp === 2 ? '#b91c1c' : '#7f1d1d' // Red 700 / 900
      ctx.beginPath()
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 3)
      ctx.fill()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1
      ctx.stroke()

      // Brick pattern lines
      ctx.strokeStyle = '#450a0a'
      ctx.lineWidth = 1
      const midY = obs.y + obs.height / 2
      ctx.beginPath()
      ctx.moveTo(obs.x, midY)
      ctx.lineTo(obs.x + obs.width, midY)
      ctx.stroke()

      // Cracks if 1 HP left
      if (obs.hp === 1) {
        ctx.strokeStyle = '#fca5a5'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(obs.x + 5, obs.y + 4)
        ctx.lineTo(obs.x + obs.width / 2, midY)
        ctx.lineTo(obs.x + obs.width - 6, obs.y + obs.height - 4)
        ctx.stroke()
      }
    }
  })
}

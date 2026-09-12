import { TERRAIN_TYPES } from '../constants/tankConstants'

/**
 * Mud and water. Water ripples on `elapsed`.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawTerrain(ctx, { obstacles, elapsed }) {
  obstacles.forEach((obs) => {
    if (obs.type === TERRAIN_TYPES.MUD) {
      // Mud pit
      ctx.fillStyle = '#1c1917' // Warm stone / dark mud
      ctx.beginPath()
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 12)
      ctx.fill()
      ctx.strokeStyle = '#292524'
      ctx.lineWidth = 2
      ctx.stroke()

      // Mud ripples
      ctx.fillStyle = '#292524'
      ctx.fillRect(obs.x + 10, obs.y + 15, obs.width - 20, 6)
      ctx.fillRect(obs.x + 15, obs.y + obs.height - 25, obs.width - 30, 6)
    } else if (obs.type === TERRAIN_TYPES.WATER) {
      // Water pond
      ctx.fillStyle = '#082f49' // Deep blue
      ctx.beginPath()
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 14)
      ctx.fill()
      ctx.strokeStyle = '#0284c7'
      ctx.lineWidth = 2
      ctx.stroke()

      // Animated water waves
      const waveOffset = Math.sin(elapsed / 600 + obs.x) * 4
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(obs.x + 10, obs.y + obs.height / 2 + waveOffset)
      ctx.lineTo(obs.x + obs.width - 10, obs.y + obs.height / 2 - waveOffset)
      ctx.stroke()
    }
  })
}

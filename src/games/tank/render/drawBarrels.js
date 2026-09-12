/**
 * Explosive fuel barrels.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawBarrels(ctx, { barrels }) {
  if (barrels) {
    barrels.forEach((barrel) => {
      if (barrel.hp > 0) {
        ctx.save()
        ctx.translate(barrel.x, barrel.y)

        // Red Fuel Drum
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.arc(0, 0, barrel.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fef08a' // Warning yellow rim
        ctx.lineWidth = 2
        ctx.stroke()

        // Warning Icon
        ctx.fillStyle = '#000000'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('⚡', 0, 0)

        ctx.restore()
      }
    })
  }
}

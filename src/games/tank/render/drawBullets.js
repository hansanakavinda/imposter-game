/**
 * Shells in flight.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawBullets(ctx, { bullets }) {
  if (bullets) {
    bullets.forEach((bullet) => {
      ctx.save()
      ctx.translate(bullet.x, bullet.y)

      // Glowing tracer
      ctx.fillStyle = bullet.color || '#fbbf24'
      ctx.shadowColor = bullet.color || '#fbbf24'
      ctx.shadowBlur = 8

      ctx.beginPath()
      ctx.arc(0, 0, bullet.radius || 3.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    })
  }
}

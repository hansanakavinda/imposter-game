/**
 * Weapon crate drops. Pulses on `elapsed`.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawCrates(ctx, { crates, elapsed }) {
  if (crates) {
    crates.forEach((crate) => {
      const pulse = Math.sin(elapsed / 250) * 4
      ctx.save()
      ctx.translate(crate.x, crate.y)

      // Glow aura
      ctx.fillStyle = 'rgba(234, 179, 8, 0.2)'
      ctx.beginPath()
      ctx.arc(0, 0, 18 + pulse, 0, Math.PI * 2)
      ctx.fill()

      // Crate box
      ctx.fillStyle = '#ca8a04' // Amber 600
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 2
      ctx.fillRect(-11, -11, 22, 22)
      ctx.strokeRect(-11, -11, 22, 22)

      // Cross marking
      ctx.strokeStyle = '#713f12'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-9, -9)
      ctx.lineTo(9, 9)
      ctx.moveTo(9, -9)
      ctx.lineTo(-9, 9)
      ctx.stroke()

      ctx.restore()
    })
  }
}

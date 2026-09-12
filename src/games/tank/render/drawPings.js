/**
 * Radar pings. Ages against `now` (a performance.now()-based clock),
 * not `elapsed`, because ping.createdAt is stamped on arrival.
 *
 * Pure canvas drawing: takes a 2D context, draws, returns nothing.
 * No React here.
 */
export default function drawPings(ctx, { pings, now }) {
  if (pings) {
    pings.forEach((ping) => {
      const age = now - ping.createdAt
      if (age < 1800) {
        const progress = age / 1800
        const pingRadius = 10 + progress * 50
        const alpha = 1 - progress

        ctx.save()
        ctx.strokeStyle = ping.team === 'blue' ? `rgba(6, 182, 212, ${alpha})` : `rgba(244, 63, 94, ${alpha})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(ping.x, ping.y, pingRadius, 0, Math.PI * 2)
        ctx.stroke()

        // Ping pulse core
        ctx.fillStyle = ping.team === 'blue' ? `rgba(6, 182, 212, ${alpha * 0.8})` : `rgba(244, 63, 94, ${alpha * 0.8})`
        ctx.beginPath()
        ctx.arc(ping.x, ping.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    })
  }
}

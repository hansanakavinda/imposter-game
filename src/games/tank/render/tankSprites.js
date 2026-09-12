/**
 * Per-class tank artwork.
 *
 * This was a 192-line if/else chain on `tank.tankType` string literals inside
 * the render loop -- a lookup table written as control flow. Keyed off the same
 * ids as TANK_TYPES, so adding a class is a table entry rather than another
 * branch.
 *
 * Both methods draw at the origin; the caller owns translate and rotate (hull
 * and turret rotate independently).
 */
export const TANK_SPRITES = {
  striker: {
    drawHull(ctx, { tr, teamColor }) {
      // --- STRIKER: Classic balanced assault tank ---
      ctx.fillStyle = '#27272a'
      ctx.fillRect(-tr - 1, -tr, (tr + 1) * 2, 7)
      ctx.fillRect(-tr - 1, tr - 7, (tr + 1) * 2, 7)

      ctx.strokeStyle = '#52525b'
      ctx.lineWidth = 1
      for (let tx = -tr; tx <= tr; tx += 6) {
        ctx.beginPath()
        ctx.moveTo(tx, -tr)
        ctx.lineTo(tx, -tr + 7)
        ctx.moveTo(tx, tr - 7)
        ctx.lineTo(tx, tr)
        ctx.stroke()
      }

      ctx.fillStyle = teamColor
      ctx.shadowColor = teamColor
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.roundRect(-tr + 2, -tr + 5, (tr - 2) * 2, (tr - 5) * 2, 4)
      ctx.fill()
      ctx.shadowBlur = 0
    },

    drawTurret(ctx, { tr, teamColor }) {
      // Standard Assault Cannon Barrel
      ctx.fillStyle = '#d4d4d8'
      ctx.fillRect(0, -3, tr + 8, 6)
      ctx.strokeStyle = '#71717a'
      ctx.lineWidth = 1
      ctx.strokeRect(0, -3, tr + 8, 6)

      ctx.fillStyle = '#18181b'
      ctx.beginPath()
      ctx.arc(0, 0, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = teamColor
      ctx.lineWidth = 2
      ctx.stroke()
    },
  },

  titan: {
    drawHull(ctx, { tr, teamColor }) {
      // --- TITAN: Heavy armored tracks & reinforced hull ---
      ctx.fillStyle = '#18181b'
      ctx.fillRect(-tr - 2, -tr, (tr + 2) * 2, 8)
      ctx.fillRect(-tr - 2, tr - 8, (tr + 2) * 2, 8)

      ctx.strokeStyle = '#3f3f46'
      ctx.lineWidth = 1.5
      for (let tx = -tr; tx <= tr; tx += 6) {
        ctx.beginPath()
        ctx.moveTo(tx, -tr)
        ctx.lineTo(tx, -tr + 8)
        ctx.moveTo(tx, tr - 8)
        ctx.lineTo(tx, tr)
        ctx.stroke()
      }

      ctx.fillStyle = teamColor
      ctx.shadowColor = teamColor
      ctx.shadowBlur = 7
      ctx.beginPath()
      ctx.roundRect(-tr + 1, -tr + 5.5, (tr - 1) * 2, (tr - 5.5) * 2, 5)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = 'rgba(24, 24, 27, 0.65)'
      ctx.fillRect(-tr + 3, -tr + 7, 5, (tr - 7) * 2)
      ctx.fillRect(tr - 8, -tr + 7, 5, (tr - 7) * 2)
    },

    drawTurret(ctx, { tr, teamColor }) {
      // Heavy Cannon Barrel (Thick + muzzle brake)
      ctx.fillStyle = '#a1a1aa'
      ctx.fillRect(0, -4, tr + 8, 8)
      ctx.strokeStyle = '#52525b'
      ctx.lineWidth = 1.2
      ctx.strokeRect(0, -4, tr + 8, 8)

      ctx.fillStyle = '#27272a'
      ctx.fillRect(tr + 6, -5.5, 5, 11)
      ctx.strokeRect(tr + 6, -5.5, 5, 11)

      ctx.fillStyle = '#18181b'
      ctx.beginPath()
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = teamColor
      ctx.lineWidth = 2.5
      ctx.stroke()
    },
  },

  specter: {
    drawHull(ctx, { tr, teamColor }) {
      // --- SPECTER: Aerodynamic, sleek compact scout hull ---
      ctx.fillStyle = '#27272a'
      ctx.fillRect(-tr - 1, -tr, (tr + 1) * 2, 5.5)
      ctx.fillRect(-tr - 1, tr - 5.5, (tr + 1) * 2, 5.5)

      ctx.strokeStyle = '#52525b'
      ctx.lineWidth = 1
      for (let tx = -tr; tx <= tr; tx += 5) {
        ctx.beginPath()
        ctx.moveTo(tx, -tr)
        ctx.lineTo(tx, -tr + 5.5)
        ctx.moveTo(tx, tr - 5.5)
        ctx.lineTo(tx, tr)
        ctx.stroke()
      }

      ctx.fillStyle = teamColor
      ctx.shadowColor = teamColor
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(-tr + 1, -tr + 4.5)
      ctx.lineTo(tr + 2, -tr + 7)
      ctx.lineTo(tr + 2, tr - 7)
      ctx.lineTo(-tr + 1, tr - 4.5)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(-tr - 2, -3, 2.5, 6)
    },

    drawTurret(ctx, { tr, teamColor }) {
      // Rapid Autocannon Barrel (Slim, fast profile)
      ctx.fillStyle = '#e4e4e7'
      ctx.fillRect(0, -2, tr + 8, 4)
      ctx.strokeStyle = '#71717a'
      ctx.lineWidth = 1
      ctx.strokeRect(0, -2, tr + 8, 4)

      ctx.fillStyle = '#18181b'
      ctx.beginPath()
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = teamColor
      ctx.lineWidth = 1.8
      ctx.stroke()
    },
  },

  ballista: {
    drawHull(ctx, { tr, teamColor }) {
      // --- BALLISTA: Precision sniper chassis with stabilization pads ---
      ctx.fillStyle = '#27272a'
      ctx.fillRect(-tr - 1, -tr, (tr + 1) * 2, 6.5)
      ctx.fillRect(-tr - 1, tr - 6.5, (tr + 1) * 2, 6.5)

      ctx.strokeStyle = '#52525b'
      ctx.lineWidth = 1
      for (let tx = -tr; tx <= tr; tx += 6) {
        ctx.beginPath()
        ctx.moveTo(tx, -tr)
        ctx.lineTo(tx, -tr + 6.5)
        ctx.moveTo(tx, tr - 6.5)
        ctx.lineTo(tx, tr)
        ctx.stroke()
      }

      ctx.fillStyle = teamColor
      ctx.shadowColor = teamColor
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.roundRect(-tr + 2, -tr + 5, (tr - 2) * 2, (tr - 5) * 2, 3)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = 'rgba(24, 24, 27, 0.7)'
      ctx.fillRect(-6, -tr - 2, 12, 2.5)
      ctx.fillRect(-6, tr - 0.5, 12, 2.5)
    },

    drawTurret(ctx, { tr, teamColor }) {
      // Long-Range Precision Railgun Barrel (Elongated with rail rings)
      ctx.fillStyle = '#d4d4d8'
      ctx.fillRect(0, -2.5, tr + 19, 5)
      ctx.strokeStyle = '#71717a'
      ctx.lineWidth = 1
      ctx.strokeRect(0, -2.5, tr + 19, 5)

      ctx.fillStyle = '#c084fc'
      ctx.fillRect(tr + 4, -3.5, 2.5, 7)
      ctx.fillRect(tr + 11, -3.5, 2.5, 7)

      ctx.fillStyle = '#18181b'
      ctx.beginPath()
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = teamColor
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#c084fc'
      ctx.beginPath()
      ctx.arc(2, 0, 1.8, 0, Math.PI * 2)
      ctx.fill()
    },
  },
}

/** Falls back to striker, which was the chain's final `else`. */
export function getTankSprite(tankType) {
  return TANK_SPRITES[tankType] || TANK_SPRITES.striker
}

import { getCanvasSize, getWorldTransform } from '../utils/arenaGeometry'
import { isTankHiddenFrom } from '../utils/tankPhysics'
import { TANK_RADIUS, TEAMS, TANK_MAX_HP, ARENA_WIDTH, ARENA_HEIGHT } from '../constants/tankConstants'
import drawGround, { clearCanvas } from './drawGround'
import drawTerrain from './drawTerrain'
import drawCrates from './drawCrates'
import drawObstacles from './drawObstacles'
import drawBarrels from './drawBarrels'
import drawBullets from './drawBullets'
import drawPings from './drawPings'
import drawBushes from './drawBushes'
import drawHud from './drawHud'
import { getTankSprite } from './tankSprites'

/**
 * Draw one frame of the arena.
 *
 * Pure: everything it reads arrives in `scene`, so it holds no state between
 * frames and the caller owns the clock.
 *
 * The two clocks are not interchangeable:
 *   elapsed  ms since the renderer started -- drives water, crate pulse, rotors
 *   now      the raw rAF timestamp, same origin as performance.now() -- ages
 *            radar pings, whose createdAt is stamped on arrival
 */
export default function drawScene(ctx, scene, { now, elapsed }) {
  const {
    tanks,
    bullets,
    obstacles,
    barrels,
    crates,
    pings,
    mySlotId,
    score,
    targetScore,
    roundStatus,
    roundWinner,
    is2v2,
    isPortrait,
  } = scene

  const { width: canvasWidth, height: canvasHeight } = getCanvasSize(isPortrait)

    clearCanvas(ctx, { canvasWidth, canvasHeight })

    // World space from here until the matching restore(): portrait draws the
    // whole arena rotated a quarter turn.
    ctx.save()
    const worldTransform = getWorldTransform(isPortrait)
    if (worldTransform) {
      ctx.translate(worldTransform.translateX, worldTransform.translateY)
      ctx.rotate(worldTransform.rotate)
    }

    drawGround(ctx)
    drawTerrain(ctx, { obstacles, elapsed })
    drawCrates(ctx, { crates, elapsed })
    drawObstacles(ctx, { obstacles })
    drawBarrels(ctx, { barrels })
    drawBullets(ctx, { bullets })
    drawPings(ctx, { pings, now })

    // 8. Draw Tanks
    const myTank = tanks.find((t) => t.slotId === mySlotId)

    tanks.forEach((tank) => {
      if (!tank.isAlive) {
        // In 2v2: Draw Recon Drone for eliminated player
        if (is2v2) {
          ctx.save()
          ctx.translate(tank.x, tank.y)
          ctx.strokeStyle = tank.team === 'blue' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(244, 63, 94, 0.4)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(0, 0, 10, 0, Math.PI * 2)
          ctx.stroke()
          // Drone rotors
          const rAngle = elapsed / 100
          ctx.beginPath()
          ctx.arc(Math.cos(rAngle) * 9, Math.sin(rAngle) * 9, 3, 0, Math.PI * 2)
          ctx.arc(-Math.cos(rAngle) * 9, -Math.sin(rAngle) * 9, 3, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
        return
      }

      // Stealth check against bushes
      const isHidden = myTank && tank.team !== myTank.team && isTankHiddenFrom(tank, myTank, obstacles)
      if (isHidden) {
        return // Completely invisible to opponent!
      }

      const isTeammateInBush = myTank && tank.team === myTank.team && isTankHiddenFrom(tank, null, obstacles)

      ctx.save()
      ctx.translate(tank.x, tank.y)

      // Semi-transparent if teammate inside bush
      if (isTeammateInBush && tank.slotId !== mySlotId) {
        ctx.globalAlpha = 0.4
      }

      const tr = tank.radius || TANK_RADIUS
      const sprite = getTankSprite(tank.tankType)

      // Tank Hull Rotation
      ctx.save()
      ctx.rotate(tank.angle || 0)

      const teamColor = tank.team === 'blue' ? TEAMS.blue.color : TEAMS.red.color

      sprite.drawHull(ctx, { tr, teamColor })

      ctx.restore() // End Hull Rotation

      // Tank Turret & Cannon Barrel Rotation (aims independently)
      ctx.save()
      ctx.rotate(tank.turretAngle || tank.angle || 0)

      sprite.drawTurret(ctx, { tr, teamColor })

      ctx.restore() // End Turret Rotation

      // Armor Shield Bubble (if active)
      if (tank.shield) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)' // Emerald
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(0, 0, tr + 6, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Aiming laser guide line for local tank
      if (tank.slotId === mySlotId) {
        ctx.save()
        ctx.strokeStyle = tank.team === 'blue' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(251, 113, 133, 0.45)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(0, 0)
        const aimDist = 180
        const tAngle = tank.turretAngle ?? tank.angle ?? 0
        ctx.lineTo(Math.cos(tAngle) * aimDist, Math.sin(tAngle) * aimDist)
        ctx.stroke()
        ctx.restore()
      }

      // Nameplate & Health Bar (letters read vertically top-to-bottom)
      ctx.save()
      // In horizontal landscape view, rotate 90° clockwise so letters and health bar read top-to-bottom
      // In portrait view, world was rotated -90°, so rotating Math.PI makes letters read top-to-bottom on screen
      const rotAngle = isPortrait ? Math.PI : Math.PI / 2
      ctx.rotate(rotAngle)

      // Prevent clipping near arena boundaries by dynamically flipping side if close to edge
      const flipSide = isPortrait
        ? tank.y > ARENA_HEIGHT - 55
        : tank.x > ARENA_WIDTH - 55
      const sideSign = flipSide ? 1 : -1

      let clampOffsetX = 0
      if (!isPortrait) {
        if (tank.y < 36) clampOffsetX = 36 - tank.y
        else if (tank.y > ARENA_HEIGHT - 36) clampOffsetX = (ARENA_HEIGHT - 36) - tank.y
      } else {
        if (tank.x < 36) clampOffsetX = -(36 - tank.x)
        else if (tank.x > ARENA_WIDTH - 36) clampOffsetX = (tank.x - (ARENA_WIDTH - 36))
      }

      const maxHp = tank.maxHp || TANK_MAX_HP || 3
      const currentHp = Math.max(0, tank.hp !== undefined ? tank.hp : maxHp)

      // Health Bar & Nameplate Distances
      const barDistY = sideSign * (tr + 7)
      const nameDistY = sideSign * (tr + 16)

      const totalBarHeight = 25
      const segmentCount = maxHp
      const gap = 2
      const segHeight = (totalBarHeight - (segmentCount - 1) * gap) / segmentCount
      const segWidth = 4.5
      const startX = -totalBarHeight / 2 + clampOffsetX

      // Active Shield outline highlight if shield is active
      if (tank.shield) {
        ctx.save()
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)'
        ctx.lineWidth = 1.5
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.roundRect(startX - 2.5, barDistY - segWidth / 2 - 2, totalBarHeight + 5, segWidth + 4, 3)
        ctx.stroke()
        ctx.restore()
      }

      // Draw Health Bar Segments (top to bottom along local X)
      for (let i = 0; i < segmentCount; i++) {
        const segX = startX + i * (segHeight + gap)
        const isFilled = i < currentHp

        ctx.beginPath()
        ctx.roundRect(segX, barDistY - segWidth / 2, segHeight, segWidth, 1.5)

        if (isFilled) {
          let segColor = '#22c55e' // Green (3 HP)
          if (currentHp === 2) segColor = '#eab308' // Yellow (2 HP)
          if (currentHp === 1) segColor = '#ef4444' // Red (1 HP)

          ctx.fillStyle = segColor
          ctx.shadowColor = segColor
          ctx.shadowBlur = currentHp === 1 ? 6 : 2
          ctx.fill()
          ctx.shadowBlur = 0
        } else {
          // Empty segment
          ctx.fillStyle = 'rgba(39, 39, 42, 0.8)'
          ctx.fill()
          ctx.strokeStyle = '#52525b'
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }

      // Draw Player Name (written vertically top-to-bottom)
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (tank.slotId === mySlotId) {
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = 5
      } else if (tank.team === 'blue') {
        ctx.fillStyle = TEAMS.blue.color
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = TEAMS.red.color
        ctx.shadowBlur = 0
      }
      const tankDisplayName = tank.name || 'Tank'
      ctx.fillText(tankDisplayName, clampOffsetX, nameDistY)
      ctx.shadowBlur = 0

      // Local Tank Indicator Arrow (points down at the top of the name)
      if (tank.slotId === mySlotId) {
        const nameMetrics = ctx.measureText(tankDisplayName)
        const arrowTipX = clampOffsetX - Math.max(16, nameMetrics.width / 2 + 5)
        ctx.fillStyle = '#38bdf8'
        ctx.beginPath()
        ctx.moveTo(arrowTipX, nameDistY)
        ctx.lineTo(arrowTipX - 5, nameDistY - 3)
        ctx.lineTo(arrowTipX - 5, nameDistY + 3)
        ctx.closePath()
        ctx.fill()
      }

      ctx.restore()

      ctx.restore()
    })

    drawBushes(ctx, { obstacles })

    // End world transform, so the HUD is drawn in screen space.
    ctx.restore()

    drawHud(ctx, {
      canvasWidth,
      canvasHeight,
      isPortrait,
      score,
      targetScore,
      roundStatus,
      roundWinner,
    })
}

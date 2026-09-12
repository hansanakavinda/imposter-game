import React, { useRef, useEffect } from 'react'
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_RADIUS,
  TERRAIN_TYPES,
  TEAMS,
  TANK_MAX_HP,
} from '../constants/tankConstants'
import { isTankHiddenFrom } from '../utils/tankPhysics'
import { getCanvasSize, getWorldTransform, pointerToWorld } from '../utils/arenaGeometry'

export default function TankCanvas({
  tanks,
  bullets,
  obstacles,
  barrels,
  crates,
  pings,
  mySlotId,
  score,
  targetScore,
  roundStatus, // 'playing', 'round_win', 'match_over'
  roundWinner,
  is2v2,
  isPortrait = false,
  onCanvasPointerMove,
  onCanvasPointerDown,
  onCanvasContextMenu,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    const startTime = performance.now()
    const { width: canvasWidth, height: canvasHeight } = getCanvasSize(isPortrait)

    const render = (currentTime) => {
      const elapsed = currentTime - startTime

      // 1. Clear background
      ctx.fillStyle = '#09090b' // Zinc 950
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // Apply 90° portrait transform for arena world objects
      ctx.save()
      const worldTransform = getWorldTransform(isPortrait)
      if (worldTransform) {
        ctx.translate(worldTransform.translateX, worldTransform.translateY)
        ctx.rotate(worldTransform.rotate)
      }

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

      // 2. Draw Terrain Layers (Mud -> Water -> Crates -> Steel & Bricks -> Barrels)
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

      // 3. Draw Weapon Crates
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

      // 4. Draw Solid Obstacles (Steel & Bricks)
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

      // 5. Draw Explosive Fuel Barrels
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

      // 6. Draw Bullets & Projectiles
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

      // 7. Draw Active Tactical Radar Pings
      if (pings) {
        pings.forEach((ping) => {
          const age = currentTime - ping.createdAt
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
        const tankType = tank.tankType || 'striker'

        // Tank Hull Rotation
        ctx.save()
        ctx.rotate(tank.angle || 0)

        const teamColor = tank.team === 'blue' ? TEAMS.blue.color : TEAMS.red.color

        if (tankType === 'titan') {
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
        } else if (tankType === 'specter') {
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
        } else if (tankType === 'ballista') {
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
        } else {
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
        }

        ctx.restore() // End Hull Rotation

        // Tank Turret & Cannon Barrel Rotation (aims independently)
        ctx.save()
        ctx.rotate(tank.turretAngle || tank.angle || 0)

        if (tankType === 'titan') {
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
        } else if (tankType === 'specter') {
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
        } else if (tankType === 'ballista') {
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
        } else {
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
        }

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

      // 9. Draw Tall Grass Bushes OVER tanks (Stealth layer)
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

      // End World Transform (so HUD is drawn in screen space)
      ctx.restore()

      // 11. Draw Scoreboard & Round Banner HUD (in Screen Space)
      ctx.save()
      const hudCenterX = canvasWidth / 2
      const hudTopY = isPortrait ? 16 : 8

      // Center Top Score Badge
      ctx.fillStyle = 'rgba(9, 9, 11, 0.88)'
      ctx.strokeStyle = '#27272a'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(hudCenterX - 105, hudTopY, 210, 36, 12)
      ctx.fill()
      ctx.stroke()

      // Blue Team Score
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillStyle = TEAMS.blue.color
      ctx.fillText(`${score.blue}`, hudCenterX - 22, hudTopY + 23)

      // Divider
      ctx.textAlign = 'center'
      ctx.fillStyle = '#71717a'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('VS', hudCenterX, hudTopY + 23)

      // Red Team Score
      ctx.textAlign = 'left'
      ctx.fillStyle = TEAMS.red.color
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText(`${score.red}`, hudCenterX + 22, hudTopY + 23)

      // Target score indicator
      ctx.textAlign = 'center'
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '9px sans-serif'
      ctx.fillText(`FIRST TO ${targetScore}`, hudCenterX, hudTopY + 12)

      // Round Over / Win Overlay
      if (roundStatus === 'round_win' && roundWinner) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        ctx.font = 'black 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = roundWinner === 'blue' ? TEAMS.blue.color : TEAMS.red.color
        ctx.fillText(
          `${roundWinner === 'blue' ? 'TEAM BLUE' : 'TEAM RED'} SCORES!`,
          hudCenterX,
          canvasHeight / 2 - 10
        )

        ctx.font = 'bold 14px sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('Next round in 2 seconds...', hudCenterX, canvasHeight / 2 + 24)
      }

      ctx.restore()

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [
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
  ])

  // Mouse / Touch event coordinates translated into virtual (1000x650) space.
  // The inverse transform lives in arenaGeometry next to its forward twin.
  const getArenaCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    return pointerToWorld(clientX, clientY, canvas.getBoundingClientRect(), isPortrait)
  }

  const handlePointerMove = (e) => {
    if (onCanvasPointerMove) {
      onCanvasPointerMove(getArenaCoords(e))
    }
  }

  const handlePointerDown = (e) => {
    if (e.button === 2) {
      // Right click -> Radar Ping
      e.preventDefault()
      if (onCanvasContextMenu) {
        onCanvasContextMenu(getArenaCoords(e))
      }
    } else if (onCanvasPointerDown) {
      onCanvasPointerDown(getArenaCoords(e))
    }
  }

  return (
    <div
      className={`relative flex items-center justify-center select-none overflow-hidden touch-none ${
        isPortrait
          ? 'w-full h-full max-h-[100dvh] mx-auto'
          : 'w-full max-w-5xl mx-auto rounded-2xl'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={getCanvasSize(isPortrait).width}
        height={getCanvasSize(isPortrait).height}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => {
          e.preventDefault()
          if (onCanvasContextMenu) {
            onCanvasContextMenu(getArenaCoords(e))
          }
        }}
        className={`block object-contain cursor-crosshair rounded-2xl border border-zinc-800/80 shadow-2xl bg-zinc-950 ${
          isPortrait
            ? 'h-full w-auto max-w-full max-h-[100dvh] aspect-[650/1000]'
            : 'w-full h-auto aspect-[1000/650]'
        }`}
      />
    </div>
  )
}

import React, { useState, useEffect, useRef, useCallback } from 'react'
import TankLobby from './components/TankLobby'
import TankCanvas from './components/TankCanvas'
import TankControls from './components/TankControls'
import TankGameOverModal from './components/TankGameOverModal'
import TankRulesModal from './components/TankRulesModal'
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_RADIUS,
  TANK_SPEED,
  TANK_REVERSE_SPEED,
  TANK_TURN_SPEED,
  TANK_MUD_SPEED_MULT,
  BULLET_RADIUS,
  BULLET_LIFETIME_MS,
  MODES,
  TERRAIN_TYPES,
  WEAPON_TYPES,
  TARGET_SCORE_DEFAULT,
  CRATE_DROP_INTERVAL_MS,
  CRATE_SIZE,
} from './constants/tankConstants'
import { getBattlefieldMap, getSpawnPoints } from './utils/tankTerrain'
import {
  moveTankWithCollision,
  isTankInMud,
  testCircleRect,
} from './utils/tankPhysics'
import {
  TankNetwork,
  generateRoomCode,
} from './services/tankNetwork'
import {
  playTankShootSound,
  playTankRicochetSound,
  playTankExplosionSound,
  playBarrelExplosionSound,
  playCratePickupSound,
  playRadarPingSound,
  isSoundEnabled,
  setSoundEnabled,
} from '../../utils/sound'

export default function TankGame({
  onBackToMenu,
  isRulesOpen,
  onCloseRules,
  initialRoomCode = '',
}) {
  // Lobby State
  const [mode, setMode] = useState('1v1') // '1v1' or '2v2'
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState(initialRoomCode)
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('tank_player_name') || `Commander_${Math.floor(100 + Math.random() * 900)}`
    } catch {
      return `Commander_${Math.floor(100 + Math.random() * 900)}`
    }
  })
  const [isHost, setIsHost] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('idle') // 'idle', 'hosting', 'connecting', 'connected', 'disconnected'
  const [players, setPlayers] = useState([]) // array of { id, name, peerId, slotId, team, isReady, isHost }
  const [mySlotId, setMySlotId] = useState('p1')
  const [myPeerId, setMyPeerId] = useState('')
  const [error, setError] = useState(null)

  // Game Flow State
  const [gamePhase, setGamePhase] = useState('lobby') // 'lobby', 'battle', 'game_over'
  const [roundStatus, setRoundStatus] = useState('playing') // 'playing', 'round_win', 'match_over'
  const [roundWinner, setRoundWinner] = useState(null)
  const [matchWinner, setMatchWinner] = useState(null)
  const [score, setScore] = useState({ blue: 0, red: 0 })
  const [currentMapIndex, setCurrentMapIndex] = useState(0)

  // World Simulation State
  const [tanks, setTanks] = useState([])
  const [bullets, setBullets] = useState([])
  const [obstacles, setObstacles] = useState([])
  const [barrels, setBarrels] = useState([])
  const [crates, setCrates] = useState([])
  const [particles, setParticles] = useState([])
  const [pings, setPings] = useState([])

  // Device Orientation State (default to auto-detect portrait on mobile)
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth
    }
    return false
  })
  const [localRulesOpen, setLocalRulesOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  const handleToggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const nextVal = !prev
      setSoundEnabled(nextVal)
      return nextVal
    })
  }, [])

  // Auto-update orientation when window is rotated / resized
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  // Local Input tracking
  const localInputRef = useRef({
    forward: false,
    reverse: false,
    steerLeft: false,
    steerRight: false,
    isMoving: false,
    moveAngle: 0,
    moveMagnitude: 0,
    turretAngle: 0,
    aimCoord: { x: 500, y: 325 },
  })

  // Synchronized refs to avoid stale closures in callbacks and event listeners
  const isHostRef = useRef(false)
  const modeRef = useRef(mode)
  const playersRef = useRef(players)
  const mySlotIdRef = useRef(mySlotId)
  const playerNameRef = useRef(playerName)
  const roundStatusRef = useRef('playing')
  const roundWinnerRef = useRef(null)
  const scoreRef = useRef({ blue: 0, red: 0 })
  const currentMapIndexRef = useRef(0)

  // World simulation refs for smooth 30FPS physics loop
  const tanksRef = useRef([])
  const bulletsRef = useRef([])
  const obstaclesRef = useRef([])
  const barrelsRef = useRef([])
  const cratesRef = useRef([])
  const particlesRef = useRef([])
  const pingsRef = useRef([])

  const networkRef = useRef(null)
  const simulationTimerRef = useRef(null)
  const lastCrateDropRef = useRef(0)
  const lastFiredTimeRef = useRef(0)

  // Network callback dynamic refs
  const handleNetworkMessageRef = useRef(null)
  const handleClientJoinRef = useRef(null)
  const handlePlayerLeaveRef = useRef(null)

  // Sync refs with state on every render
  useEffect(() => {
    isHostRef.current = isHost
  }, [isHost])
  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    playersRef.current = players
  }, [players])
  useEffect(() => {
    mySlotIdRef.current = mySlotId
  }, [mySlotId])
  useEffect(() => {
    playerNameRef.current = playerName
  }, [playerName])
  useEffect(() => {
    roundStatusRef.current = roundStatus
  }, [roundStatus])
  useEffect(() => {
    roundWinnerRef.current = roundWinner
  }, [roundWinner])
  useEffect(() => {
    scoreRef.current = score
  }, [score])
  useEffect(() => {
    currentMapIndexRef.current = currentMapIndex
  }, [currentMapIndex])

  // Persist player name
  useEffect(() => {
    try {
      localStorage.setItem('tank_player_name', playerName)
    } catch {
      // ignore
    }
  }, [playerName])

  // Clean up network on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current)
        simulationTimerRef.current = null
      }
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, [])

  // -------------------------------------------------------------
  // Spawn & World Initialization (Host Authoritative)
  // -------------------------------------------------------------
  const initRoundWorld = useCallback((currentScore = scoreRef.current, mapIdx = currentMapIndexRef.current) => {
    const map = getBattlefieldMap(mapIdx)
    const currentMode = modeRef.current
    const spawns = getSpawnPoints(currentMode)

    const initialTanks = []
    const modeConfig = MODES[currentMode] || MODES['1v1']
    const currentPlayers = playersRef.current

    modeConfig.slots.forEach((slot) => {
      const p = currentPlayers.find((pl) => pl.slotId === slot.id)
      const spawn = spawns[slot.id] || { x: 100, y: 300, angle: 0 }

      if (p) {
        initialTanks.push({
          id: slot.id,
          slotId: slot.id,
          name: p.name,
          team: slot.team,
          x: spawn.x,
          y: spawn.y,
          angle: spawn.angle,
          turretAngle: spawn.angle,
          isAlive: true,
          shield: false,
          weapon: 'STANDARD',
          lastFiredAt: 0,
        })
      }
    })

    tanksRef.current = initialTanks
    obstaclesRef.current = map.obstacles
    barrelsRef.current = map.barrels
    bulletsRef.current = []
    cratesRef.current = []
    particlesRef.current = []
    pingsRef.current = []
    scoreRef.current = currentScore
    roundStatusRef.current = 'playing'
    roundWinnerRef.current = null
    currentMapIndexRef.current = mapIdx
    lastCrateDropRef.current = Date.now()

    setTanks(initialTanks)
    setObstacles(map.obstacles)
    setBarrels(map.barrels)
    setBullets([])
    setCrates([])
    setParticles([])
    setPings([])
    setRoundStatus('playing')
    setRoundWinner(null)
    setScore(currentScore)
    setCurrentMapIndex(mapIdx)

    return {
      tanks: initialTanks,
      obstacles: map.obstacles,
      barrels: map.barrels,
      score: currentScore,
      mapIndex: mapIdx,
    }
  }, [])

  // Handle Round Win & Score Update
  const handleRoundWin = useCallback((winner) => {
    setRoundStatus('round_win')
    roundStatusRef.current = 'round_win'
    setRoundWinner(winner)
    roundWinnerRef.current = winner
    playTankExplosionSound()

    const prevScore = scoreRef.current
    const newScore = {
      ...prevScore,
      [winner]: (prevScore[winner] || 0) + 1,
    }
    scoreRef.current = newScore
    setScore(newScore)

    if (newScore[winner] >= TARGET_SCORE_DEFAULT) {
      setTimeout(() => {
        setMatchWinner(winner)
        setGamePhase('game_over')
        networkRef.current?.broadcast({
          type: 'MATCH_OVER',
          winner,
        })
      }, 1800)
    } else {
      setTimeout(() => {
        const nextMap = currentMapIndexRef.current + 1
        const nextWorld = initRoundWorld(newScore, nextMap)
        networkRef.current?.broadcast({
          type: 'START_MATCH',
          score: newScore,
          tanks: nextWorld.tanks,
          obstacles: nextWorld.obstacles,
          barrels: nextWorld.barrels,
        })
      }, 2400)
    }
  }, [initRoundWorld])

  // -------------------------------------------------------------
  // Host Game Simulation Loop (~31 FPS Physics Tick)
  // -------------------------------------------------------------
  const runHostSimulationTick = useCallback(() => {
    if (roundStatusRef.current !== 'playing') return

    const currentTanks = tanksRef.current
    if (!currentTanks || !currentTanks.length) return

    // 1. Steering & Tank Movement
    let updatedTanks = currentTanks.map((tank) => {
      if (!tank.isAlive) return tank

      // Determine input for this tank
      let input = { forward: false, reverse: false, steerLeft: false, steerRight: false }
      if (tank.slotId === mySlotIdRef.current) {
        input = localInputRef.current
      } else {
        input = tank.remoteInput || input
      }

      let newAngle = tank.angle
      const inMud = isTankInMud(tank, obstaclesRef.current)
      const speedMult = inMud ? TANK_MUD_SPEED_MULT : 1.0

      let targetX = tank.x
      let targetY = tank.y

      if (input.isMoving && input.moveAngle !== undefined && input.moveAngle !== null) {
        // Virtual Joystick steering & driving
        const diff = Math.atan2(Math.sin(input.moveAngle - newAngle), Math.cos(input.moveAngle - newAngle))
        const maxTurn = TANK_TURN_SPEED * 1.5
        if (Math.abs(diff) > 0.05) {
          newAngle += Math.sign(diff) * Math.min(Math.abs(diff), maxTurn)
        }

        const alignment = Math.max(0, Math.cos(diff))
        const currentSpeed = TANK_SPEED * speedMult * (input.moveMagnitude || 1.0) * (0.35 + 0.65 * alignment)
        targetX += Math.cos(newAngle) * currentSpeed
        targetY += Math.sin(newAngle) * currentSpeed
      } else {
        // Desktop keyboard controls (WASD / Arrows)
        if (input.steerLeft) newAngle -= TANK_TURN_SPEED
        if (input.steerRight) newAngle += TANK_TURN_SPEED
        if (input.forward) {
          targetX += Math.cos(newAngle) * TANK_SPEED * speedMult
          targetY += Math.sin(newAngle) * TANK_SPEED * speedMult
        } else if (input.reverse) {
          targetX -= Math.cos(newAngle) * TANK_REVERSE_SPEED * speedMult
          targetY -= Math.sin(newAngle) * TANK_REVERSE_SPEED * speedMult
        }
      }

      const resolved = moveTankWithCollision(
        tank,
        targetX,
        targetY,
        obstaclesRef.current,
        barrelsRef.current,
        currentTanks
      )

      return {
        ...tank,
        x: resolved.x,
        y: resolved.y,
        angle: newAngle,
        turretAngle: input.turretAngle ?? tank.turretAngle ?? newAngle,
      }
    })

    // 2. Check Crate Pickups
    let remainingCrates = []
    if (cratesRef.current && cratesRef.current.length) {
      cratesRef.current.forEach((crate) => {
        let pickedBy = null
        for (let i = 0; i < updatedTanks.length; i++) {
          const t = updatedTanks[i]
          if (t.isAlive) {
            const dx = t.x - crate.x
            const dy = t.y - crate.y
            if (dx * dx + dy * dy < (TANK_RADIUS + CRATE_SIZE / 2) * (TANK_RADIUS + CRATE_SIZE / 2)) {
              pickedBy = t
              break
            }
          }
        }

        if (pickedBy) {
          playCratePickupSound()
          updatedTanks = updatedTanks.map((t) => {
            if (t.id === pickedBy.id) {
              if (crate.type === 'SHIELD') {
                return { ...t, shield: true }
              }
              return { ...t, weapon: crate.type }
            }
            return t
          })
        } else {
          remainingCrates.push(crate)
        }
      })
    }

    // 3. Crate Drop Timer
    if (Date.now() - lastCrateDropRef.current > CRATE_DROP_INTERVAL_MS) {
      lastCrateDropRef.current = Date.now()
      const weaponOptions = ['LASER', 'ROCKET', 'SHOTGUN', 'SHIELD']
      const chosenWeapon = weaponOptions[Math.floor(Math.random() * weaponOptions.length)]
      const randomX = 350 + Math.random() * 300
      const randomY = 150 + Math.random() * 350
      remainingCrates.push({
        id: `crate_${Date.now()}`,
        x: randomX,
        y: randomY,
        type: chosenWeapon,
      })
    }

    // 4. Update Bullets & Collisions
    let remainingBullets = []
    if (bulletsRef.current && bulletsRef.current.length) {
      bulletsRef.current.forEach((bullet) => {
        let bx = bullet.x + bullet.vx
        let by = bullet.y + bullet.vy
        let destroyed = false

        // Boundary collision - vanishes on impact
        if (
          bx <= BULLET_RADIUS ||
          bx >= ARENA_WIDTH - BULLET_RADIUS ||
          by <= BULLET_RADIUS ||
          by >= ARENA_HEIGHT - BULLET_RADIUS
        ) {
          destroyed = true
          playTankRicochetSound()
        }

        // Obstacles (Steel & Brick) - vanishes on impact
        if (!destroyed && obstaclesRef.current) {
          for (let i = 0; i < obstaclesRef.current.length; i++) {
            const obs = obstaclesRef.current[i]
            if (
              obs.type === TERRAIN_TYPES.STEEL ||
              (obs.type === TERRAIN_TYPES.BRICK && (obs.hp || 0) > 0)
            ) {
              const col = testCircleRect(bx, by, bullet.radius, obs.x, obs.y, obs.width, obs.height)
              if (col.collided) {
                if (obs.type === TERRAIN_TYPES.STEEL) {
                  destroyed = true
                  playTankRicochetSound()
                  break
                } else if (obs.type === TERRAIN_TYPES.BRICK) {
                  obs.hp -= 1
                  destroyed = true
                  playTankRicochetSound()
                  break
                }
              }
            }
          }
        }

        // Barrels
        if (!destroyed && barrelsRef.current) {
          for (let i = 0; i < barrelsRef.current.length; i++) {
            const barrel = barrelsRef.current[i]
            if (barrel.hp > 0) {
              const dx = bx - barrel.x
              const dy = by - barrel.y
              if (dx * dx + dy * dy < (bullet.radius + barrel.radius) * (bullet.radius + barrel.radius)) {
                barrel.hp = 0
                destroyed = true
                playBarrelExplosionSound()

                updatedTanks = updatedTanks.map((t) => {
                  if (!t.isAlive) return t
                  const bdx = t.x - barrel.x
                  const bdy = t.y - barrel.y
                  if (bdx * bdx + bdy * bdy < 75 * 75) {
                    if (t.shield) {
                      return { ...t, shield: false }
                    }
                    return { ...t, isAlive: false }
                  }
                  return t
                })
                break
              }
            }
          }
        }

        // Tank hit
        if (!destroyed) {
          let hitTank = null
          updatedTanks = updatedTanks.map((t) => {
            if (!t.isAlive || t.team === bullet.team) return t
            const dx = bx - t.x
            const dy = by - t.y
            if (dx * dx + dy * dy < (bullet.radius + TANK_RADIUS) * (bullet.radius + TANK_RADIUS)) {
              hitTank = t
              if (t.shield) {
                return { ...t, shield: false }
              }
              return { ...t, isAlive: false }
            }
            return t
          })

          if (hitTank) {
            destroyed = true
            playTankExplosionSound()
          }
        }

        // Lifetime expiration check
        if (bullet.createdAt && Date.now() - bullet.createdAt > BULLET_LIFETIME_MS) {
          destroyed = true
        }

        if (!destroyed) {
          remainingBullets.push({
            ...bullet,
            x: bx,
            y: by,
            bounces: 0,
          })
        }
      })
    }

    // 5. Check Round Win Condition
    const hasBlue = updatedTanks.some((t) => t.team === 'blue')
    const hasRed = updatedTanks.some((t) => t.team === 'red')
    if (hasBlue && hasRed) {
      const aliveBlue = updatedTanks.some((t) => t.team === 'blue' && t.isAlive)
      const aliveRed = updatedTanks.some((t) => t.team === 'red' && t.isAlive)
      if (!aliveBlue || !aliveRed) {
        let winner = null
        if (aliveBlue && !aliveRed) winner = 'blue'
        if (aliveRed && !aliveBlue) winner = 'red'

        if (winner && roundStatusRef.current === 'playing') {
          handleRoundWin(winner)
        }
      }
    }

    // 6. Update refs
    tanksRef.current = updatedTanks
    bulletsRef.current = remainingBullets
    cratesRef.current = remainingCrates

    // 7. Update React state for host canvas
    setTanks(updatedTanks)
    setBullets(remainingBullets)
    setCrates(remainingCrates)

    // 8. Broadcast world state to clients
    if (networkRef.current && isHostRef.current) {
      networkRef.current.broadcast({
        type: 'WORLD_STATE',
        tanks: updatedTanks,
        bullets: remainingBullets,
        obstacles: obstaclesRef.current,
        barrels: barrelsRef.current,
        crates: remainingCrates,
        score: scoreRef.current,
        roundStatus: roundStatusRef.current,
        roundWinner: roundWinnerRef.current,
      })
    }
  }, [handleRoundWin])

  // Simulation interval for Host
  useEffect(() => {
    if (gamePhase === 'battle' && isHost) {
      simulationTimerRef.current = setInterval(runHostSimulationTick, 32)
      return () => {
        if (simulationTimerRef.current) {
          clearInterval(simulationTimerRef.current)
          simulationTimerRef.current = null
        }
      }
    }
  }, [gamePhase, isHost, runHostSimulationTick])

  // -------------------------------------------------------------
  // Firing Cannon & Spawning Projectiles
  // -------------------------------------------------------------
  const handleFireCannon = () => {
    const currentTanks = tanksRef.current
    const myTank = currentTanks.find((t) => t.slotId === mySlotIdRef.current)
    if (!myTank || !myTank.isAlive) return

    const weaponCfg = WEAPON_TYPES[myTank.weapon] || WEAPON_TYPES.STANDARD
    if (Date.now() - lastFiredTimeRef.current < weaponCfg.cooldownMs) {
      return // Still in cooldown
    }
    lastFiredTimeRef.current = Date.now()

    playTankShootSound()

    const spawnDist = TANK_RADIUS + 12
    const muzzleX = myTank.x + Math.cos(myTank.turretAngle) * spawnDist
    const muzzleY = myTank.y + Math.sin(myTank.turretAngle) * spawnDist

    if (myTank.weapon === 'SHOTGUN') {
      // 3 spreading pellets
      const angles = [myTank.turretAngle - 0.18, myTank.turretAngle, myTank.turretAngle + 0.18]
      const newBullets = angles.map((ang) => ({
        id: `bullet_${Date.now()}_${Math.random()}`,
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(ang) * weaponCfg.speed,
        vy: Math.sin(ang) * weaponCfg.speed,
        radius: BULLET_RADIUS,
        color: weaponCfg.color,
        bounces: 0,
        maxBounces: 0,
        team: myTank.team,
        ownerSlotId: mySlotIdRef.current,
        createdAt: Date.now(),
      }))

      if (isHostRef.current) {
        bulletsRef.current = [...bulletsRef.current, ...newBullets]
        setBullets(bulletsRef.current)
      } else {
        networkRef.current?.sendToHost({ type: 'FIRE_BULLETS', bullets: newBullets })
      }
    } else {
      // Single shell / Rocket / Laser
      const newBullet = {
        id: `bullet_${Date.now()}`,
        x: muzzleX,
        y: muzzleY,
        vx: Math.cos(myTank.turretAngle) * weaponCfg.speed,
        vy: Math.sin(myTank.turretAngle) * weaponCfg.speed,
        radius: myTank.weapon === 'ROCKET' ? 5.5 : BULLET_RADIUS,
        color: weaponCfg.color,
        bounces: 0,
        maxBounces: 0,
        team: myTank.team,
        ownerSlotId: mySlotIdRef.current,
        createdAt: Date.now(),
      }

      if (isHostRef.current) {
        bulletsRef.current = [...bulletsRef.current, newBullet]
        setBullets(bulletsRef.current)
      } else {
        networkRef.current?.sendToHost({ type: 'FIRE_BULLETS', bullets: [newBullet] })
      }
    }

    // Set lastFiredAt on local tank to reveal from bushes
    tanksRef.current = currentTanks.map((t) =>
      t.slotId === mySlotIdRef.current ? { ...t, lastFiredAt: Date.now() } : t
    )
    setTanks(tanksRef.current)
  }

  // -------------------------------------------------------------
  // Radar Ping
  // -------------------------------------------------------------
  const handleTriggerRadarPing = (coords) => {
    const myTank = tanksRef.current.find((t) => t.slotId === mySlotIdRef.current)
    const team = myTank ? myTank.team : 'blue'
    const pingPos = coords || (myTank ? { x: myTank.x, y: myTank.y } : { x: 500, y: 325 })

    playRadarPingSound()

    const newPing = {
      id: `ping_${Date.now()}`,
      x: pingPos.x,
      y: pingPos.y,
      team,
      createdAt: performance.now(),
    }

    setPings((prev) => [...prev.slice(-4), newPing])

    if (networkRef.current) {
      if (isHostRef.current) {
        networkRef.current.broadcast({ type: 'RADAR_PING', ping: newPing })
      } else {
        networkRef.current.sendToHost({ type: 'RADAR_PING', ping: newPing })
      }
    }
  }

  const handleFireCannonRef = useRef(handleFireCannon)
  const handleTriggerRadarPingRef = useRef(handleTriggerRadarPing)

  useEffect(() => {
    handleFireCannonRef.current = handleFireCannon
    handleTriggerRadarPingRef.current = handleTriggerRadarPing
  })

  // -------------------------------------------------------------
  // Keyboard Event Listeners (Desktop)
  // -------------------------------------------------------------
  useEffect(() => {
    if (gamePhase !== 'battle') return

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      let changed = false

      if (key === 'w' || key === 'arrowup') {
        localInputRef.current.forward = true
        changed = true
      }
      if (key === 's' || key === 'arrowdown') {
        localInputRef.current.reverse = true
        changed = true
      }
      if (key === 'a' || key === 'arrowleft') {
        localInputRef.current.steerLeft = true
        changed = true
      }
      if (key === 'd' || key === 'arrowright') {
        localInputRef.current.steerRight = true
        changed = true
      }
      if (key === ' ') {
        e.preventDefault()
        handleFireCannonRef.current?.()
      }
      if (key === 'e') {
        e.preventDefault()
        handleTriggerRadarPingRef.current?.()
      }

      if (changed && !isHostRef.current && networkRef.current) {
        networkRef.current.sendToHost({
          type: 'PLAYER_INPUT',
          slotId: mySlotIdRef.current,
          input: localInputRef.current,
        })
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      let changed = false

      if (key === 'w' || key === 'arrowup') {
        localInputRef.current.forward = false
        changed = true
      }
      if (key === 's' || key === 'arrowdown') {
        localInputRef.current.reverse = false
        changed = true
      }
      if (key === 'a' || key === 'arrowleft') {
        localInputRef.current.steerLeft = false
        changed = true
      }
      if (key === 'd' || key === 'arrowright') {
        localInputRef.current.steerRight = false
        changed = true
      }

      if (changed && !isHostRef.current && networkRef.current) {
        networkRef.current.sendToHost({
          type: 'PLAYER_INPUT',
          slotId: mySlotIdRef.current,
          input: localInputRef.current,
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gamePhase])

  // Mouse Aim on Canvas
  const handleCanvasPointerMove = (coords) => {
    const myTank = tanksRef.current.find((t) => t.slotId === mySlotIdRef.current)
    if (!myTank) return

    const angle = Math.atan2(coords.y - myTank.y, coords.x - myTank.x)
    localInputRef.current.turretAngle = angle
    localInputRef.current.aimCoord = coords

    if (!isHostRef.current && networkRef.current) {
      networkRef.current.sendToHost({
        type: 'PLAYER_INPUT',
        slotId: mySlotIdRef.current,
        input: localInputRef.current,
      })
    }
  }

  // Virtual Joystick Aim Change Handler
  const handleAimChange = useCallback((worldAngle) => {
    localInputRef.current.turretAngle = worldAngle
    if (!isHostRef.current && networkRef.current) {
      networkRef.current.sendToHost({
        type: 'PLAYER_INPUT',
        slotId: mySlotIdRef.current,
        input: localInputRef.current,
      })
    }
  }, [])

  // -------------------------------------------------------------
  // Host Handlers for Client Join / Leave
  // -------------------------------------------------------------
  const handleClientJoin = useCallback((clientPeerId, clientPlayer, conn) => {
    const currentMode = modeRef.current
    const modeConfig = MODES[currentMode] || MODES['1v1']
    const currentPlayers = playersRef.current

    const occupiedSlots = new Set(currentPlayers.map((p) => p.slotId))
    const freeSlot = modeConfig.slots.find((s) => !occupiedSlots.has(s.id))
    const assignedSlotId = freeSlot ? freeSlot.id : 'p2'
    const slotDef = modeConfig.slots.find((s) => s.id === assignedSlotId)
    const assignedTeam = slotDef ? slotDef.team : 'red'

    const newPlayer = {
      id: clientPlayer?.id || `player_${Date.now()}`,
      name: clientPlayer?.name || 'Commander',
      peerId: clientPeerId,
      slotId: assignedSlotId,
      team: assignedTeam,
      isReady: false,
      isHost: false,
    }

    const filtered = currentPlayers.filter(
      (p) =>
        p.peerId !== clientPeerId &&
        (!clientPlayer?.id || p.id !== clientPlayer.id) &&
        p.slotId !== assignedSlotId
    )
    const updated = [...filtered, newPlayer]
    playersRef.current = updated
    setPlayers(updated)

    try {
      conn.send({
        type: 'WELCOME',
        mySlotId: assignedSlotId,
        players: updated,
        mode: currentMode,
      })
    } catch (e) {
      console.warn('[Host] send WELCOME error:', e)
    }

    setTimeout(() => {
      networkRef.current?.broadcast({
        type: 'LOBBY_STATE',
        players: updated,
        mode: currentMode,
      })
    }, 50)
  }, [])

  const handlePlayerLeave = useCallback((peerId) => {
    const currentPlayers = playersRef.current
    const updated = currentPlayers.filter((p) => p.peerId !== peerId)
    playersRef.current = updated
    setPlayers(updated)
    networkRef.current?.broadcast({
      type: 'LOBBY_STATE',
      players: updated,
      mode: modeRef.current,
    })
  }, [])

  // -------------------------------------------------------------
  // Network Message Dispatcher
  // -------------------------------------------------------------
  const handleNetworkMessage = useCallback((data, _senderPeerId) => {
    if (!data || !data.type) return

    switch (data.type) {
      case 'WELCOME': {
        if (data.mySlotId) {
          setMySlotId(data.mySlotId)
          mySlotIdRef.current = data.mySlotId
        }
        if (data.players) {
          setPlayers(data.players)
          playersRef.current = data.players
        }
        if (data.mode) {
          setMode(data.mode)
          modeRef.current = data.mode
        }
        setConnectionStatus('connected')
        break
      }

      case 'TOGGLE_READY': {
        if (isHostRef.current) {
          const senderPeerId = _senderPeerId || data.peerId
          const updated = playersRef.current.map((p) => {
            const isMatch =
              (senderPeerId && p.peerId === senderPeerId) ||
              (data.slotId && p.slotId === data.slotId)
            if (!isMatch) return p
            const newReady = typeof data.isReady === 'boolean' ? data.isReady : !p.isReady
            return { ...p, isReady: newReady }
          })
          playersRef.current = updated
          setPlayers(updated)
          networkRef.current?.broadcast({
            type: 'LOBBY_STATE',
            players: updated,
            mode: modeRef.current,
          })
        }
        break
      }

      case 'CHANGE_SLOT': {
        if (isHostRef.current) {
          const currentMode = modeRef.current
          const slotConfig = MODES[currentMode]?.slots.find((s) => s.id === data.newSlot)
          if (slotConfig) {
            const currentPlayers = playersRef.current
            const isOccupied = currentPlayers.some((p) => p.slotId === data.newSlot)
            if (!isOccupied) {
              const senderPeerId = _senderPeerId || data.peerId
              const updated = currentPlayers.map((p) => {
                const isMatch =
                  (senderPeerId && p.peerId === senderPeerId) ||
                  (data.oldSlot && p.slotId === data.oldSlot)
                return isMatch
                  ? { ...p, slotId: data.newSlot, team: slotConfig.team }
                  : p
              })
              playersRef.current = updated
              setPlayers(updated)
              networkRef.current?.broadcast({
                type: 'LOBBY_STATE',
                players: updated,
                mode: currentMode,
              })
            }
          }
        }
        break
      }

      case 'LOBBY_STATE': {
        if (data.players) {
          setPlayers(data.players)
          playersRef.current = data.players
        }
        if (data.mode) {
          setMode(data.mode)
          modeRef.current = data.mode
        }
        if (!isHostRef.current && data.players && networkRef.current) {
          const me = data.players.find(
            (p) =>
              (networkRef.current?.myPeerId && p.peerId === networkRef.current.myPeerId) ||
              p.name === playerNameRef.current
          )
          if (me && me.slotId) {
            setMySlotId(me.slotId)
            mySlotIdRef.current = me.slotId
          }
        }
        break
      }

      case 'START_MATCH': {
        setGamePhase('battle')
        if (data.score) {
          setScore(data.score)
          scoreRef.current = data.score
        }
        if (data.tanks) {
          setTanks(data.tanks)
          tanksRef.current = data.tanks
        }
        if (data.obstacles) {
          setObstacles(data.obstacles)
          obstaclesRef.current = data.obstacles
        }
        if (data.barrels) {
          setBarrels(data.barrels)
          barrelsRef.current = data.barrels
        }
        setBullets([])
        bulletsRef.current = []
        setCrates([])
        cratesRef.current = []
        setParticles([])
        particlesRef.current = []
        setPings([])
        pingsRef.current = []
        setRoundStatus('playing')
        roundStatusRef.current = 'playing'
        setRoundWinner(null)
        roundWinnerRef.current = null
        setMatchWinner(null)
        break
      }

      case 'WORLD_STATE': {
        if (!isHostRef.current) {
          if (data.tanks) {
            setTanks(data.tanks)
            tanksRef.current = data.tanks
          }
          if (data.bullets) {
            setBullets(data.bullets)
            bulletsRef.current = data.bullets
          }
          if (data.obstacles) {
            setObstacles(data.obstacles)
            obstaclesRef.current = data.obstacles
          }
          if (data.barrels) {
            setBarrels(data.barrels)
            barrelsRef.current = data.barrels
          }
          if (data.crates) {
            setCrates(data.crates)
            cratesRef.current = data.crates
          }
          if (data.score) {
            setScore(data.score)
            scoreRef.current = data.score
          }
          if (data.roundStatus) {
            setRoundStatus(data.roundStatus)
            roundStatusRef.current = data.roundStatus
          }
          if (data.roundWinner !== undefined) {
            setRoundWinner(data.roundWinner)
            roundWinnerRef.current = data.roundWinner
          }
        }
        break
      }

      case 'PLAYER_INPUT': {
        if (isHostRef.current && data.slotId && data.input) {
          tanksRef.current = tanksRef.current.map((t) =>
            t.slotId === data.slotId ? { ...t, remoteInput: data.input } : t
          )
        }
        break
      }

      case 'FIRE_BULLETS': {
        if (isHostRef.current && Array.isArray(data.bullets)) {
          bulletsRef.current = [...bulletsRef.current, ...data.bullets]
          setBullets(bulletsRef.current)
        }
        break
      }

      case 'RADAR_PING': {
        if (data.ping) {
          playRadarPingSound()
          setPings((p) => [...p.slice(-4), data.ping])
          if (isHostRef.current) {
            networkRef.current?.broadcast(data)
          }
        }
        break
      }

      case 'MATCH_OVER': {
        setMatchWinner(data.winner)
        setGamePhase('game_over')
        break
      }

      case 'REMATCH_START': {
        setGamePhase('battle')
        setScore({ blue: 0, red: 0 })
        scoreRef.current = { blue: 0, red: 0 }
        setRoundStatus('playing')
        roundStatusRef.current = 'playing'
        setRoundWinner(null)
        roundWinnerRef.current = null
        setMatchWinner(null)
        if (data.tanks) {
          setTanks(data.tanks)
          tanksRef.current = data.tanks
        }
        if (data.obstacles) {
          setObstacles(data.obstacles)
          obstaclesRef.current = data.obstacles
        }
        if (data.barrels) {
          setBarrels(data.barrels)
          barrelsRef.current = data.barrels
        }
        setBullets([])
        bulletsRef.current = []
        setCrates([])
        cratesRef.current = []
        break
      }

      default:
        break
    }
  }, [])

  // Keep callback refs fresh
  useEffect(() => {
    handleNetworkMessageRef.current = handleNetworkMessage
    handleClientJoinRef.current = handleClientJoin
    handlePlayerLeaveRef.current = handlePlayerLeave
  })

  // -------------------------------------------------------------
  // Host Room Creation
  // -------------------------------------------------------------
  const handleCreateRoom = async () => {
    setError(null)
    const code = generateRoomCode()
    setRoomCode(code)
    setIsHost(true)
    isHostRef.current = true
    setMySlotId('p1')
    mySlotIdRef.current = 'p1'

    const initialPlayer = {
      id: `player_${Date.now()}`,
      name: playerName || 'Host_Commander',
      slotId: 'p1',
      team: 'blue',
      isReady: false,
      isHost: true,
    }
    playersRef.current = [initialPlayer]
    setPlayers([initialPlayer])

    try {
      const net = new TankNetwork({
        onStatusChange: (status) => setConnectionStatus(status),
        onClientJoin: (clientPeerId, clientPlayer, conn) =>
          handleClientJoinRef.current?.(clientPeerId, clientPlayer, conn),
        onPlayerLeave: (peerId) => handlePlayerLeaveRef.current?.(peerId),
        onMessage: (data, senderPeerId) =>
          handleNetworkMessageRef.current?.(data, senderPeerId),
        onError: (err) => setError(err.message || 'Connection error'),
      })

      const id = await net.init(code, true)
      setMyPeerId(id)
      networkRef.current = net
      setConnectionStatus('hosting')
    } catch (err) {
      setError(err.message || 'Failed to create room.')
      setConnectionStatus('idle')
    }
  }

  // -------------------------------------------------------------
  // Join Existing Room
  // -------------------------------------------------------------
  const handleJoinRoom = async () => {
    const cleanCode = (inputCode || '').trim().toUpperCase()
    if (!cleanCode || cleanCode.length < 3) return
    setError(null)
    setIsHost(false)
    isHostRef.current = false
    setConnectionStatus('connecting')

    const myPlayer = {
      id: `player_${Date.now()}`,
      name: playerName || 'Commander',
      isReady: false,
      isHost: false,
    }

    try {
      const net = new TankNetwork({
        onStatusChange: (status) => setConnectionStatus(status),
        onMessage: (data, senderPeerId) =>
          handleNetworkMessageRef.current?.(data, senderPeerId),
        onError: (err) => setError(err.message || 'Could not connect to room'),
      })

      const id = await net.init(cleanCode, false, myPlayer)
      setMyPeerId(id)
      networkRef.current = net
      setRoomCode(cleanCode)
    } catch (err) {
      setError(err.message || 'Room not found or host unreachable.')
      setConnectionStatus('idle')
    }
  }

  // Switch Slot in Lobby
  const handleSelectSlot = (slotId) => {
    const currentMode = modeRef.current
    const slotConfig = MODES[currentMode]?.slots.find((s) => s.id === slotId)
    if (!slotConfig) return

    const oldSlot = mySlotIdRef.current

    if (isHostRef.current) {
      setMySlotId(slotId)
      mySlotIdRef.current = slotId
      const updated = playersRef.current.map((p) =>
        p.slotId === oldSlot ? { ...p, slotId, team: slotConfig.team } : p
      )
      playersRef.current = updated
      setPlayers(updated)
      networkRef.current?.broadcast({
        type: 'LOBBY_STATE',
        players: updated,
        mode: currentMode,
      })
    } else {
      setMySlotId(slotId)
      mySlotIdRef.current = slotId
      const updated = playersRef.current.map((p) =>
        p.slotId === oldSlot ||
        (networkRef.current?.myPeerId && p.peerId === networkRef.current.myPeerId)
          ? { ...p, slotId, team: slotConfig.team }
          : p
      )
      playersRef.current = updated
      setPlayers(updated)
      networkRef.current?.sendToHost({
        type: 'CHANGE_SLOT',
        oldSlot,
        newSlot: slotId,
        peerId: networkRef.current?.myPeerId,
      })
    }
  }

  // Toggle Ready
  const handleToggleReady = () => {
    if (isHostRef.current) {
      const updated = playersRef.current.map((p) =>
        p.slotId === mySlotIdRef.current ? { ...p, isReady: !p.isReady } : p
      )
      playersRef.current = updated
      setPlayers(updated)
      networkRef.current?.broadcast({
        type: 'LOBBY_STATE',
        players: updated,
        mode: modeRef.current,
      })
    } else {
      const myPlayer = playersRef.current.find(
        (p) =>
          p.slotId === mySlotIdRef.current ||
          (networkRef.current?.myPeerId && p.peerId === networkRef.current.myPeerId)
      )
      const nextReady = myPlayer ? !myPlayer.isReady : true
      const updated = playersRef.current.map((p) =>
        p.slotId === mySlotIdRef.current ||
        (networkRef.current?.myPeerId && p.peerId === networkRef.current.myPeerId)
          ? { ...p, isReady: nextReady }
          : p
      )
      playersRef.current = updated
      setPlayers(updated)

      networkRef.current?.sendToHost({
        type: 'TOGGLE_READY',
        slotId: mySlotIdRef.current,
        peerId: networkRef.current?.myPeerId,
        isReady: nextReady,
      })
    }
  }

  const handleSelectMode = (newMode) => {
    setMode(newMode)
    modeRef.current = newMode
    if (isHostRef.current && networkRef.current) {
      networkRef.current.broadcast({
        type: 'LOBBY_STATE',
        players: playersRef.current,
        mode: newMode,
      })
    }
  }

  // Start Game (Host only)
  const handleStartGame = () => {
    if (!isHostRef.current) return

    const initialWorld = initRoundWorld({ blue: 0, red: 0 }, 0)
    setGamePhase('battle')

    networkRef.current?.broadcast({
      type: 'START_MATCH',
      score: { blue: 0, red: 0 },
      tanks: initialWorld.tanks,
      obstacles: initialWorld.obstacles,
      barrels: initialWorld.barrels,
    })
  }

  // Rematch
  const handleRematch = () => {
    if (!isHostRef.current) return
    const initialWorld = initRoundWorld({ blue: 0, red: 0 }, currentMapIndexRef.current + 1)
    setGamePhase('battle')
    setMatchWinner(null)

    networkRef.current?.broadcast({
      type: 'REMATCH_START',
      tanks: initialWorld.tanks,
      obstacles: initialWorld.obstacles,
      barrels: initialWorld.barrels,
    })
  }

  const handleLeaveRoom = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current)
      simulationTimerRef.current = null
    }
    if (networkRef.current) {
      networkRef.current.destroy()
      networkRef.current = null
    }
    setRoomCode('')
    setInputCode('')
    setIsHost(false)
    isHostRef.current = false
    setGamePhase('lobby')
    setConnectionStatus('idle')
    setPlayers([])
    playersRef.current = []
    setMySlotId('p1')
    mySlotIdRef.current = 'p1'
    setMyPeerId('')
  }

  // Active tank for local player
  const myTank = tanks.find((t) => t.slotId === mySlotId)

  return (
    <div className="w-full flex flex-col items-center justify-center select-none">
      {/* 1. Lobby Phase */}
      {gamePhase === 'lobby' && (
        <TankLobby
          mode={mode}
          onSelectMode={handleSelectMode}
          roomCode={roomCode}
          inputCode={inputCode}
          onChangeInputCode={setInputCode}
          playerName={playerName}
          onChangePlayerName={setPlayerName}
          isHost={isHost}
          connectionStatus={connectionStatus}
          players={players}
          mySlotId={mySlotId}
          myPeerId={myPeerId}
          onSelectSlot={handleSelectSlot}
          onToggleReady={handleToggleReady}
          onStartGame={handleStartGame}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onBackToMenu={onBackToMenu}
          error={error}
        />
      )}

      {/* 2. Battle Phase */}
      {gamePhase === 'battle' && (
        <div
          className={
            isPortrait
              ? 'fixed inset-0 z-40 bg-zinc-950 flex flex-col items-center justify-center select-none overflow-hidden touch-none'
              : 'relative w-full max-w-5xl mx-auto flex items-center justify-center select-none animate-fadeIn px-2'
          }
        >
          <div
            className={
              isPortrait
                ? 'relative w-full h-full max-h-[100dvh] flex items-center justify-center'
                : 'relative w-full h-auto flex items-center justify-center'
            }
          >
            <TankCanvas
              tanks={tanks}
              bullets={bullets}
              obstacles={obstacles}
              barrels={barrels}
              crates={crates}
              particles={particles}
              pings={pings}
              mySlotId={mySlotId}
              score={score}
              targetScore={TARGET_SCORE_DEFAULT}
              roundStatus={roundStatus}
              roundWinner={roundWinner}
              is2v2={mode === '2v2'}
              isPortrait={isPortrait}
              onCanvasPointerMove={handleCanvasPointerMove}
              onCanvasPointerDown={() => handleFireCannon()}
              onCanvasContextMenu={handleTriggerRadarPing}
            />

            <TankControls
              onInputChange={(delta) => {
                localInputRef.current = { ...localInputRef.current, ...delta }
                if (!isHostRef.current && networkRef.current) {
                  networkRef.current.sendToHost({
                    type: 'PLAYER_INPUT',
                    slotId: mySlotIdRef.current,
                    input: localInputRef.current,
                  })
                }
              }}
              onAimChange={handleAimChange}
              onFire={handleFireCannon}
              onPing={handleTriggerRadarPing}
              activeWeapon={myTank?.weapon || 'STANDARD'}
              hasShield={!!myTank?.shield}
              isAlive={myTank?.isAlive ?? true}
              is2v2={mode === '2v2'}
              isPortrait={isPortrait}
              onToggleOrientation={() => setIsPortrait((prev) => !prev)}
              onLeaveGame={handleLeaveRoom}
              onOpenRules={() => setLocalRulesOpen(true)}
              soundOn={soundOn}
              onToggleSound={handleToggleSound}
            />
          </div>
        </div>
      )}

      {/* 3. Game Over Modal */}
      {gamePhase === 'game_over' && matchWinner && (
        <TankGameOverModal
          winner={matchWinner}
          score={score}
          isHost={isHost}
          onRematch={handleRematch}
          onBackToLobby={() => {
            setGamePhase('lobby')
            setMatchWinner(null)
          }}
        />
      )}

      {/* Rules Modal */}
      <TankRulesModal
        isOpen={isRulesOpen || localRulesOpen}
        onClose={() => {
          onCloseRules?.()
          setLocalRulesOpen(false)
        }}
      />
    </div>
  )
}

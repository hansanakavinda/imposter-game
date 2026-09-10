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
} from '../../utils/sound'

export default function TankGame({
  onBackToMenu,
  isRulesOpen,
  onCloseRules,
  initialRoomCode = '',
}) {
  // Lobby State
  const [mode, setMode] = useState('1v1') // '1v1' or '2v2'
  const [roomCode, setRoomCode] = useState(initialRoomCode)
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
  const [players, setPlayers] = useState([]) // array of { id, name, slotId, team, isReady, isHost }
  const [mySlotId, setMySlotId] = useState('p1')
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

  // Local Input tracking
  const localInputRef = useRef({
    forward: false,
    reverse: false,
    steerLeft: false,
    steerRight: false,
    turretAngle: 0,
    aimCoord: { x: 500, y: 325 },
  })

  const networkRef = useRef(null)
  const simulationTimerRef = useRef(null)
  const lastCrateDropRef = useRef(0)
  const lastFiredTimeRef = useRef(0)
  const modeRef = useRef(mode)
  const playersRef = useRef(players)
  const mySlotIdRef = useRef(mySlotId)

  useEffect(() => {
    modeRef.current = mode
    playersRef.current = players
    mySlotIdRef.current = mySlotId
  }, [mode, players, mySlotId])

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
      }
      if (networkRef.current) {
        networkRef.current.destroy()
      }
    }
  }, [])

  // -------------------------------------------------------------
  // Spawn & World Initialization (Host Authoritative)
  // -------------------------------------------------------------
  const initRoundWorld = useCallback((currentScore = score, mapIdx = currentMapIndex) => {
    const map = getBattlefieldMap(mapIdx)
    const spawns = getSpawnPoints(mode)

    const initialTanks = []
    const modeConfig = MODES[mode]

    modeConfig.slots.forEach((slot) => {
      const p = players.find((pl) => pl.slotId === slot.id)
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

    setTanks(initialTanks)
    setObstacles(map.obstacles)
    setBarrels(map.barrels)
    setBullets([])
    setCrates([])
    setParticles([])
    setPings([])
    setRoundStatus('playing')
    setRoundWinner(null)
    lastCrateDropRef.current = Date.now()

    return {
      tanks: initialTanks,
      obstacles: map.obstacles,
      barrels: map.barrels,
      score: currentScore,
      mapIndex: mapIdx,
    }
  }, [mode, players, score, currentMapIndex])

  // Handle Round Win & Score Update
  const handleRoundWin = useCallback((winner) => {
    setRoundStatus('round_win')
    setRoundWinner(winner)
    playTankExplosionSound()

    setScore((prevScore) => {
      const newScore = {
        ...prevScore,
        [winner]: prevScore[winner] + 1,
      }

      if (newScore[winner] >= TARGET_SCORE_DEFAULT) {
        setTimeout(() => {
          setMatchWinner(winner)
          setGamePhase('game_over')
        }, 1800)
      } else {
        setTimeout(() => {
          setCurrentMapIndex((prev) => {
            const nextMap = prev + 1
            initRoundWorld(newScore, nextMap)
            return nextMap
          })
        }, 2400)
      }
      return newScore
    })
  }, [initRoundWorld])

  // -------------------------------------------------------------
  // Host Game Simulation Loop (~35Hz)
  // -------------------------------------------------------------
  const runHostSimulationTick = useCallback(() => {
    if (roundStatus !== 'playing') return

    setTanks((prevTanks) => {
      let updatedTanks = prevTanks.map((tank) => {
        if (!tank.isAlive) return tank

        // Determine input for this tank
        let input = { forward: false, reverse: false, steerLeft: false, steerRight: false }
        if (tank.slotId === mySlotId) {
          input = localInputRef.current
        } else {
          input = tank.remoteInput || input
        }

        // 1. Steering Rotation
        let newAngle = tank.angle
        if (input.steerLeft) newAngle -= TANK_TURN_SPEED
        if (input.steerRight) newAngle += TANK_TURN_SPEED

        // 2. Mud speed modifier
        const inMud = isTankInMud(tank, obstacles)
        const speedMult = inMud ? TANK_MUD_SPEED_MULT : 1.0

        // 3. Movement
        let targetX = tank.x
        let targetY = tank.y
        if (input.forward) {
          targetX += Math.cos(newAngle) * TANK_SPEED * speedMult
          targetY += Math.sin(newAngle) * TANK_SPEED * speedMult
        } else if (input.reverse) {
          targetX -= Math.cos(newAngle) * TANK_REVERSE_SPEED * speedMult
          targetY -= Math.sin(newAngle) * TANK_REVERSE_SPEED * speedMult
        }

        // 4. Collision resolution against obstacles, barrels, and other tanks
        const resolved = moveTankWithCollision(tank, targetX, targetY, obstacles, barrels, prevTanks)

        return {
          ...tank,
          x: resolved.x,
          y: resolved.y,
          angle: newAngle,
          turretAngle: input.turretAngle ?? tank.turretAngle ?? newAngle,
        }
      })

      // 5. Check Crate Pickups
      setCrates((prevCrates) => {
        if (!prevCrates.length) return prevCrates
        const remaining = []

        prevCrates.forEach((crate) => {
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
            // Apply powerup
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
            remaining.push(crate)
          }
        })

        return remaining
      })

      return updatedTanks
    })

    // 6. Update Bullets & Collisions
    setBullets((prevBullets) => {
      if (!prevBullets.length) return prevBullets
      const remainingBullets = []

      prevBullets.forEach((bullet) => {
        let bx = bullet.x + bullet.vx
        let by = bullet.y + bullet.vy
        let bounces = bullet.bounces
        let destroyed = false

        // A. Arena boundary bounce
        if (bx <= BULLET_RADIUS || bx >= ARENA_WIDTH - BULLET_RADIUS) {
          bullet.vx = -bullet.vx
          bx = Math.max(BULLET_RADIUS, Math.min(ARENA_WIDTH - BULLET_RADIUS, bx))
          bounces++
          playTankRicochetSound()
        }
        if (by <= BULLET_RADIUS || by >= ARENA_HEIGHT - BULLET_RADIUS) {
          bullet.vy = -bullet.vy
          by = Math.max(BULLET_RADIUS, Math.min(ARENA_HEIGHT - BULLET_RADIUS, by))
          bounces++
          playTankRicochetSound()
        }

        // B. Steel & Brick Obstacle Collisions
        for (let i = 0; i < obstacles.length; i++) {
          const obs = obstacles[i]
          if (
            obs.type === TERRAIN_TYPES.STEEL ||
            (obs.type === TERRAIN_TYPES.BRICK && (obs.hp || 0) > 0)
          ) {
            const col = testCircleRect(bx, by, bullet.radius, obs.x, obs.y, obs.width, obs.height)
            if (col.collided) {
              if (obs.type === TERRAIN_TYPES.STEEL) {
                // Ricochet reflection v' = v - 2(v·n)n
                const dot = bullet.vx * col.normal.x + bullet.vy * col.normal.y
                bullet.vx = bullet.vx - 2 * dot * col.normal.x
                bullet.vy = bullet.vy - 2 * dot * col.normal.y
                bx += col.normal.x * (col.depth + 1)
                by += col.normal.y * (col.depth + 1)
                bounces++
                playTankRicochetSound()
              } else if (obs.type === TERRAIN_TYPES.BRICK) {
                // Damage brick wall
                obs.hp -= 1
                destroyed = true
                playTankRicochetSound()
                break
              }
            }
          }
        }

        // C. Explosive Barrels Collision
        if (!destroyed && barrels) {
          for (let i = 0; i < barrels.length; i++) {
            const barrel = barrels[i]
            if (barrel.hp > 0) {
              const dx = bx - barrel.x
              const dy = by - barrel.y
              if (dx * dx + dy * dy < (bullet.radius + barrel.radius) * (bullet.radius + barrel.radius)) {
                barrel.hp = 0
                destroyed = true
                playBarrelExplosionSound()

                // Barrel AOE blast
                setTanks((currTanks) =>
                  currTanks.map((t) => {
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
                )
                break
              }
            }
          }
        }

        // D. Tank Hit Check (Friendly Fire Safe!)
        if (!destroyed) {
          setTanks((currTanks) => {
            let hitTank = null
            const mapped = currTanks.map((t) => {
              if (!t.isAlive || t.team === bullet.team) return t

              const dx = bx - t.x
              const dy = by - t.y
              if (dx * dx + dy * dy < (bullet.radius + TANK_RADIUS) * (bullet.radius + TANK_RADIUS)) {
                hitTank = t
                if (t.shield) {
                  return { ...t, shield: false } // Shield absorbs hit
                }
                return { ...t, isAlive: false } // Destroyed
              }
              return t
            })

            if (hitTank) {
              destroyed = true
              playTankExplosionSound()
            }
            return mapped
          })
        }

        // E. Lifetime or bounce expiry
        if (!destroyed && bounces <= bullet.maxBounces) {
          remainingBullets.push({
            ...bullet,
            x: bx,
            y: by,
            bounces,
          })
        }
      })

      return remainingBullets
    })

    // 7. Crate Drop Timer (Spawns mystery weapon crate in open center)
    if (Date.now() - lastCrateDropRef.current > CRATE_DROP_INTERVAL_MS) {
      lastCrateDropRef.current = Date.now()
      const weaponOptions = ['LASER', 'ROCKET', 'SHOTGUN', 'SHIELD']
      const chosenWeapon = weaponOptions[Math.floor(Math.random() * weaponOptions.length)]
      const randomX = 350 + Math.random() * 300
      const randomY = 150 + Math.random() * 350
      setCrates((c) => [
        ...c,
        { id: `crate_${Date.now()}`, x: randomX, y: randomY, type: chosenWeapon },
      ])
    }

    // 8. Check Round Win Condition (One team eliminated)
    setTanks((currentTanks) => {
      const hasBlue = currentTanks.some((t) => t.team === 'blue')
      const hasRed = currentTanks.some((t) => t.team === 'red')

      if (hasBlue && hasRed) {
        const aliveBlue = currentTanks.some((t) => t.team === 'blue' && t.isAlive)
        const aliveRed = currentTanks.some((t) => t.team === 'red' && t.isAlive)

        if (!aliveBlue || !aliveRed) {
          let winner = null
          if (aliveBlue && !aliveRed) winner = 'blue'
          if (aliveRed && !aliveBlue) winner = 'red'

          if (winner && roundStatus === 'playing') {
            handleRoundWin(winner)
          }
        }
      }
      return currentTanks
    })

    // 9. Host Broadcasts World State to Clients
    if (networkRef.current && isHost) {
      networkRef.current.broadcast({
        type: 'WORLD_STATE',
        tanks,
        bullets,
        obstacles,
        barrels,
        crates,
        score,
        roundStatus,
        roundWinner,
      })
    }
  }, [
    roundStatus,
    obstacles,
    barrels,
    mySlotId,
    score,
    isHost,
    tanks,
    bullets,
    crates,
    roundWinner,
    handleRoundWin,
  ])

  // Run simulation interval on Host
  useEffect(() => {
    if (gamePhase === 'battle' && isHost) {
      simulationTimerRef.current = setInterval(runHostSimulationTick, 32) // ~32ms = ~31 FPS physics tick
      return () => {
        if (simulationTimerRef.current) clearInterval(simulationTimerRef.current)
      }
    }
  }, [gamePhase, isHost, runHostSimulationTick])

  // -------------------------------------------------------------
  // Firing Cannon & Spawning Projectiles
  // -------------------------------------------------------------
  const handleFireCannon = () => {
    const myTank = tanks.find((t) => t.slotId === mySlotId)
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
        maxBounces: weaponCfg.maxBounces,
        team: myTank.team,
        ownerSlotId: mySlotId,
      }))

      if (isHost) {
        setBullets((b) => [...b, ...newBullets])
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
        maxBounces: weaponCfg.maxBounces,
        team: myTank.team,
        ownerSlotId: mySlotId,
      }

      if (isHost) {
        setBullets((b) => [...b, newBullet])
      } else {
        networkRef.current?.sendToHost({ type: 'FIRE_BULLETS', bullets: [newBullet] })
      }
    }

    // Set lastFiredAt on local tank to reveal from bushes
    setTanks((curr) =>
      curr.map((t) => (t.slotId === mySlotId ? { ...t, lastFiredAt: Date.now() } : t))
    )
  }

  // -------------------------------------------------------------
  // Radar Ping
  // -------------------------------------------------------------
  const handleTriggerRadarPing = (coords) => {
    const myTank = tanks.find((t) => t.slotId === mySlotId)
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
      if (isHost) {
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

      if (changed && !isHost && networkRef.current) {
        networkRef.current.sendToHost({
          type: 'PLAYER_INPUT',
          slotId: mySlotId,
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

      if (changed && !isHost && networkRef.current) {
        networkRef.current.sendToHost({
          type: 'PLAYER_INPUT',
          slotId: mySlotId,
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
  }, [gamePhase, isHost, mySlotId])

  // Mouse Aim on Canvas
  const handleCanvasPointerMove = (coords) => {
    const myTank = tanks.find((t) => t.slotId === mySlotId)
    if (!myTank) return

    const angle = Math.atan2(coords.y - myTank.y, coords.x - myTank.x)
    localInputRef.current.turretAngle = angle
    localInputRef.current.aimCoord = coords

    if (!isHost && networkRef.current) {
      networkRef.current.sendToHost({
        type: 'PLAYER_INPUT',
        slotId: mySlotId,
        input: localInputRef.current,
      })
    }
  }

  // -------------------------------------------------------------
  // Network Message Dispatcher
  // -------------------------------------------------------------
  const handleNetworkMessage = useCallback(
    (data, _senderPeerId) => {
      switch (data.type) {
        case 'WELCOME': {
          if (data.mySlotId) setMySlotId(data.mySlotId)
          if (data.players) setPlayers(data.players)
          if (data.mode) setMode(data.mode)
          setConnectionStatus('connected')
          break
        }
        case 'JOIN_LOBBY': {
          if (isHost && data.player) {
            setPlayers((prev) => {
              const currentSlots = MODES[mode].slots
              const occupiedSlots = new Set(prev.map((p) => p.slotId))
              const requestedSlot = data.player.slotId
              const isFree = requestedSlot && !occupiedSlots.has(requestedSlot)
              const fallbackSlot = currentSlots.find((s) => !occupiedSlots.has(s.id))
              const finalSlotId = isFree ? requestedSlot : (fallbackSlot ? fallbackSlot.id : 'p2')
              const slotInfo = currentSlots.find((s) => s.id === finalSlotId)

              const newPlayer = {
                id: data.player.id || `p_${Date.now()}`,
                name: data.player.name || 'Commander',
                peerId: _senderPeerId,
                slotId: finalSlotId,
                team: slotInfo ? slotInfo.team : 'red',
                isReady: false,
                isHost: false,
              }

              const filtered = prev.filter((p) => p.peerId !== _senderPeerId && p.slotId !== finalSlotId)
              const updated = [...filtered, newPlayer]

              networkRef.current?.broadcast({
                type: 'LOBBY_STATE',
                players: updated,
                mode,
              })

              return updated
            })
          }
          break
        }
        case 'TOGGLE_READY': {
          if (isHost) {
            setPlayers((prev) => {
              const updated = prev.map((p) =>
                p.slotId === data.slotId ? { ...p, isReady: !p.isReady } : p
              )
              networkRef.current?.broadcast({
                type: 'LOBBY_STATE',
                players: updated,
                mode,
              })
              return updated
            })
          }
          break
        }
        case 'CHANGE_SLOT': {
          if (isHost) {
            const slotConfig = MODES[mode].slots.find((s) => s.id === data.newSlot)
            if (slotConfig) {
              setPlayers((prev) => {
                const isOccupied = prev.some((p) => p.slotId === data.newSlot)
                if (isOccupied) return prev

                const updated = prev.map((p) =>
                  p.slotId === data.oldSlot
                    ? { ...p, slotId: data.newSlot, team: slotConfig.team }
                    : p
                )
                networkRef.current?.broadcast({
                  type: 'LOBBY_STATE',
                  players: updated,
                  mode,
                })
                return updated
              })
            }
          }
          break
        }
        case 'LOBBY_STATE': {
          setPlayers(data.players)
          if (data.mode) setMode(data.mode)
          if (!isHost && data.players && networkRef.current) {
            const me = data.players.find(
              (p) => p.peerId === networkRef.current.myPeerId || p.name === playerName
            )
            if (me) {
              setMySlotId(me.slotId)
            }
          }
          break
        }
        case 'START_MATCH': {
          setGamePhase('battle')
          setScore(data.score)
          setTanks(data.tanks)
          setObstacles(data.obstacles)
          setBarrels(data.barrels)
          break
        }
        case 'WORLD_STATE': {
          if (!isHost) {
            setTanks(data.tanks)
            setBullets(data.bullets)
            setObstacles(data.obstacles)
            setBarrels(data.barrels)
            setCrates(data.crates)
            setScore(data.score)
            setRoundStatus(data.roundStatus)
            setRoundWinner(data.roundWinner)
          }
          break
        }
        case 'PLAYER_INPUT': {
          if (isHost) {
            setTanks((prev) =>
              prev.map((t) =>
                t.slotId === data.slotId ? { ...t, remoteInput: data.input } : t
              )
            )
          }
          break
        }
        case 'FIRE_BULLETS': {
          if (isHost) {
            setBullets((b) => [...b, ...data.bullets])
          }
          break
        }
        case 'RADAR_PING': {
          playRadarPingSound()
          setPings((p) => [...p.slice(-4), data.ping])
          if (isHost) {
            networkRef.current?.broadcast(data)
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
          setRoundStatus('playing')
          setRoundWinner(null)
          setMatchWinner(null)
          break
        }
        default:
          break
      }
    },
    [isHost, mode, playerName]
  )

  // -------------------------------------------------------------
  // Host Room Creation
  // -------------------------------------------------------------
  const handleCreateRoom = async () => {
    setError(null)
    const code = generateRoomCode()
    setRoomCode(code)
    setIsHost(true)
    setMySlotId('p1')

    const initialPlayer = {
      id: `player_${Date.now()}`,
      name: playerName || 'Host_Commander',
      slotId: 'p1',
      team: 'blue',
      isReady: false,
      isHost: true,
    }
    setPlayers([initialPlayer])

    try {
      const net = new TankNetwork({
        onStatusChange: (status) => setConnectionStatus(status),
        onClientJoin: (clientPeerId, clientPlayer, conn) => {
          const currentMode = modeRef.current
          const modeConfig = MODES[currentMode] || MODES['1v1']

          setPlayers((prev) => {
            const occupiedSlots = new Set(prev.map((p) => p.slotId))
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

            const filtered = prev.filter(
              (p) => p.peerId !== clientPeerId && p.slotId !== assignedSlotId
            )
            const updated = [...filtered, newPlayer]

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
              net.broadcast({
                type: 'LOBBY_STATE',
                players: updated,
                mode: currentMode,
              })
            }, 30)

            return updated
          })
        },
        onPlayerLeave: (peerId) => {
          setPlayers((prev) => {
            const updated = prev.filter((p) => p.peerId !== peerId)
            net.broadcast({
              type: 'LOBBY_STATE',
              players: updated,
              mode: modeRef.current,
            })
            return updated
          })
        },
        onMessage: handleNetworkMessage,
        onError: (err) => setError(err.message || 'Connection error'),
      })

      await net.init(code, true)
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
    if (!inputCode || inputCode.length < 3) return
    setError(null)
    setIsHost(false)
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
        onMessage: handleNetworkMessage,
        onError: (err) => setError(err.message || 'Could not connect to room'),
      })

      await net.init(inputCode, false, myPlayer)
      networkRef.current = net
      setRoomCode(inputCode)
    } catch (err) {
      setError(err.message || 'Room not found or host unreachable.')
      setConnectionStatus('idle')
    }
  }

  // Switch Slot in Lobby
  const handleSelectSlot = (slotId) => {
    const slotConfig = MODES[mode].slots.find((s) => s.id === slotId)
    if (!slotConfig) return

    if (isHost) {
      setMySlotId(slotId)
      setPlayers((prev) => {
        const updated = prev.map((p) =>
          p.slotId === mySlotId ? { ...p, slotId, team: slotConfig.team } : p
        )
        networkRef.current?.broadcast({
          type: 'LOBBY_STATE',
          players: updated,
          mode,
        })
        return updated
      })
    } else {
      setMySlotId(slotId)
      setPlayers((prev) =>
        prev.map((p) =>
          p.slotId === mySlotId ? { ...p, slotId, team: slotConfig.team } : p
        )
      )
      networkRef.current?.sendToHost({ type: 'CHANGE_SLOT', oldSlot: mySlotId, newSlot: slotId })
    }
  }

  // Toggle Ready
  const handleToggleReady = () => {
    if (isHost) {
      setPlayers((prev) => {
        const updated = prev.map((p) =>
          p.slotId === mySlotId ? { ...p, isReady: !p.isReady } : p
        )
        networkRef.current?.broadcast({
          type: 'LOBBY_STATE',
          players: updated,
          mode,
        })
        return updated
      })
    } else {
      setPlayers((prev) =>
        prev.map((p) => (p.slotId === mySlotId ? { ...p, isReady: !p.isReady } : p))
      )
      networkRef.current?.sendToHost({ type: 'TOGGLE_READY', slotId: mySlotId })
    }
  }

  const handleSelectMode = (newMode) => {
    setMode(newMode)
    if (isHost && networkRef.current) {
      networkRef.current.broadcast({
        type: 'LOBBY_STATE',
        players,
        mode: newMode,
      })
    }
  }

  // Start Game (Host only)
  const handleStartGame = () => {
    if (!isHost) return

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
    if (!isHost) return
    const initialWorld = initRoundWorld({ blue: 0, red: 0 }, currentMapIndex + 1)
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
    if (networkRef.current) {
      networkRef.current.destroy()
    }
    setRoomCode('')
    setInputCode('')
    setGamePhase('lobby')
    setConnectionStatus('idle')
    setPlayers([])
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
        <div className="w-full flex flex-col items-center justify-center animate-fadeIn px-2">
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
            onCanvasPointerMove={handleCanvasPointerMove}
            onCanvasPointerDown={() => handleFireCannon()}
            onCanvasContextMenu={handleTriggerRadarPing}
          />

          <TankControls
            onInputChange={(delta) => {
              localInputRef.current = { ...localInputRef.current, ...delta }
              if (!isHost && networkRef.current) {
                networkRef.current.sendToHost({
                  type: 'PLAYER_INPUT',
                  slotId: mySlotId,
                  input: localInputRef.current,
                })
              }
            }}
            onFire={handleFireCannon}
            onPing={handleTriggerRadarPing}
            activeWeapon={myTank?.weapon || 'STANDARD'}
            hasShield={!!myTank?.shield}
            isAlive={myTank?.isAlive ?? true}
            is2v2={mode === '2v2'}
          />
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
      <TankRulesModal isOpen={isRulesOpen} onClose={onCloseRules} />
    </div>
  )
}

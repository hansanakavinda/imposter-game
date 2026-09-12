import React, { useState, useEffect, useRef, useCallback } from 'react'
import TankLobby from './components/TankLobby'
import TankCanvas from './components/TankCanvas'
import TankControls from './components/TankControls'
import TankGameOverModal from './components/TankGameOverModal'
import TankRulesModal from './components/TankRulesModal'
import {
  MODES,
  WEAPON_TYPES,
  TARGET_SCORE_DEFAULT,
  TANK_MAX_HP,
  TANK_TYPES,
  DEFAULT_TANK_TYPE,
} from './constants/tankConstants'
import { useTankInput } from './hooks/useTankInput'
import {
  createEmptyWorld,
  buildRoundWorld,
  stepWorld,
  fireFromTank,
  toSnapshot,
  EVENTS,
} from './engine/tankSimulation'
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
  const [selectedTank, setSelectedTank] = useState(() => {
    try {
      return localStorage.getItem('tank_selected_type') || DEFAULT_TANK_TYPE
    } catch {
      return DEFAULT_TANK_TYPE
    }
  })
  const [error, setError] = useState(null)

  // Game Flow State
  const [gamePhase, setGamePhase] = useState('lobby') // 'lobby', 'battle', 'game_over'
  const [roundStatus, setRoundStatus] = useState('playing') // 'playing', 'round_win', 'match_over'
  const [roundWinner, setRoundWinner] = useState(null)
  const [matchWinner, setMatchWinner] = useState(null)
  const [score, setScore] = useState({ blue: 0, red: 0 })

  // World Simulation State
  const [tanks, setTanks] = useState([])
  const [bullets, setBullets] = useState([])
  const [obstacles, setObstacles] = useState([])
  const [barrels, setBarrels] = useState([])
  const [crates, setCrates] = useState([])
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

  // Local controls live in hooks/useTankInput.js; mounted further down, once the
  // handlers it needs exist.

  // Synchronized refs to avoid stale closures in callbacks and event listeners
  const isHostRef = useRef(false)
  const modeRef = useRef(mode)
  const playersRef = useRef(players)
  const mySlotIdRef = useRef(mySlotId)
  const playerNameRef = useRef(playerName)

  /**
   * The authoritative world, owned by the simulation rather than by React.
   *
   * The 32ms tick and the network callbacks both read and write this, so it must not
   * be useState: a stale closure there would silently roll the match back. React state
   * below is a render-only mirror, refreshed by commitWorld.
   */
  const worldRef = useRef(createEmptyWorld())

  const networkRef = useRef(null)
  const simulationTimerRef = useRef(null)

  // Declared here so useTankInput can reach the handlers it fires without depending
  // on their declaration order further down.
  const handleFireCannonRef = useRef(null)
  const handleTriggerRadarPingRef = useRef(null)
  // Round-win and match-over transitions are deferred; keep the handle so leaving
  // mid-transition does not fire state updates into an unmounted component.
  const roundTransitionTimerRef = useRef(null)

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
      if (roundTransitionTimerRef.current) {
        clearTimeout(roundTransitionTimerRef.current)
        roundTransitionTimerRef.current = null
      }
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, [])

  // -------------------------------------------------------------
  // Local controls (keyboard, mouse aim, touch joysticks)
  // -------------------------------------------------------------
  const { inputRef: localInputRef, updateInput, setTurretAngle, aimAt } = useTankInput({
    active: gamePhase === 'battle',
    onFire: () => handleFireCannonRef.current?.(),
    onPing: () => handleTriggerRadarPingRef.current?.(),
    // Only a client needs to publish: the host's tick reads the ref directly.
    sendInput: (input) => {
      if (!isHostRef.current && networkRef.current) {
        networkRef.current.sendToHost({
          type: 'PLAYER_INPUT',
          slotId: mySlotIdRef.current,
          input,
        })
      }
    },
    resolveMyTank: () => worldRef.current.tanks.find((t) => t.slotId === mySlotIdRef.current),
  })

  // -------------------------------------------------------------
  // World lifecycle (Host Authoritative)
  //
  // All simulation rules live in engine/tankSimulation.js. This component owns the
  // world object, drives the tick, mirrors the result into React state for rendering,
  // and broadcasts snapshots to clients.
  // -------------------------------------------------------------

  /** Push the world into React state so the canvas re-renders. */
  const commitWorld = useCallback((world) => {
    worldRef.current = world
    setTanks(world.tanks)
    setBullets(world.bullets)
    setObstacles(world.obstacles)
    setBarrels(world.barrels)
    setCrates(world.crates)
    setScore(world.score)
    setRoundStatus(world.roundStatus)
    setRoundWinner(world.roundWinner)
  }, [])

  /** Lay out a fresh round and publish it. Host only. */
  const startRound = useCallback(
    (nextScore, mapIndex) => {
      const world = buildRoundWorld({
        mode: modeRef.current,
        players: playersRef.current,
        mapIndex,
        score: nextScore,
      })
      commitWorld(world)
      return world
    },
    [commitWorld]
  )

  /** Translate the simulation's events into sound. */
  const playWorldEvents = useCallback((events) => {
    let explosionPlayed = false
    for (const event of events) {
      switch (event.type) {
        case EVENTS.RICOCHET:
          playTankRicochetSound()
          break
        case EVENTS.BARREL_EXPLOSION:
          playBarrelExplosionSound()
          break
        case EVENTS.TANK_DESTROYED:
          // One boom per tick even if a barrel takes out a whole squad.
          if (!explosionPlayed) {
            playTankExplosionSound()
            explosionPlayed = true
          }
          break
        case EVENTS.CRATE_PICKUP:
          playCratePickupSound()
          break
        default:
          break
      }
    }
  }, [])

  /**
   * A team has taken the round: bank the point, then either end the match or roll the
   * next map after a short pause so players can see what happened.
   */
  const handleRoundWin = useCallback(
    (winner, nextScore) => {
      playTankExplosionSound()

      if (roundTransitionTimerRef.current) {
        clearTimeout(roundTransitionTimerRef.current)
      }

      if (nextScore[winner] >= TARGET_SCORE_DEFAULT) {
        roundTransitionTimerRef.current = setTimeout(() => {
          roundTransitionTimerRef.current = null
          setMatchWinner(winner)
          setGamePhase('game_over')
          networkRef.current?.broadcast({ type: 'MATCH_OVER', winner })
        }, 1800)
      } else {
        roundTransitionTimerRef.current = setTimeout(() => {
          roundTransitionTimerRef.current = null
          const next = startRound(nextScore, worldRef.current.mapIndex + 1)
          networkRef.current?.broadcast({
            type: 'START_MATCH',
            score: next.score,
            tanks: next.tanks,
            obstacles: next.obstacles,
            barrels: next.barrels,
          })
        }, 2400)
      }
    },
    [startRound]
  )

  // -------------------------------------------------------------
  // Host simulation tick (~31 FPS)
  // -------------------------------------------------------------
  const runHostSimulationTick = useCallback(() => {
    const { world, events } = stepWorld(worldRef.current, {
      localSlotId: mySlotIdRef.current,
      localInput: localInputRef.current,
    })

    if (world === worldRef.current) return // between rounds; nothing to publish

    commitWorld(world)
    playWorldEvents(events)

    if (networkRef.current && isHostRef.current) {
      networkRef.current.broadcast({ type: 'WORLD_STATE', ...toSnapshot(world) })
    }

    const roundWin = events.find((e) => e.type === EVENTS.ROUND_WIN)
    if (roundWin) {
      handleRoundWin(roundWin.winner, roundWin.score)
    }
  }, [commitWorld, playWorldEvents, handleRoundWin, localInputRef])

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
  // Firing
  //
  // The host constructs every shell from its own authoritative tank record and
  // enforces the per-tank cooldown there. A client only asks *that* it fires and in
  // which direction, so it cannot dictate position, speed, damage or team.
  // -------------------------------------------------------------
  const handleFireCannon = () => {
    const turretAngle = localInputRef.current.turretAngle

    if (isHostRef.current) {
      const next = fireFromTank(worldRef.current, mySlotIdRef.current, turretAngle)
      if (!next) return // dead, unknown slot, or still reloading
      playTankShootSound()
      commitWorld(next)
    } else {
      // Optimistic muzzle report only; the host decides whether the shot happened.
      playTankShootSound()
      networkRef.current?.sendToHost({
        type: 'FIRE',
        slotId: mySlotIdRef.current,
        turretAngle,
      })
    }
  }

  // -------------------------------------------------------------
  // Radar Ping (2v2 team marker)
  // -------------------------------------------------------------
  const handleTriggerRadarPing = (coords) => {
    const myTankNow = worldRef.current.tanks.find((t) => t.slotId === mySlotIdRef.current)
    const team = myTankNow ? myTankNow.team : 'blue'
    const position = coords || (myTankNow ? { x: myTankNow.x, y: myTankNow.y } : { x: 500, y: 325 })

    playRadarPingSound()

    const ping = {
      id: `ping_${Date.now()}`,
      x: position.x,
      y: position.y,
      team,
      createdAt: performance.now(),
    }

    setPings((prev) => [...prev.slice(-4), ping])

    if (networkRef.current) {
      if (isHostRef.current) {
        networkRef.current.broadcast({ type: 'RADAR_PING', ping })
      } else {
        networkRef.current.sendToHost({ type: 'RADAR_PING', ping })
      }
    }
  }


  useEffect(() => {
    handleFireCannonRef.current = handleFireCannon
    handleTriggerRadarPingRef.current = handleTriggerRadarPing
  })

  // -------------------------------------------------------------
  // Host Handlers for Client Join / Leave
  // -------------------------------------------------------------
  const handleClientJoin = useCallback((clientPeerId, clientPlayer, conn) => {
    const currentMode = modeRef.current
    const modeConfig = MODES[currentMode] || MODES['1v1']
    const currentPlayers = playersRef.current

    const occupiedSlots = new Set(currentPlayers.map((p) => p.slotId))
    const freeSlot = modeConfig.slots.find((s) => !occupiedSlots.has(s.id))

    // No seat left. Previously this fell back to 'p2' and then filtered out whoever
    // legitimately held it, silently kicking a connected player out of the lobby.
    if (!freeSlot) {
      try {
        conn.send({
          type: 'ROOM_FULL',
          error: `This room is full (${modeConfig.maxPlayers} players in ${modeConfig.label}).`,
        })
      } catch (e) {
        console.warn('[Host] Failed to send ROOM_FULL:', e)
      }
      setTimeout(() => {
        try {
          conn.close()
        } catch {
          // ignore
        }
      }, 300)
      return
    }

    const assignedSlotId = freeSlot.id
    const slotDef = modeConfig.slots.find((s) => s.id === assignedSlotId)
    const assignedTeam = slotDef ? slotDef.team : 'red'

    const newPlayer = {
      id: clientPlayer?.id || `player_${Date.now()}`,
      name: clientPlayer?.name || 'Commander',
      peerId: clientPeerId,
      slotId: assignedSlotId,
      team: assignedTeam,
      tankType: clientPlayer?.tankType || DEFAULT_TANK_TYPE,
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

      case 'SELECT_TANK': {
        if (isHostRef.current && data.tankType && TANK_TYPES[data.tankType]) {
          const senderPeerId = _senderPeerId || data.peerId
          const updated = playersRef.current.map((p) => {
            const isMatch =
              (senderPeerId && p.peerId === senderPeerId) ||
              (data.slotId && p.slotId === data.slotId)
            return isMatch ? { ...p, tankType: data.tankType } : p
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
        commitWorld({
          ...createEmptyWorld(),
          tanks: data.tanks || [],
          obstacles: data.obstacles || [],
          barrels: data.barrels || [],
          score: data.score || { blue: 0, red: 0 },
          mapIndex: worldRef.current.mapIndex,
        })
        setPings([])
        setMatchWinner(null)
        break
      }

      case 'WORLD_STATE': {
        // Clients are pure renderers: adopt the host's snapshot wholesale.
        if (!isHostRef.current) {
          const current = worldRef.current
          commitWorld({
            ...current,
            tanks: data.tanks ?? current.tanks,
            bullets: data.bullets ?? current.bullets,
            obstacles: data.obstacles ?? current.obstacles,
            barrels: data.barrels ?? current.barrels,
            crates: data.crates ?? current.crates,
            score: data.score ?? current.score,
            roundStatus: data.roundStatus ?? current.roundStatus,
            roundWinner: data.roundWinner !== undefined ? data.roundWinner : current.roundWinner,
          })
        }
        break
      }

      case 'PLAYER_INPUT': {
        // Stashed on the tank; the next tick drives that tank with it. Not committed
        // to React state - input is not rendered and the tick runs at 31Hz anyway.
        if (isHostRef.current && data.slotId && data.input) {
          worldRef.current = {
            ...worldRef.current,
            tanks: worldRef.current.tanks.map((t) =>
              t.slotId === data.slotId ? { ...t, remoteInput: data.input } : t
            ),
          }
        }
        break
      }

      case 'FIRE': {
        // Intent only. The host builds the shell from its own tank record and applies
        // that tank's cooldown, so a client cannot fire faster, harder or from
        // somewhere it is not. Replaces the old FIRE_BULLETS message, which took
        // client-supplied bullets at face value.
        if (isHostRef.current && data.slotId) {
          const next = fireFromTank(worldRef.current, data.slotId, data.turretAngle)
          if (next) {
            playTankShootSound()
            commitWorld(next)
          }
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

      case 'ROOM_FULL': {
        setError(data.error || 'This room is full.')
        setConnectionStatus('idle')
        if (networkRef.current) {
          networkRef.current.destroy()
          networkRef.current = null
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
        commitWorld({
          ...createEmptyWorld(),
          tanks: data.tanks || [],
          obstacles: data.obstacles || [],
          barrels: data.barrels || [],
        })
        setPings([])
        setMatchWinner(null)
        break
      }

      default:
        break
    }
  }, [commitWorld])

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
      tankType: selectedTank || DEFAULT_TANK_TYPE,
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
      tankType: selectedTank || DEFAULT_TANK_TYPE,
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

  // Select Tank in Lobby
  const handleSelectTank = (tankType) => {
    if (!TANK_TYPES[tankType]) return
    setSelectedTank(tankType)
    try {
      localStorage.setItem('tank_selected_type', tankType)
    } catch {
      // ignore
    }

    const mySlot = mySlotIdRef.current
    const myPeer = networkRef.current?.myPeerId

    if (isHostRef.current) {
      const updated = playersRef.current.map((p) =>
        p.slotId === mySlot || (myPeer && p.peerId === myPeer) ? { ...p, tankType } : p
      )
      playersRef.current = updated
      setPlayers(updated)
      networkRef.current?.broadcast({
        type: 'LOBBY_STATE',
        players: updated,
        mode: modeRef.current,
      })
    } else {
      const updated = playersRef.current.map((p) =>
        p.slotId === mySlot || (myPeer && p.peerId === myPeer) ? { ...p, tankType } : p
      )
      playersRef.current = updated
      setPlayers(updated)
      networkRef.current?.sendToHost({
        type: 'SELECT_TANK',
        tankType,
        slotId: mySlot,
        peerId: myPeer,
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

  /** Host only: lay out round 1 on the first map and tell everyone to start. */
  const beginMatchFromScratch = () => {
    if (!isHostRef.current) return

    setMatchWinner(null)
    const world = startRound({ blue: 0, red: 0 }, 0)
    setGamePhase('battle')

    networkRef.current?.broadcast({
      type: 'START_MATCH',
      score: world.score,
      tanks: world.tanks,
      obstacles: world.obstacles,
      barrels: world.barrels,
    })
  }

  const handleStartGame = beginMatchFromScratch
  const handleRematch = beginMatchFromScratch

  // Leave Room
  const handleLeaveRoom = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current)
      simulationTimerRef.current = null
    }
    if (roundTransitionTimerRef.current) {
      clearTimeout(roundTransitionTimerRef.current)
      roundTransitionTimerRef.current = null
    }
    if (networkRef.current) {
      networkRef.current.destroy()
      networkRef.current = null
    }
    setGamePhase('lobby')
    setConnectionStatus('idle')
    setRoomCode('')
    setPlayers([])
    playersRef.current = []
    commitWorld(createEmptyWorld())
    setPings([])
    setIsHost(false)
    isHostRef.current = false
    setMySlotId('p1')
    mySlotIdRef.current = 'p1'
    setMyPeerId('')
  }

  // Active tank for local player
  const myTank = tanks.find((t) => t.slotId === mySlotId)

  // The single source of truth for fire rate: a held crate weapon overrides the tank
  // class. handleFireCannon gates on the same value, so the controls must not re-derive
  // it independently.
  const myTankConfig = TANK_TYPES[myTank?.tankType] || TANK_TYPES[DEFAULT_TANK_TYPE]
  const heldCrateWeapon =
    myTank?.weapon && myTank.weapon !== 'STANDARD' ? WEAPON_TYPES[myTank.weapon] : null
  const effectiveFireCooldownMs = heldCrateWeapon
    ? heldCrateWeapon.cooldownMs
    : myTank?.cooldownMs || myTankConfig.cooldownMs

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
          selectedTank={selectedTank}
          onSelectTank={handleSelectTank}
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
              pings={pings}
              mySlotId={mySlotId}
              score={score}
              targetScore={TARGET_SCORE_DEFAULT}
              roundStatus={roundStatus}
              roundWinner={roundWinner}
              is2v2={mode === '2v2'}
              isPortrait={isPortrait}
              onCanvasPointerMove={aimAt}
              onCanvasPointerDown={() => handleFireCannon()}
              onCanvasContextMenu={handleTriggerRadarPing}
            />

            <TankControls
              onInputChange={updateInput}
              onAimChange={setTurretAngle}
              onFire={handleFireCannon}
              onPing={handleTriggerRadarPing}
              activeWeapon={myTank?.weapon || 'STANDARD'}
              fireCooldownMs={effectiveFireCooldownMs}
              hasShield={!!myTank?.shield}
              tankType={myTank?.tankType || DEFAULT_TANK_TYPE}
              isAlive={myTank?.isAlive ?? true}
              hp={myTank?.hp ?? TANK_MAX_HP}
              maxHp={myTank?.maxHp ?? TANK_MAX_HP}
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

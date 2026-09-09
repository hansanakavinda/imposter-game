import React, { useState, useEffect, useRef, useCallback } from 'react'
import UnoModeSelect from './components/UnoModeSelect'
import UnoLobby from './components/UnoLobby'
import UnoMultiplayerLobby from './components/UnoMultiplayerLobby'
import UnoBoard from './components/UnoBoard'
import ColorPickerModal from './components/ColorPickerModal'
import UnoGameOverModal from './components/UnoGameOverModal'
import UnoRulesModal from './components/UnoRulesModal'
import { CARD_COLORS, CARD_TYPES } from './constants/unoConstants'
import { createUnoDeck, dealHands, canPlayCard, shuffleDeck } from './utils/deck'
import { getAiMove, chooseAiColor } from './utils/unoAi'
import {
  initHostPeer,
  initClientPeer,
  generateRoomCode,
} from './services/unoNetwork'
import {
  playCardPlaySound,
  playCardDrawSound,
  playActionCardSound,
  playUnoCallSound,
} from '../../utils/sound'

export default function UnoGame({
  onBackToMenu,
  isRulesOpen,
  onCloseRules,
  initialRoomCode = '',
}) {
  // Screen state
  const [screen, setScreen] = useState(() => (initialRoomCode ? 'mp_lobby' : 'mode_select'))
  const [internalRulesOpen, setInternalRulesOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [pendingCard, setPendingCard] = useState(null)

  // ==========================================
  // 1. SOLO VS AI STATE
  // ==========================================
  const [aiPlayers, setAiPlayers] = useState([])
  const [aiDrawPile, setAiDrawPile] = useState([])
  const [aiDiscardPile, setAiDiscardPile] = useState([])
  const [aiTopCard, setAiTopCard] = useState(null)
  const [aiActiveColor, setAiActiveColor] = useState(null)
  const [aiCurrentPlayerIndex, setAiCurrentPlayerIndex] = useState(0)
  const [aiDirection, setAiDirection] = useState(1)
  const [aiHasDrawnCardThisTurn, setAiHasDrawnCardThisTurn] = useState(false)
  const [aiActionMessage, setAiActionMessage] = useState('')
  const [aiUnoCalledPlayers, setAiUnoCalledPlayers] = useState(new Set())
  const [aiHasCalledUnoThisRound, setAiHasCalledUnoThisRound] = useState(false)
  const [aiWinner, setAiWinner] = useState(null)

  const botTimeoutRef = useRef(null)

  // ==========================================
  // 2. MULTIPLAYER STATE
  // ==========================================
  const [mpRoomState, setMpRoomState] = useState({
    isInRoom: false,
    isHost: false,
    roomCode: '',
    players: [],
    maxPlayers: 4,
    isConnecting: false,
    error: '',
  })

  const [myPlayerId, setMyPlayerId] = useState(0)
  const myPlayerIdRef = useRef(0)
  const [myHand, setMyHand] = useState([])

  // Shared multiplayer board state (for UI rendering on both Host and Clients)
  const [mpPlayers, setMpPlayers] = useState([])
  const [mpTopCard, setMpTopCard] = useState(null)
  const [mpActiveColor, setMpActiveColor] = useState(null)
  const [mpCurrentPlayerIndex, setMpCurrentPlayerIndex] = useState(0)
  const [mpDirection, setMpDirection] = useState(1)
  const [mpDrawPileCount, setMpDrawPileCount] = useState(0)
  const [mpHasDrawnCardThisTurn, setMpHasDrawnCardThisTurn] = useState(false)
  const [mpActionMessage, setMpActionMessage] = useState('')
  const [mpUnoCalledPlayers, setMpUnoCalledPlayers] = useState(new Set())
  const [mpHasCalledUnoThisRound, setMpHasCalledUnoThisRound] = useState(false)
  const [mpWinner, setMpWinner] = useState(null)

  // Authoritative host master state (immune to React stale closures)
  const hostGameRef = useRef({
    roomCode: '',
    players: [],
    drawPile: [],
    discardPile: [],
    hands: new Map(), // playerId -> card[]
    topCard: null,
    activeColor: null,
    currentPlayerIndex: 0,
    direction: 1,
    unoCalledPlayers: new Set(),
    hasDrawnThisTurn: false,
    winner: null,
    actionMessage: '',
  })

  // Network peer instances and dynamic callbacks ref
  const hostNetworkRef = useRef(null)
  const clientNetworkRef = useRef(null)
  const onClientDataRef = useRef(null)

  const showRules = isRulesOpen !== undefined ? isRulesOpen : internalRulesOpen
  const handleCloseRules = onCloseRules || (() => setInternalRulesOpen(false))

  // ==========================================
  // SHARED CARD ENGINE HELPERS
  // ==========================================
  const getNextPlayerIndex = useCallback(
    (currentIdx, step = 1, currentPlayers = [], currentDir = 1) => {
      const len = currentPlayers.length
      if (len === 0) return 0
      return (currentIdx + currentDir * step + len * 100) % len
    },
    []
  )

  const drawCardsFromPile = useCallback(
    (count, currentDrawPile, currentDiscardPile) => {
      let dPile = [...currentDrawPile]
      let discPile = [...currentDiscardPile]
      const drawnCards = []

      for (let i = 0; i < count; i++) {
        if (dPile.length === 0) {
          if (discPile.length <= 1) break
          const top = discPile[discPile.length - 1]
          const recycled = discPile.slice(0, -1).map((c) => ({
            ...c,
            color:
              c.type === CARD_TYPES.WILD || c.type === CARD_TYPES.WILD_DRAW_FOUR
                ? CARD_COLORS.WILD
                : c.color,
          }))
          dPile = shuffleDeck(recycled)
          discPile = [top]
        }

        if (dPile.length > 0) {
          drawnCards.push(dPile.pop())
        }
      }

      return { drawnCards, newDrawPile: dPile, newDiscardPile: discPile }
    },
    []
  )

  // Clean up WebRTC on unmount
  useEffect(() => {
    return () => {
      if (hostNetworkRef.current) hostNetworkRef.current.destroy()
      if (clientNetworkRef.current) clientNetworkRef.current.destroy()
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current)
    }
  }, [])

  // ==========================================
  // SOLO VS AI HANDLERS
  // ==========================================
  const handleStartAiGame = ({ players: initialPlayers }) => {
    const freshDeck = createUnoDeck()
    const { hands, drawPile: dealtDraw, discardPile: dealtDiscard, initialColor } = dealHands(
      freshDeck,
      initialPlayers.length
    )

    const populatedPlayers = initialPlayers.map((p, idx) => ({
      ...p,
      hand: hands[idx],
    }))

    setAiPlayers(populatedPlayers)
    setAiDrawPile(dealtDraw)
    setAiDiscardPile(dealtDiscard)
    setAiTopCard(dealtDiscard[dealtDiscard.length - 1])
    setAiActiveColor(initialColor)
    setAiCurrentPlayerIndex(0)
    setAiDirection(1)
    setAiHasDrawnCardThisTurn(false)
    setAiActionMessage('Game started! You have the first move.')
    setAiUnoCalledPlayers(new Set())
    setAiHasCalledUnoThisRound(false)
    setAiWinner(null)
    setScreen('ai_playing')
  }

  const handlePlayAgainAi = () => {
    const resetPlayers = aiPlayers.map((p) => ({ ...p, hand: [] }))
    handleStartAiGame({ players: resetPlayers })
  }

  const executeAiPlayCard = useCallback(
    (playerIndex, card, chosenColor = null) => {
      const player = aiPlayers[playerIndex]
      const nextHand = player.hand.filter((c) => c.id !== card.id)
      const isWild = card.color === CARD_COLORS.WILD
      const effectiveColor = isWild ? chosenColor : card.color

      if (
        card.type === CARD_TYPES.DRAW_TWO ||
        card.type === CARD_TYPES.WILD_DRAW_FOUR
      ) {
        playActionCardSound(true)
      } else if (
        card.type === CARD_TYPES.SKIP ||
        card.type === CARD_TYPES.REVERSE
      ) {
        playActionCardSound(false)
      } else {
        playCardPlaySound()
      }

      if (nextHand.length === 0) {
        const updatedPlayers = aiPlayers.map((p, idx) =>
          idx === playerIndex ? { ...p, hand: nextHand } : p
        )
        setAiPlayers(updatedPlayers)
        setAiTopCard(card)
        setAiDiscardPile((prev) => [...prev, card])
        setAiWinner(player)
        setScreen('ai_gameover')
        return
      }

      if (nextHand.length === 1) {
        if (player.isHuman) {
          if (aiHasCalledUnoThisRound) {
            playUnoCallSound()
            setAiUnoCalledPlayers((prev) => new Set(prev).add(player.id))
          } else {
            setAiActionMessage('You forgot to call UNO! Penalty +2 cards!')
          }
        } else {
          playUnoCallSound()
          setAiUnoCalledPlayers((prev) => new Set(prev).add(player.id))
          setAiActionMessage(`${player.name} calls UNO! 1 card left!`)
        }
      }

      let step = 1
      let newDirection = aiDirection
      let message = `${player.name} played ${card.color !== CARD_COLORS.WILD ? card.color : ''} ${card.label}`

      if (card.type === CARD_TYPES.REVERSE) {
        if (aiPlayers.length === 2) {
          step = 2
          message = `${player.name} played Reverse! Next turn skipped.`
        } else {
          newDirection = aiDirection * -1
          setAiDirection(newDirection)
          message = `${player.name} reversed play direction!`
        }
      }

      if (card.type === CARD_TYPES.SKIP) {
        step = 2
        const skippedIdx = getNextPlayerIndex(playerIndex, 1, aiPlayers, newDirection)
        message = `${player.name} skipped ${aiPlayers[skippedIdx].name}!`
      }

      let currentDraw = [...aiDrawPile]
      let currentDiscard = [...aiDiscardPile, card]
      let updatedPlayers = aiPlayers.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: nextHand } : p
      )

      if (card.type === CARD_TYPES.DRAW_TWO) {
        step = 2
        const targetIdx = getNextPlayerIndex(playerIndex, 1, aiPlayers, newDirection)
        const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
          2,
          currentDraw,
          currentDiscard
        )
        currentDraw = newDrawPile
        currentDiscard = newDiscardPile
        updatedPlayers = updatedPlayers.map((p, idx) =>
          idx === targetIdx ? { ...p, hand: [...p.hand, ...drawnCards] } : p
        )
        message = `${player.name} played +2! ${aiPlayers[targetIdx].name} drew 2 cards and skipped turn!`
      }

      if (card.type === CARD_TYPES.WILD_DRAW_FOUR) {
        step = 2
        const targetIdx = getNextPlayerIndex(playerIndex, 1, aiPlayers, newDirection)
        const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
          4,
          currentDraw,
          currentDiscard
        )
        currentDraw = newDrawPile
        currentDiscard = newDiscardPile
        updatedPlayers = updatedPlayers.map((p, idx) =>
          idx === targetIdx ? { ...p, hand: [...p.hand, ...drawnCards] } : p
        )
        message = `${player.name} played Wild +4! Color is now ${effectiveColor}. ${aiPlayers[targetIdx].name} drew 4 cards!`
      }

      if (card.type === CARD_TYPES.WILD) {
        message = `${player.name} played Wild! Color is now ${effectiveColor}.`
      }

      const nextPlayerIdx = getNextPlayerIndex(
        playerIndex,
        step,
        updatedPlayers,
        newDirection
      )

      setAiPlayers(updatedPlayers)
      setAiDrawPile(currentDraw)
      setAiDiscardPile(currentDiscard)
      setAiTopCard(card)
      setAiActiveColor(effectiveColor)
      setAiCurrentPlayerIndex(nextPlayerIdx)
      setAiHasDrawnCardThisTurn(false)
      setAiHasCalledUnoThisRound(false)
      setAiActionMessage(message)
    },
    [
      aiPlayers,
      aiDirection,
      aiDrawPile,
      aiDiscardPile,
      aiHasCalledUnoThisRound,
      getNextPlayerIndex,
      drawCardsFromPile,
    ]
  )

  const handleHumanPlayCardAi = (card) => {
    if (card.color === CARD_COLORS.WILD) {
      setPendingCard(card)
      setColorPickerOpen(true)
    } else {
      executeAiPlayCard(aiCurrentPlayerIndex, card, card.color)
    }
  }

  const handleDrawCardAi = () => {
    if (aiHasDrawnCardThisTurn) return
    playCardDrawSound()
    const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
      1,
      aiDrawPile,
      aiDiscardPile
    )
    if (drawnCards.length === 0) return

    const drawnCard = drawnCards[0]
    const updatedPlayers = aiPlayers.map((p, idx) =>
      idx === aiCurrentPlayerIndex ? { ...p, hand: [...p.hand, drawnCard] } : p
    )

    setAiPlayers(updatedPlayers)
    setAiDrawPile(newDrawPile)
    setAiDiscardPile(newDiscardPile)
    setAiHasDrawnCardThisTurn(true)
    const activeP = aiPlayers[aiCurrentPlayerIndex]
    setAiActionMessage(`${activeP.name} drew a card.`)
  }

  const handlePassTurnAi = () => {
    const nextPlayerIdx = getNextPlayerIndex(aiCurrentPlayerIndex, 1, aiPlayers, aiDirection)
    setAiCurrentPlayerIndex(nextPlayerIdx)
    setAiHasDrawnCardThisTurn(false)
    setAiHasCalledUnoThisRound(false)
    setAiActionMessage(`${aiPlayers[aiCurrentPlayerIndex].name} passed turn.`)
  }

  const handleCallUnoAi = () => {
    setAiHasCalledUnoThisRound(true)
    playUnoCallSound()
    setAiActionMessage('You shouted UNO!')
  }

  // AI Bot automated loop
  useEffect(() => {
    if (screen !== 'ai_playing' || aiWinner) return

    const activePlayer = aiPlayers[aiCurrentPlayerIndex]
    if (!activePlayer || activePlayer.isHuman) return

    botTimeoutRef.current = setTimeout(() => {
      const nextPlayerIdx = getNextPlayerIndex(aiCurrentPlayerIndex, 1, aiPlayers, aiDirection)
      const nextPlayer = aiPlayers[nextPlayerIdx]
      const nextPlayerCount = nextPlayer ? nextPlayer.hand.length : 7

      const bestCard = getAiMove(
        activePlayer.hand,
        aiTopCard,
        aiActiveColor,
        nextPlayerCount
      )

      if (bestCard) {
        const chosenColor =
          bestCard.color === CARD_COLORS.WILD
            ? chooseAiColor(activePlayer.hand)
            : bestCard.color
        executeAiPlayCard(aiCurrentPlayerIndex, bestCard, chosenColor)
      } else {
        playCardDrawSound()
        const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
          1,
          aiDrawPile,
          aiDiscardPile
        )

        if (drawnCards.length > 0) {
          const drawnCard = drawnCards[0]
          const newHand = [...activePlayer.hand, drawnCard]

          if (canPlayCard(drawnCard, aiTopCard, aiActiveColor)) {
            const chosenColor =
              drawnCard.color === CARD_COLORS.WILD
                ? chooseAiColor(newHand)
                : drawnCard.color

            const updatedPlayers = aiPlayers.map((p, idx) =>
              idx === aiCurrentPlayerIndex ? { ...p, hand: newHand } : p
            )
            setAiPlayers(updatedPlayers)
            setAiDrawPile(newDrawPile)
            setAiDiscardPile(newDiscardPile)

            setTimeout(() => {
              executeAiPlayCard(aiCurrentPlayerIndex, drawnCard, chosenColor)
            }, 600)
            return
          } else {
            const updatedPlayers = aiPlayers.map((p, idx) =>
              idx === aiCurrentPlayerIndex ? { ...p, hand: newHand } : p
            )
            setAiPlayers(updatedPlayers)
            setAiDrawPile(newDrawPile)
            setAiDiscardPile(newDiscardPile)
            const nextIdx = getNextPlayerIndex(aiCurrentPlayerIndex, 1, aiPlayers, aiDirection)
            setAiCurrentPlayerIndex(nextIdx)
            setAiHasDrawnCardThisTurn(false)
            setAiActionMessage(`${activePlayer.name} drew a card and passed.`)
          }
        } else {
          const nextIdx = getNextPlayerIndex(aiCurrentPlayerIndex, 1, aiPlayers, aiDirection)
          setAiCurrentPlayerIndex(nextIdx)
          setAiHasDrawnCardThisTurn(false)
        }
      }
    }, 1100)

    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current)
    }
  }, [
    aiCurrentPlayerIndex,
    screen,
    aiWinner,
    aiPlayers,
    aiTopCard,
    aiActiveColor,
    aiDrawPile,
    aiDiscardPile,
    aiDirection,
    getNextPlayerIndex,
    drawCardsFromPile,
    executeAiPlayCard,
  ])

  // ==========================================
  // 3. MULTIPLAYER WEBRTC GAME ENGINE
  // ==========================================

  // Broadcasts state to all connected clients & updates host UI
  const hostBroadcastGameState = useCallback((customMessage = null) => {
    const g = hostGameRef.current
    if (!g) return

    const sanitizedPlayers = g.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      cardCount: g.hands.get(p.id)?.length || 0,
    }))

    const message = customMessage !== null ? customMessage : g.actionMessage || ''

    // 1. Update Host local UI
    setMpPlayers(sanitizedPlayers)
    setMpTopCard(g.topCard)
    setMpActiveColor(g.activeColor)
    setMpCurrentPlayerIndex(g.currentPlayerIndex)
    setMpDirection(g.direction)
    setMpDrawPileCount(g.drawPile.length)
    setMpActionMessage(message)
    setMpUnoCalledPlayers(new Set(g.unoCalledPlayers))
    setMpHasDrawnCardThisTurn(g.hasDrawnThisTurn)
    setMyHand([...(g.hands.get(0) || [])])

    if (g.winner) {
      setMpWinner(g.winner)
      setScreen('mp_gameover')
    }

    // 2. Broadcast personalized state to each client over WebRTC
    if (hostNetworkRef.current) {
      g.players.forEach((p) => {
        if (!p.isHost && p.peerId) {
          hostNetworkRef.current.sendTo(p.peerId, {
            type: 'SYNC_GAME_STATE',
            yourPlayerId: p.id,
            hand: [...(g.hands.get(p.id) || [])],
            topCard: g.topCard,
            activeColor: g.activeColor,
            currentPlayerIndex: g.currentPlayerIndex,
            direction: g.direction,
            drawPileCount: g.drawPile.length,
            players: sanitizedPlayers,
            actionMessage: message,
            unoCalledPlayers: Array.from(g.unoCalledPlayers),
            hasDrawnThisTurn: g.hasDrawnThisTurn,
            winner: g.winner,
          })
        }
      })
    }
  }, [])

  // Authoritative host card play execution
  const hostProcessPlayCard = useCallback(
    (playerId, cardId, chosenColor = null, fallbackCard = null) => {
      const g = hostGameRef.current
      if (!g) return

      // Validate turn: allow if current player matches playerId
      if (g.currentPlayerIndex !== playerId) {
        console.warn(`[Host] Player ${playerId} played out of turn. Active player is ${g.currentPlayerIndex}`)
        return
      }

      const player = g.players.find((p) => p.id === playerId)
      if (!player) {
        console.warn(`[Host] Player not found for id ${playerId}`)
        return
      }

      const currentHand = g.hands.get(playerId) || []
      let cardIndex = currentHand.findIndex((c) => c.id === cardId)
      if (cardIndex === -1 && fallbackCard) {
        cardIndex = currentHand.findIndex(
          (c) => c.color === fallbackCard.color && c.label === fallbackCard.label && c.type === fallbackCard.type
        )
      }
      if (cardIndex === -1) {
        console.warn(`[Host] Card ${cardId} not found in player ${playerId}'s hand`)
        return
      }

      const card = currentHand[cardIndex]
      const isWild = card.color === CARD_COLORS.WILD
      const effectiveColor = isWild ? chosenColor : card.color

      // Check legal move
      if (!canPlayCard(card, g.topCard, g.activeColor)) {
        console.warn(`[Host] Card ${card.label} (${card.color}) cannot be played on topCard`, g.topCard, g.activeColor)
        return
      }

      // Remove card from hand and push to discard pile
      const nextHand = currentHand.filter((_, idx) => idx !== cardIndex)
      g.hands.set(playerId, nextHand)
      g.discardPile.push(card)
      g.topCard = card
      g.activeColor = effectiveColor
      g.hasDrawnThisTurn = false

      // Audio feedback
      if (card.type === CARD_TYPES.DRAW_TWO || card.type === CARD_TYPES.WILD_DRAW_FOUR) {
        playActionCardSound(true)
      } else if (card.type === CARD_TYPES.SKIP || card.type === CARD_TYPES.REVERSE) {
        playActionCardSound(false)
      } else {
        playCardPlaySound()
      }

      // Win condition
      if (nextHand.length === 0) {
        g.winner = player
        g.actionMessage = `🎉 ${player.name} emptied their hand and won!`
        hostBroadcastGameState()
        return
      }

      // UNO reminder check
      if (nextHand.length === 1) {
        if (g.unoCalledPlayers.has(playerId)) {
          playUnoCallSound()
        }
      }

      // Action card effects
      let step = 1
      let message = `${player.name} played ${card.color !== CARD_COLORS.WILD ? card.color : ''} ${card.label}`

      if (card.type === CARD_TYPES.REVERSE) {
        if (g.players.length === 2) {
          step = 2
          message = `${player.name} played Reverse! Next turn skipped.`
        } else {
          g.direction = g.direction * -1
          message = `${player.name} reversed direction!`
        }
      }

      if (card.type === CARD_TYPES.SKIP) {
        step = 2
        const skippedIdx = getNextPlayerIndex(g.currentPlayerIndex, 1, g.players, g.direction)
        message = `${player.name} skipped ${g.players[skippedIdx]?.name}!`
      }

      if (card.type === CARD_TYPES.DRAW_TWO) {
        step = 2
        const targetIdx = getNextPlayerIndex(g.currentPlayerIndex, 1, g.players, g.direction)
        const targetPlayer = g.players[targetIdx]
        const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
          2,
          g.drawPile,
          g.discardPile
        )
        g.drawPile = newDrawPile
        g.discardPile = newDiscardPile
        const targetHand = g.hands.get(targetPlayer.id) || []
        g.hands.set(targetPlayer.id, [...targetHand, ...drawnCards])
        message = `${player.name} played +2! ${targetPlayer.name} drew 2 cards and skipped turn!`
      }

      if (card.type === CARD_TYPES.WILD_DRAW_FOUR) {
        step = 2
        const targetIdx = getNextPlayerIndex(g.currentPlayerIndex, 1, g.players, g.direction)
        const targetPlayer = g.players[targetIdx]
        const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
          4,
          g.drawPile,
          g.discardPile
        )
        g.drawPile = newDrawPile
        g.discardPile = newDiscardPile
        const targetHand = g.hands.get(targetPlayer.id) || []
        g.hands.set(targetPlayer.id, [...targetHand, ...drawnCards])
        message = `${player.name} played Wild +4! Color is ${effectiveColor}. ${targetPlayer.name} drew 4 cards!`
      }

      if (card.type === CARD_TYPES.WILD) {
        message = `${player.name} played Wild! Color is ${effectiveColor}.`
      }

      const nextIdx = getNextPlayerIndex(g.currentPlayerIndex, step, g.players, g.direction)
      g.currentPlayerIndex = nextIdx
      g.actionMessage = message

      hostBroadcastGameState()
    },
    [getNextPlayerIndex, drawCardsFromPile, hostBroadcastGameState]
  )

  // Authoritative host card draw execution
  const hostProcessDrawCard = useCallback(
    (playerId) => {
      const g = hostGameRef.current
      if (!g || g.currentPlayerIndex !== playerId) return

      const player = g.players.find((p) => p.id === playerId)
      if (!player) return

      playCardDrawSound()
      const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
        1,
        g.drawPile,
        g.discardPile
      )
      if (drawnCards.length === 0) return

      g.drawPile = newDrawPile
      g.discardPile = newDiscardPile
      const currentHand = g.hands.get(playerId) || []
      g.hands.set(playerId, [...currentHand, drawnCards[0]])
      g.hasDrawnThisTurn = true
      g.actionMessage = `${player.name} drew a card.`

      hostBroadcastGameState()
    },
    [drawCardsFromPile, hostBroadcastGameState]
  )

  // Authoritative host turn pass execution
  const hostProcessPassTurn = useCallback(
    (playerId) => {
      const g = hostGameRef.current
      if (!g || g.currentPlayerIndex !== playerId) return

      const player = g.players.find((p) => p.id === playerId)
      const nextIdx = getNextPlayerIndex(g.currentPlayerIndex, 1, g.players, g.direction)
      g.currentPlayerIndex = nextIdx
      g.hasDrawnThisTurn = false
      g.actionMessage = `${player?.name || 'Player'} passed turn.`

      hostBroadcastGameState()
    },
    [getNextPlayerIndex, hostBroadcastGameState]
  )

  // Authoritative host UNO shout execution
  const hostProcessCallUno = useCallback(
    (playerId, playerName) => {
      const g = hostGameRef.current
      if (!g) return

      playUnoCallSound()
      g.unoCalledPlayers.add(playerId)
      g.actionMessage = `🔔 ${playerName} shouted UNO!`

      if (hostNetworkRef.current) {
        hostNetworkRef.current.broadcast({
          type: 'UNO_SHOUTED',
          playerId,
          playerName,
        })
      }

      hostBroadcastGameState()
    },
    [hostBroadcastGameState]
  )

  // Connect client data ref to latest authoritative processors
  useEffect(() => {
    onClientDataRef.current = (clientPeerId, data) => {
      if (!data) return
      const g = hostGameRef.current
      if (!g) return

      // Look up player directly by peer connection ID
      const player = g.players.find((p) => p.peerId === clientPeerId)
      const playerId = player ? player.id : (data.playerId !== undefined ? data.playerId : g.currentPlayerIndex)

      if (data.type === 'ACTION_PLAY_CARD') {
        hostProcessPlayCard(playerId, data.cardId, data.chosenColor, data.card)
      } else if (data.type === 'ACTION_DRAW_CARD') {
        hostProcessDrawCard(playerId)
      } else if (data.type === 'ACTION_PASS_TURN') {
        hostProcessPassTurn(playerId)
      } else if (data.type === 'ACTION_CALL_UNO') {
        hostProcessCallUno(playerId, player?.name || data.playerName || 'Player')
      }
    }
  }, [hostProcessPlayCard, hostProcessDrawCard, hostProcessPassTurn, hostProcessCallUno])

  // Host creates room
  const handleCreateRoom = ({ name, avatar, maxPlayers }) => {
    const code = generateRoomCode()
    const hostPlayer = { id: 0, name, avatar, isHost: true, isYou: true }

    hostGameRef.current = {
      roomCode: code,
      players: [hostPlayer],
      drawPile: [],
      discardPile: [],
      hands: new Map(),
      topCard: null,
      activeColor: null,
      currentPlayerIndex: 0,
      direction: 1,
      unoCalledPlayers: new Set(),
      hasDrawnThisTurn: false,
      winner: null,
      actionMessage: '',
    }

    setMpRoomState({
      isInRoom: false,
      isHost: true,
      roomCode: code,
      players: [hostPlayer],
      maxPlayers,
      isConnecting: true,
      error: '',
    })
    setMyPlayerId(0)
    myPlayerIdRef.current = 0

    const hostPeer = initHostPeer({
      roomCode: code,
      onOpen: () => {
        setMpRoomState((prev) => ({
          ...prev,
          isInRoom: true,
          isConnecting: false,
        }))
      },
      onClientJoin: (clientPeerId, clientPlayer, conn) => {
        const currentPlayers = hostGameRef.current.players
        if (currentPlayers.length >= maxPlayers) return

        const newPlayer = {
          id: currentPlayers.length,
          peerId: clientPeerId,
          name: clientPlayer.name || `Player ${currentPlayers.length + 1}`,
          avatar: clientPlayer.avatar || '😎',
          isHost: false,
          isYou: false,
        }
        const updatedPlayers = [...currentPlayers, newPlayer]
        hostGameRef.current.players = updatedPlayers

        // Immediately send direct WELCOME message with their assigned player ID
        conn.send({
          type: 'WELCOME',
          playerId: newPlayer.id,
          roomCode: code,
          players: updatedPlayers,
        })

        // Broadcast room update to all players
        setTimeout(() => {
          hostPeer.broadcast({
            type: 'ROOM_UPDATE',
            roomCode: code,
            players: updatedPlayers,
          })
        }, 50)

        setMpRoomState((prev) => ({ ...prev, players: updatedPlayers }))
      },
      onClientLeave: (clientPeerId) => {
        const updatedPlayers = hostGameRef.current.players.filter((p) => p.peerId !== clientPeerId)
        hostGameRef.current.players = updatedPlayers
        hostPeer.broadcast({
          type: 'ROOM_UPDATE',
          roomCode: code,
          players: updatedPlayers,
        })
        setMpRoomState((prev) => ({ ...prev, players: updatedPlayers }))
      },
      onClientData: (clientPeerId, data) => {
        if (onClientDataRef.current) {
          onClientDataRef.current(clientPeerId, data)
        }
      },
      onError: (err) => {
        setMpRoomState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err.message || 'Connection error. Please try again.',
        }))
      },
    })

    hostNetworkRef.current = hostPeer
  }

  // Client joins room
  const handleJoinRoom = ({ name, avatar, roomCode }) => {
    setMpRoomState((prev) => ({
      ...prev,
      isConnecting: true,
      error: '',
    }))

    const clientPeer = initClientPeer({
      roomCode,
      player: { name, avatar },
      onConnected: () => {
        setMpRoomState((prev) => ({
          ...prev,
          isInRoom: true,
          isHost: false,
          roomCode,
          isConnecting: false,
        }))
      },
      onData: (data) => {
        if (data.type === 'WELCOME') {
          setMyPlayerId(data.playerId)
          myPlayerIdRef.current = data.playerId
          if (data.players) {
            setMpRoomState((prev) => ({
              ...prev,
              players: data.players.map((p) => ({
                ...p,
                isYou: p.id === data.playerId,
              })),
            }))
          }
        } else if (data.type === 'ROOM_UPDATE') {
          setMpRoomState((prev) => ({
            ...prev,
            players: data.players.map((p) => ({
              ...p,
              isYou: p.id === myPlayerIdRef.current || (!p.isHost && p.name === name),
            })),
          }))
        } else if (data.type === 'SYNC_GAME_STATE') {
          if (data.yourPlayerId !== undefined) {
            setMyPlayerId(data.yourPlayerId)
            myPlayerIdRef.current = data.yourPlayerId
          }
          setMyHand(data.hand || [])
          setMpPlayers(data.players || [])
          setMpTopCard(data.topCard)
          setMpActiveColor(data.activeColor)
          setMpCurrentPlayerIndex(data.currentPlayerIndex)
          setMpDirection(data.direction)
          setMpDrawPileCount(data.drawPileCount)
          setMpActionMessage(data.actionMessage)
          setMpUnoCalledPlayers(new Set(data.unoCalledPlayers || []))
          setMpHasDrawnCardThisTurn(data.hasDrawnThisTurn || false)
          setMpHasCalledUnoThisRound(false)

          if (data.winner) {
            setMpWinner(data.winner)
            setScreen('mp_gameover')
          } else {
            setScreen('mp_playing')
          }
        } else if (data.type === 'UNO_SHOUTED') {
          playUnoCallSound()
          setMpUnoCalledPlayers((prev) => new Set(prev).add(data.playerId))
          setMpActionMessage(`🔔 ${data.playerName} shouted UNO!`)
        }
      },
      onDisconnected: () => {
        setMpRoomState((prev) => ({
          ...prev,
          error: 'Host disconnected. Game ended.',
        }))
        setScreen('mp_lobby')
      },
      onError: () => {
        setMpRoomState((prev) => ({
          ...prev,
          isConnecting: false,
          error: 'Could not connect to room. Check code and try again.',
        }))
      },
    })

    clientNetworkRef.current = clientPeer
  }

  // Host starts the match (Host ALWAYS has the first move: currentPlayerIndex = 0)
  const handleHostStartGame = () => {
    const g = hostGameRef.current
    const freshDeck = createUnoDeck()
    const { hands, drawPile, discardPile, initialColor } = dealHands(
      freshDeck,
      g.players.length
    )

    const handsMap = new Map()
    g.players.forEach((p, idx) => {
      handsMap.set(p.id, hands[idx])
    })

    g.drawPile = drawPile
    g.discardPile = discardPile
    g.hands = handsMap
    g.topCard = discardPile[discardPile.length - 1]
    g.activeColor = initialColor
    g.currentPlayerIndex = 0 // Host makes the first move!
    g.direction = 1
    g.hasDrawnThisTurn = false
    g.unoCalledPlayers = new Set()
    g.winner = null
    g.actionMessage = 'Game started! Host has the first move.'

    setScreen('mp_playing')
    setMpCurrentPlayerIndex(0)
    setMyPlayerId(0)
    myPlayerIdRef.current = 0
    setMpWinner(null)

    hostBroadcastGameState('Game started! Host has the first move.')
  }

  // Action dispatchers (work for both Host locally and Clients over network)
  const handleMpPlayCard = (card) => {
    if (card.color === CARD_COLORS.WILD) {
      setPendingCard(card)
      setColorPickerOpen(true)
    } else {
      dispatchMpPlayCard(card, card.color)
    }
  }

  const dispatchMpPlayCard = (card, color) => {
    if (mpRoomState.isHost) {
      hostProcessPlayCard(0, card.id, color, card)
    } else if (clientNetworkRef.current) {
      clientNetworkRef.current.sendAction({
        type: 'ACTION_PLAY_CARD',
        playerId: myPlayerIdRef.current,
        cardId: card.id,
        card,
        chosenColor: color,
      })
    }
  }

  const handleMpDrawCard = () => {
    if (mpHasDrawnCardThisTurn) return
    if (mpRoomState.isHost) {
      hostProcessDrawCard(0)
    } else if (clientNetworkRef.current) {
      clientNetworkRef.current.sendAction({
        type: 'ACTION_DRAW_CARD',
        playerId: myPlayerIdRef.current,
      })
    }
  }

  const handleMpPassTurn = () => {
    if (mpRoomState.isHost) {
      hostProcessPassTurn(0)
    } else if (clientNetworkRef.current) {
      clientNetworkRef.current.sendAction({
        type: 'ACTION_PASS_TURN',
        playerId: myPlayerIdRef.current,
      })
    }
  }

  const handleMpCallUno = () => {
    setMpHasCalledUnoThisRound(true)
    const myPlayer = mpRoomState.players.find((p) => p.id === myPlayerIdRef.current)

    if (mpRoomState.isHost) {
      hostProcessCallUno(0, myPlayer?.name || 'Host')
    } else if (clientNetworkRef.current) {
      clientNetworkRef.current.sendAction({
        type: 'ACTION_CALL_UNO',
        playerId: myPlayerIdRef.current,
        playerName: myPlayer?.name || 'Friend',
      })
    }
  }

  const handleLeaveMpRoom = () => {
    if (hostNetworkRef.current) hostNetworkRef.current.destroy()
    if (clientNetworkRef.current) clientNetworkRef.current.destroy()
    hostNetworkRef.current = null
    clientNetworkRef.current = null
    setMpRoomState({
      isInRoom: false,
      isHost: false,
      roomCode: '',
      players: [],
      maxPlayers: 4,
      isConnecting: false,
      error: '',
    })
    setScreen('mode_select')
  }

  // Handle color picker selection
  const handleColorSelected = (color) => {
    setColorPickerOpen(false)
    if (!pendingCard) return

    if (screen === 'ai_playing') {
      executeAiPlayCard(aiCurrentPlayerIndex, pendingCard, color)
    } else if (screen === 'mp_playing') {
      dispatchMpPlayCard(pendingCard, color)
    }
    setPendingCard(null)
  }

  // Derived checks for AI mode
  const aiActivePlayer = aiPlayers[aiCurrentPlayerIndex]
  const isAiHumanTurn = Boolean(aiActivePlayer && aiActivePlayer.isHuman)
  const isAiWaitingForBot =
    screen === 'ai_playing' && !aiWinner && Boolean(aiActivePlayer && !aiActivePlayer.isHuman)

  return (
    <div className="w-full flex-1 flex flex-col justify-center py-1">
      {/* 1. Mode Select Screen */}
      {screen === 'mode_select' && (
        <UnoModeSelect
          onSelectMode={(mode) => {
            if (mode === 'ai') setScreen('ai_lobby')
            if (mode === 'multiplayer') setScreen('mp_lobby')
          }}
          onBackToMenu={onBackToMenu}
          onOpenRules={() => setInternalRulesOpen(true)}
        />
      )}

      {/* 2. Solo vs AI Mode */}
      {screen === 'ai_lobby' && (
        <UnoLobby
          onStartGame={handleStartAiGame}
          onBackToMenu={() => setScreen('mode_select')}
          onOpenRules={() => setInternalRulesOpen(true)}
        />
      )}

      {screen === 'ai_playing' && (
        <UnoBoard
          players={aiPlayers}
          currentPlayerIndex={aiCurrentPlayerIndex}
          direction={aiDirection}
          topCard={aiTopCard}
          activeColor={aiActiveColor}
          drawPileCount={aiDrawPile.length}
          onPlayCard={handleHumanPlayCardAi}
          onDrawCard={handleDrawCardAi}
          onPassTurn={handlePassTurnAi}
          hasDrawnCardThisTurn={aiHasDrawnCardThisTurn}
          isHumanTurn={isAiHumanTurn}
          isWaitingForBot={isAiWaitingForBot}
          actionMessage={aiActionMessage}
          unoCalledPlayers={aiUnoCalledPlayers}
          onCallUno={handleCallUnoAi}
          hasCalledUnoThisRound={aiHasCalledUnoThisRound}
          myPlayerId={0}
        />
      )}

      {screen === 'ai_gameover' && (
        <UnoGameOverModal
          winner={aiWinner}
          players={aiPlayers}
          onPlayAgain={handlePlayAgainAi}
          onResetToLobby={() => setScreen('ai_lobby')}
          onBackToMenu={onBackToMenu}
        />
      )}

      {/* 3. Multiplayer Mode */}
      {screen === 'mp_lobby' && (
        <UnoMultiplayerLobby
          initialRoomCode={initialRoomCode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartGame={handleHostStartGame}
          onLeaveRoom={handleLeaveMpRoom}
          onBackToMenu={onBackToMenu}
          onBackToModeSelect={() => setScreen('mode_select')}
          roomState={mpRoomState}
        />
      )}

      {screen === 'mp_playing' && (
        <UnoBoard
          players={mpPlayers}
          currentPlayerIndex={mpCurrentPlayerIndex}
          direction={mpDirection}
          topCard={mpTopCard}
          activeColor={mpActiveColor}
          drawPileCount={mpDrawPileCount}
          onPlayCard={handleMpPlayCard}
          onDrawCard={handleMpDrawCard}
          onPassTurn={handleMpPassTurn}
          hasDrawnCardThisTurn={mpHasDrawnCardThisTurn}
          isHumanTurn={mpCurrentPlayerIndex === myPlayerId}
          isWaitingForBot={false}
          actionMessage={mpActionMessage}
          unoCalledPlayers={mpUnoCalledPlayers}
          onCallUno={handleMpCallUno}
          hasCalledUnoThisRound={mpHasCalledUnoThisRound}
          myPlayerId={myPlayerId}
          myHand={myHand}
        />
      )}

      {screen === 'mp_gameover' && (
        <UnoGameOverModal
          winner={mpWinner}
          players={mpPlayers}
          onPlayAgain={mpRoomState.isHost ? handleHostStartGame : undefined}
          onResetToLobby={handleLeaveMpRoom}
          onBackToMenu={onBackToMenu}
        />
      )}

      {/* Wild Color Selection Modal */}
      <ColorPickerModal
        isOpen={colorPickerOpen}
        onSelectColor={handleColorSelected}
      />

      {/* Rules Modal */}
      <UnoRulesModal isOpen={showRules} onClose={handleCloseRules} />
    </div>
  )
}

import React, { useState, useEffect, useRef, useCallback } from 'react'
import UnoModeSelect from './components/UnoModeSelect'
import UnoLobby from './components/UnoLobby'
import UnoMultiplayerLobby from './components/UnoMultiplayerLobby'
import UnoBoard from './components/UnoBoard'
import ColorPickerModal from './components/ColorPickerModal'
import UnoGameOverModal from './components/UnoGameOverModal'
import UnoRulesModal from './components/UnoRulesModal'
import UnoFinishedRankModal from './components/UnoFinishedRankModal'
import UnoGiveCardModal from './components/UnoGiveCardModal'
import { CARD_COLORS, CARD_TYPES, getRankBadge } from './constants/unoConstants'
import {
  createUnoDeck,
  dealHands,
  canPlayCard,
  getNextActivePlayerIndex,
} from './utils/deck'
import {
  createHostGame,
  startMatch,
  resetToLobby,
  isMatchInProgress,
  sanitizePlayers,
  handOf,
  drawCardsFromPile,
  playCard,
  drawCard,
  passTurn,
  callUno,
  catchUno,
  submitPenaltyCard,
  finalizeCatchPenalty,
  forceResolvePenalty,
  PENALTY_TIMEOUT_MS,
  SOUNDS,
} from './engine/hostEngine'
import { getAiMove, chooseAiColor, chooseAiCardToGive } from './utils/unoAi'
import {
  initHostPeer,
  initClientPeer,
  generateRoomCode,
  getClientSessionId,
  preloadIceConfig,
} from './services/unoNetwork'
import {
  playCardPlaySound,
  playCardDrawSound,
  playActionCardSound,
  playUnoCallSound,
} from '../../utils/sound'

/** The host is always player 0 in a multiplayer room. */
const HOST_PLAYER_ID = 0

const setUrlRoomCode = (code) => {
  if (typeof window !== 'undefined' && window.history) {
    const url = new URL(window.location.href)
    url.searchParams.set('game', 'uno')
    if (code) {
      url.searchParams.set('room', code.toUpperCase())
    } else {
      url.searchParams.delete('room')
    }
    window.history.replaceState({}, document.title, url.toString())
  }
}

const clearUrlRoomCode = () => {
  if (typeof window !== 'undefined' && window.history) {
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState({}, document.title, url.toString())
  }
}

export default function UnoGame({
  onBackToMenu,
  isRulesOpen,
  onCloseRules,
  initialRoomCode = '',
}) {
  const effectiveInitialRoom =
    initialRoomCode ||
    (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('room') ||
        sessionStorage.getItem('uno_active_room') ||
        ''
      : '')

  // Screen state
  const [screen, setScreen] = useState(() => (effectiveInitialRoom ? 'mp_lobby' : 'mode_select'))
  const [internalRulesOpen, setInternalRulesOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [pendingCard, setPendingCard] = useState(null)

  // Celebration modal when local player empties hand
  const [finishedCelebration, setFinishedCelebration] = useState({
    isOpen: false,
    rank: 1,
    playerName: 'You',
    activeRemaining: 2,
  })
  const hasShownMyCelebrationRef = useRef(false)

  // Preload TURN ICE configuration if Metered API credentials are configured
  useEffect(() => {
    preloadIceConfig()
  }, [])

  // ==========================================
  // 1. SOLO VS AI STATE
  // ==========================================
  const [aiPlayers, setAiPlayers] = useState([])
  const [aiRankings, setAiRankings] = useState([]) // [{ playerId, name, avatar, isHuman, rank, remainingCards }]
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
  const [aiSkippedInfo, setAiSkippedInfo] = useState(null)
  const [aiStackingEnabled, setAiStackingEnabled] = useState(true)
  const [aiPendingDrawCount, setAiPendingDrawCount] = useState(0)
  const [aiPendingStackType, setAiPendingStackType] = useState(null)

  // Give card penalty selection modal (used in both AI and Multiplayer modes)
  const [penaltyGiveCardModal, setPenaltyGiveCardModal] = useState({
    isOpen: false,
    mode: 'ai', // 'ai' or 'mp'
    penaltyId: null,
    targetPlayerId: null,
    targetPlayerName: '',
    challengerId: null,
    botGifts: [],
  })

  const botTimeoutRef = useRef(null)
  const botUnoCallTimersRef = useRef({})
  const botCatchHumanTimerRef = useRef(null)
  const aiPlayersRef = useRef(aiPlayers)
  useEffect(() => {
    aiPlayersRef.current = aiPlayers
  }, [aiPlayers])
  const aiUnoCalledPlayersRef = useRef(aiUnoCalledPlayers)
  useEffect(() => {
    aiUnoCalledPlayersRef.current = aiUnoCalledPlayers
  }, [aiUnoCalledPlayers])

  const isDrawingAiRef = useRef(false)
  useEffect(() => {
    if (!aiHasDrawnCardThisTurn) {
      isDrawingAiRef.current = false
    }
  }, [aiHasDrawnCardThisTurn, aiCurrentPlayerIndex])

  const clearAllAiUnoTimers = useCallback(() => {
    if (botCatchHumanTimerRef.current) {
      clearTimeout(botCatchHumanTimerRef.current)
      botCatchHumanTimerRef.current = null
    }
    Object.values(botUnoCallTimersRef.current).forEach((timer) => clearTimeout(timer))
    botUnoCallTimersRef.current = {}
  }, [])

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
  const [mpRankings, setMpRankings] = useState([]) // [{ playerId, name, avatar, isHost, rank, remainingCards }]
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
  const [mpSkippedInfo, setMpSkippedInfo] = useState(null)
  const [mpStackingEnabled, setMpStackingEnabled] = useState(true)
  const [mpPendingDrawCount, setMpPendingDrawCount] = useState(0)
  const [mpPendingStackType, setMpPendingStackType] = useState(null)
  const [mpConnectionStatus, setMpConnectionStatus] = useState('connected') // 'connected' | 'reconnecting' | 'disconnected'
  const myProfileRef = useRef({ name: 'Player', avatar: '😎', roomCode: '' })
  const screenRef = useRef(screen)

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

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
    rankings: [], // [{ playerId, name, avatar, isHost, rank, remainingCards }]
    actionMessage: '',
    skippedInfo: null,
    stackingEnabled: true,
    pendingDrawCount: 0,
    pendingStackType: null,
  })

  // Network peer instances and dynamic callbacks ref
  const hostNetworkRef = useRef(null)
  const clientNetworkRef = useRef(null)
  const onClientDataRef = useRef(null)

  const runHostActionRef = useRef(null)

  const isDrawingMpRef = useRef(false)
  useEffect(() => {
    if (!mpHasDrawnCardThisTurn) {
      isDrawingMpRef.current = false
    }
  }, [mpHasDrawnCardThisTurn, mpCurrentPlayerIndex])

  const disconnectTurnTimerRef = useRef(null)
  const penaltyTimeoutRef = useRef(null)

  const showRules = isRulesOpen !== undefined ? isRulesOpen : internalRulesOpen
  const handleCloseRules = onCloseRules || (() => setInternalRulesOpen(false))

  // Clean up WebRTC and timers on unmount
  useEffect(() => {
    return () => {
      if (clientNetworkRef.current) {
        try {
          clientNetworkRef.current.sendAction({
            type: 'ACTION_LEAVE',
            playerId: myPlayerIdRef.current,
          })
        } catch {
          // ignore
        }
        clientNetworkRef.current.destroy()
      }
      if (hostNetworkRef.current) hostNetworkRef.current.destroy()
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current)
      if (disconnectTurnTimerRef.current) clearTimeout(disconnectTurnTimerRef.current)
      if (penaltyTimeoutRef.current) clearTimeout(penaltyTimeoutRef.current)
      clearAllAiUnoTimers()
    }
  }, [clearAllAiUnoTimers])

  // ==========================================
  // SOLO VS AI HANDLERS
  // ==========================================
  const handleStartAiGame = ({ players: initialPlayers, enableStacking = true }) => {
    clearAllAiUnoTimers()
    const freshDeck = createUnoDeck()
    const { hands, drawPile: dealtDraw, discardPile: dealtDiscard, initialColor } = dealHands(
      freshDeck,
      initialPlayers.length
    )

    const populatedPlayers = initialPlayers.map((p, idx) => ({
      ...p,
      hand: hands[idx],
      rank: null,
    }))

    setAiPlayers(populatedPlayers)
    setAiRankings([])
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
    setAiSkippedInfo(null)
    setAiStackingEnabled(enableStacking)
    setAiPendingDrawCount(0)
    setAiPendingStackType(null)
    setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
    hasShownMyCelebrationRef.current = false
    setPenaltyGiveCardModal({
      isOpen: false,
      mode: 'ai',
      penaltyId: null,
      targetPlayerId: null,
      targetPlayerName: '',
      challengerId: null,
      botGifts: [],
    })
    setScreen('ai_playing')
  }

  const handlePlayAgainAi = () => {
    clearAllAiUnoTimers()
    setPenaltyGiveCardModal({
      isOpen: false,
      mode: 'ai',
      penaltyId: null,
      targetPlayerId: null,
      targetPlayerName: '',
      challengerId: null,
      botGifts: [],
    })
    const resetPlayers = aiPlayers.map((p) => ({ ...p, hand: [], rank: null }))
    handleStartAiGame({ players: resetPlayers, enableStacking: aiStackingEnabled })
  }

  // When human player confirms giving a selected card in AI mode
  const handleConfirmGiveCardAi = useCallback(
    (selectedCard) => {
      const { targetPlayerId, targetPlayerName, challengerId, botGifts = [] } =
        penaltyGiveCardModal

      const cardsGiven = [
        selectedCard,
        ...botGifts.map((bg) => bg.card).filter(Boolean),
      ]

      let updatedRankings = [...aiRankings]
      const finishedGivers = []

      // 1. Deduct cards from givers and record placements for anyone who emptied hand
      let updatedPlayers = aiPlayers.map((p) => {
        if (p.isHuman) {
          const nextHand = p.hand.filter((c) => c.id !== selectedCard.id)
          if (nextHand.length === 0 && p.rank == null) {
            const rank = updatedRankings.length + 1
            const record = {
              playerId: p.id,
              name: p.name,
              avatar: p.avatar,
              isHuman: true,
              rank,
              remainingCards: 0,
            }
            updatedRankings.push(record)
            finishedGivers.push({ ...p, rank })
            return { ...p, hand: nextHand, rank }
          }
          return { ...p, hand: nextHand }
        }

        const botGift = botGifts.find((bg) => bg.giverId === p.id)
        if (botGift && botGift.card) {
          const nextHand = p.hand.filter((c) => c.id !== botGift.card.id)
          if (nextHand.length === 0 && p.rank == null) {
            const rank = updatedRankings.length + 1
            const record = {
              playerId: p.id,
              name: p.name,
              avatar: p.avatar,
              isHuman: false,
              rank,
              remainingCards: 0,
            }
            updatedRankings.push(record)
            finishedGivers.push({ ...p, rank })
            return { ...p, hand: nextHand, rank }
          }
          return { ...p, hand: nextHand }
        }

        return p
      })

      // 2. Add all penalty cards to target player's hand
      updatedPlayers = updatedPlayers.map((p) => {
        if (p.id === targetPlayerId) {
          return {
            ...p,
            hand: [...p.hand, ...cardsGiven],
          }
        }
        return p
      })

      // 3. Clear target's UNO call status
      setAiUnoCalledPlayers((prev) => {
        const next = new Set(prev)
        next.delete(targetPlayerId)
        return next
      })
      if (targetPlayerId === 0) {
        setAiHasCalledUnoThisRound(false)
      }

      // 4. Check remaining active players
      const remainingActive = updatedPlayers.filter(
        (p) => p.hand.length > 0 && p.rank == null
      )

      // 5. Check if match is over (1 or fewer active players left)
      if (remainingActive.length <= 1) {
        if (remainingActive.length === 1) {
          const lastPlayer = remainingActive[0]
          const lastRank = updatedRankings.length + 1
          const lastRecord = {
            playerId: lastPlayer.id,
            name: lastPlayer.name,
            avatar: lastPlayer.avatar,
            isHuman: lastPlayer.isHuman,
            rank: lastRank,
            remainingCards: lastPlayer.hand.length,
          }
          updatedRankings.push(lastRecord)
          updatedPlayers = updatedPlayers.map((p) =>
            p.id === lastPlayer.id ? { ...p, rank: lastRank } : p
          )
        }
        setAiPlayers(updatedPlayers)
        setAiRankings(updatedRankings)
        setAiWinner(updatedRankings[0])
        setPenaltyGiveCardModal({
          isOpen: false,
          mode: 'ai',
          penaltyId: null,
          targetPlayerId: null,
          targetPlayerName: '',
          challengerId: null,
          botGifts: [],
        })
        setScreen('ai_gameover')
        return
      }

      const humanFinished = finishedGivers.find((fg) => fg.isHuman)
      if (humanFinished) {
        setFinishedCelebration({
          isOpen: true,
          rank: humanFinished.rank,
          playerName: 'You',
          activeRemaining: remainingActive.length,
        })
      }

      // 6. Advance turn if current player finished
      let nextTurnIdx = aiCurrentPlayerIndex
      const activeCurrentP = updatedPlayers[aiCurrentPlayerIndex]
      if (
        activeCurrentP &&
        (activeCurrentP.hand.length === 0 || activeCurrentP.rank != null)
      ) {
        nextTurnIdx = getNextActivePlayerIndex(
          aiCurrentPlayerIndex,
          1,
          updatedPlayers,
          aiDirection,
          (p) => p.hand.length === 0 || p.rank != null
        )
      }

      setAiCurrentPlayerIndex(nextTurnIdx)
      setAiPlayers(updatedPlayers)
      setAiRankings(updatedRankings)
      playActionCardSound(true)

      const challenger = updatedPlayers.find((p) => p.id === challengerId)
      const challengerName = challengerId === 0 ? 'You' : challenger?.name || 'Player'
      let msg = `🚨 ${challengerName} caught ${targetPlayerName}! Received 1 card from each active player (+${cardsGiven.length} cards)!`
      if (finishedGivers.length > 0) {
        const names = finishedGivers.map((fg) => (fg.isHuman ? 'You' : fg.name)).join(', ')
        msg += ` 🏆 ${names} gave away their last card and finished the game!`
      }
      setAiActionMessage(msg)

      setPenaltyGiveCardModal({
        isOpen: false,
        mode: 'ai',
        penaltyId: null,
        targetPlayerId: null,
        targetPlayerName: '',
        challengerId: null,
        botGifts: [],
      })
    },
    [
      penaltyGiveCardModal,
      aiPlayers,
      aiRankings,
      aiCurrentPlayerIndex,
      aiDirection,
    ]
  )

  const executeAiCatchUno = useCallback(
    (challengerId, targetPlayerId) => {
      const target = aiPlayers.find((p) => p.id === targetPlayerId)
      if (!target) return

      // Validate target: must have 1 card, not finished, not called UNO
      if (target.rank != null) {
        if (challengerId === 0) {
          setAiActionMessage(`${target.name} has already finished the match!`)
        }
        return
      }
      if (target.hand.length !== 1) {
        if (challengerId === 0) {
          setAiActionMessage(
            `${target.name} has ${target.hand.length} cards (must have exactly 1 card to be caught).`
          )
        }
        return
      }
      if (aiUnoCalledPlayersRef.current.has(targetPlayerId)) {
        if (challengerId === 0) {
          setAiActionMessage(`${target.name} already called UNO!`)
        }
        return
      }

      // Clear any pending timers on target
      if (botUnoCallTimersRef.current[targetPlayerId]) {
        clearTimeout(botUnoCallTimersRef.current[targetPlayerId])
        delete botUnoCallTimersRef.current[targetPlayerId]
      }
      if (targetPlayerId === 0 && botCatchHumanTimerRef.current) {
        clearTimeout(botCatchHumanTimerRef.current)
        botCatchHumanTimerRef.current = null
      }

      const otherActive = aiPlayers.filter(
        (p) => p.id !== targetPlayerId && p.hand.length > 0 && p.rank == null
      )
      if (otherActive.length === 0) return

      const isHumanActiveGiver = otherActive.some((p) => p.isHuman)

      if (isHumanActiveGiver) {
        // Human is one of the active givers: prompt human with UnoGiveCardModal!
        const botGifts = otherActive
          .filter((p) => !p.isHuman)
          .map((bot) => ({
            giverId: bot.id,
            giverName: bot.name,
            card: chooseAiCardToGive(bot.hand),
          }))

        setPenaltyGiveCardModal({
          isOpen: true,
          mode: 'ai',
          penaltyId: null,
          targetPlayerId,
          targetPlayerName: target.name,
          challengerId,
          botGifts,
        })
      } else {
        // Human is NOT an active giver (human is the caught target or already finished)
        // All givers are bots: auto-transfer cards
        const botGifts = otherActive.map((bot) => ({
          giverId: bot.id,
          giverName: bot.name,
          card: chooseAiCardToGive(bot.hand),
        }))
        const cardsGiven = botGifts.map((bg) => bg.card).filter(Boolean)

        let updatedRankings = [...aiRankings]
        const finishedBots = []

        let updatedPlayers = aiPlayers.map((p) => {
          const bg = botGifts.find((g) => g.giverId === p.id)
          if (bg && bg.card) {
            const nextHand = p.hand.filter((c) => c.id !== bg.card.id)
            if (nextHand.length === 0 && p.rank == null) {
              const rank = updatedRankings.length + 1
              const record = {
                playerId: p.id,
                name: p.name,
                avatar: p.avatar,
                isHuman: false,
                rank,
                remainingCards: 0,
              }
              updatedRankings.push(record)
              finishedBots.push({ ...p, rank })
              return { ...p, hand: nextHand, rank }
            }
            return { ...p, hand: nextHand }
          }
          return p
        })

        // Target receives all cards
        updatedPlayers = updatedPlayers.map((p) => {
          if (p.id === targetPlayerId) {
            return { ...p, hand: [...p.hand, ...cardsGiven] }
          }
          return p
        })

        setAiUnoCalledPlayers((prev) => {
          const next = new Set(prev)
          next.delete(targetPlayerId)
          return next
        })
        if (targetPlayerId === 0) {
          setAiHasCalledUnoThisRound(false)
        }

        const remainingActive = updatedPlayers.filter(
          (p) => p.hand.length > 0 && p.rank == null
        )

        if (remainingActive.length <= 1) {
          if (remainingActive.length === 1) {
            const lastPlayer = remainingActive[0]
            const lastRank = updatedRankings.length + 1
            const lastRecord = {
              playerId: lastPlayer.id,
              name: lastPlayer.name,
              avatar: lastPlayer.avatar,
              isHuman: lastPlayer.isHuman,
              rank: lastRank,
              remainingCards: lastPlayer.hand.length,
            }
            updatedRankings.push(lastRecord)
            updatedPlayers = updatedPlayers.map((p) =>
              p.id === lastPlayer.id ? { ...p, rank: lastRank } : p
            )
          }
          setAiPlayers(updatedPlayers)
          setAiRankings(updatedRankings)
          setAiWinner(updatedRankings[0])
          setScreen('ai_gameover')
          return
        }

        let nextTurnIdx = aiCurrentPlayerIndex
        const activeCurrentP = updatedPlayers[aiCurrentPlayerIndex]
        if (
          activeCurrentP &&
          (activeCurrentP.hand.length === 0 || activeCurrentP.rank != null)
        ) {
          nextTurnIdx = getNextActivePlayerIndex(
            aiCurrentPlayerIndex,
            1,
            updatedPlayers,
            aiDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
        }

        setAiCurrentPlayerIndex(nextTurnIdx)
        setAiPlayers(updatedPlayers)
        setAiRankings(updatedRankings)
        playActionCardSound(true)

        const challenger = updatedPlayers.find((p) => p.id === challengerId)
        const challengerName = challengerId === 0 ? 'You' : challenger?.name || 'Bot'
        const targetName = targetPlayerId === 0 ? 'You' : target?.name || 'Bot'
        let msg = `🚨 ${challengerName} caught ${targetName}! Received 1 card from each active player (+${cardsGiven.length} cards)!`
        if (finishedBots.length > 0) {
          const names = finishedBots.map((b) => b.name).join(', ')
          msg += ` 🏆 ${names} gave away their last card and finished the game!`
        }
        setAiActionMessage(msg)
      }
    },
    [
      aiPlayers,
      aiRankings,
      aiCurrentPlayerIndex,
      aiDirection,
    ]
  )

  const executeAiPlayCard = useCallback(
    /**
     * `playersOverride` is required whenever the caller has already modified hands in
     * this tick - notably the bot draw-then-play path, whose captured roster is one
     * draw out of date.
     */
    (playerIndex, card, chosenColor = null, playersOverride = null) => {
      const players = playersOverride || aiPlayers
      const player = players[playerIndex]
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

      // If player emptied their hand, record placement!
      if (nextHand.length === 0) {
        const finishedRank = aiRankings.length + 1
        const rankRecord = {
          playerId: player.id,
          name: player.name,
          avatar: player.avatar,
          isHuman: player.isHuman,
          rank: finishedRank,
          remainingCards: 0,
        }
        const newRankings = [...aiRankings, rankRecord]
        setAiRankings(newRankings)

        const updatedPlayers = players.map((p, idx) =>
          idx === playerIndex ? { ...p, hand: nextHand, rank: finishedRank } : p
        )
        setAiPlayers(updatedPlayers)
        setAiTopCard(card)
        setAiDiscardPile((prev) => [...prev, card])

        const remainingActive = updatedPlayers.filter((p) => p.hand.length > 0)

        // If only 1 player remains with cards, match is over!
        if (remainingActive.length <= 1) {
          if (remainingActive.length === 1) {
            const lastPlayer = remainingActive[0]
            const lastRank = finishedRank + 1
            const lastRecord = {
              playerId: lastPlayer.id,
              name: lastPlayer.name,
              avatar: lastPlayer.avatar,
              isHuman: lastPlayer.isHuman,
              rank: lastRank,
              remainingCards: lastPlayer.hand.length,
            }
            newRankings.push(lastRecord)
            setAiRankings(newRankings)
            setAiPlayers(
              updatedPlayers.map((p) => (p.id === lastPlayer.id ? { ...p, rank: lastRank } : p))
            )
          }
          setAiWinner(newRankings[0])
          setScreen('ai_gameover')
          return
        }

        // More than 1 active player remains: match continues!
        if (player.isHuman) {
          setFinishedCelebration({
            isOpen: true,
            rank: finishedRank,
            playerName: 'You',
            activeRemaining: remainingActive.length,
          })
        }

        const rankBadge = getRankBadge(finishedRank)
        let step = 1
        let newDirection = aiDirection
        let currentSkippedInfo = null

        if (card.type === CARD_TYPES.REVERSE) {
          if (remainingActive.length === 2) {
            step = 1
          } else {
            newDirection = aiDirection * -1
            setAiDirection(newDirection)
          }
        } else if (card.type === CARD_TYPES.SKIP) {
          step = 2
          const skippedIdx = getNextActivePlayerIndex(
            playerIndex,
            1,
            updatedPlayers,
            newDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          const targetPlayer = updatedPlayers[skippedIdx]
          currentSkippedInfo = {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            playedByName: player.name,
            cardType: 'skip',
            cardsDrawn: 0,
          }
        } else if (card.type === CARD_TYPES.DRAW_TWO) {
          if (aiStackingEnabled) {
            setAiPendingDrawCount((aiPendingDrawCount || 0) + 2)
            setAiPendingStackType(CARD_TYPES.DRAW_TWO)
            step = 1
          } else {
            step = 2
            const targetIdx = getNextActivePlayerIndex(
              playerIndex,
              1,
              updatedPlayers,
              newDirection,
              (p) => p.hand.length === 0 || p.rank != null
            )
            const targetPlayer = updatedPlayers[targetIdx]
            const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
              2,
              aiDrawPile,
              [...aiDiscardPile, card]
            )
            setAiDrawPile(newDrawPile)
            setAiDiscardPile(newDiscardPile)
            setAiPlayers(
              updatedPlayers.map((p, idx) =>
                idx === targetIdx ? { ...p, hand: [...drawnCards, ...p.hand] } : p
              )
            )
            currentSkippedInfo = {
              playerId: targetPlayer.id,
              playerName: targetPlayer.name,
              playedByName: player.name,
              cardType: 'draw2',
              cardsDrawn: 2,
            }
          }
        } else if (card.type === CARD_TYPES.WILD_DRAW_FOUR) {
          if (aiStackingEnabled) {
            setAiPendingDrawCount((aiPendingDrawCount || 0) + 4)
            setAiPendingStackType(CARD_TYPES.WILD_DRAW_FOUR)
            step = 1
          } else {
            step = 2
            const targetIdx = getNextActivePlayerIndex(
              playerIndex,
              1,
              updatedPlayers,
              newDirection,
              (p) => p.hand.length === 0 || p.rank != null
            )
            const targetPlayer = updatedPlayers[targetIdx]
            const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
              4,
              aiDrawPile,
              [...aiDiscardPile, card]
            )
            setAiDrawPile(newDrawPile)
            setAiDiscardPile(newDiscardPile)
            setAiPlayers(
              updatedPlayers.map((p, idx) =>
                idx === targetIdx ? { ...p, hand: [...drawnCards, ...p.hand] } : p
              )
            )
            currentSkippedInfo = {
              playerId: targetPlayer.id,
              playerName: targetPlayer.name,
              playedByName: player.name,
              cardType: 'wild4',
              cardsDrawn: 4,
            }
          }
        }

        if (card.type !== CARD_TYPES.DRAW_TWO && card.type !== CARD_TYPES.WILD_DRAW_FOUR) {
          setAiPendingDrawCount(0)
          setAiPendingStackType(null)
        }

        const nextIdx = getNextActivePlayerIndex(
          playerIndex,
          step,
          updatedPlayers,
          newDirection,
          (p) => p.hand.length === 0 || p.rank != null
        )
        setAiCurrentPlayerIndex(nextIdx)
        setAiActiveColor(effectiveColor)
        setAiHasDrawnCardThisTurn(false)
        setAiHasCalledUnoThisRound(false)
        setAiSkippedInfo(currentSkippedInfo)
        setAiActionMessage(
          `${rankBadge.medal} ${player.name} finished in ${rankBadge.label}! (${remainingActive.length} players still battling)`
        )
        return
      }

      if (nextHand.length === 1) {
        if (player.isHuman) {
          if (aiHasCalledUnoThisRound) {
            playUnoCallSound()
            setAiUnoCalledPlayers((prev) => new Set(prev).add(player.id))
            setAiActionMessage('🔔 You shouted UNO! 1 card remaining!')
          } else {
            // Human has not called UNO yet: vulnerable to being caught!
            if (botCatchHumanTimerRef.current) {
              clearTimeout(botCatchHumanTimerRef.current)
            }
            botCatchHumanTimerRef.current = setTimeout(() => {
              const latestPlayers = aiPlayersRef.current || []
              const humanPlayer = latestPlayers[0]
              if (
                humanPlayer &&
                humanPlayer.hand.length === 1 &&
                !humanPlayer.rank &&
                !aiUnoCalledPlayersRef.current.has(0)
              ) {
                const activeBots = latestPlayers.filter(
                  (p) => !p.isHuman && p.hand.length > 0 && !p.rank
                )
                if (activeBots.length > 0) {
                  const randomBot =
                    activeBots[Math.floor(Math.random() * activeBots.length)]
                  executeAiCatchUno(randomBot.id, 0)
                }
              }
            }, 4000)
          }
        } else {
          // Bot reached 1 card: 75% chance to call after delay, or forget
          if (botUnoCallTimersRef.current[player.id]) {
            clearTimeout(botUnoCallTimersRef.current[player.id])
          }
          const willCall = Math.random() < 0.75
          if (willCall) {
            const delay = 2200 + Math.random() * 1600
            botUnoCallTimersRef.current[player.id] = setTimeout(() => {
              setAiUnoCalledPlayers((prev) => {
                const next = new Set(prev)
                next.add(player.id)
                return next
              })
              playUnoCallSound()
              setAiActionMessage(`🔔 ${player.name} shouted UNO! 1 card left!`)
            }, delay)
          }
        }
      } else {
        if (botUnoCallTimersRef.current[player.id]) {
          clearTimeout(botUnoCallTimersRef.current[player.id])
          delete botUnoCallTimersRef.current[player.id]
        }
        if (player.isHuman) {
          if (botCatchHumanTimerRef.current) {
            clearTimeout(botCatchHumanTimerRef.current)
            botCatchHumanTimerRef.current = null
          }
          setAiHasCalledUnoThisRound(false)
        }
      }

      let step = 1
      let newDirection = aiDirection
      let message = `${player.name} played ${card.color !== CARD_COLORS.WILD ? card.color : ''} ${card.label}`
      let currentSkippedInfo = null

      if (card.type === CARD_TYPES.REVERSE) {
        const activeCountNow = players.filter((p) => p.hand.length > 0).length
        if (activeCountNow === 2) {
          step = 2
          const skippedIdx = getNextActivePlayerIndex(
            playerIndex,
            1,
            players,
            newDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          const targetPlayer = players[skippedIdx]
          currentSkippedInfo = {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            playedByName: player.name,
            cardType: 'reverse',
            cardsDrawn: 0,
          }
          message = `${player.name} played Reverse! ${targetPlayer.name} was skipped.`
        } else {
          newDirection = aiDirection * -1
          setAiDirection(newDirection)
          message = `${player.name} reversed play direction!`
        }
      }

      if (card.type === CARD_TYPES.SKIP) {
        step = 2
        const skippedIdx = getNextActivePlayerIndex(
          playerIndex,
          1,
          players,
          newDirection,
          (p) => p.hand.length === 0 || p.rank != null
        )
        const targetPlayer = players[skippedIdx]
        currentSkippedInfo = {
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
          playedByName: player.name,
          cardType: 'skip',
          cardsDrawn: 0,
        }
        message = `${player.name} skipped ${targetPlayer?.name}!`
      }

      let currentDraw = [...aiDrawPile]
      let currentDiscard = [...aiDiscardPile, card]
      let updatedPlayers = players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: nextHand } : p
      )

      let newPendingDrawCount = 0
      let newPendingStackType = null

      if (card.type === CARD_TYPES.DRAW_TWO) {
        if (aiStackingEnabled) {
          newPendingDrawCount = (aiPendingDrawCount || 0) + 2
          newPendingStackType = CARD_TYPES.DRAW_TWO
          step = 1
          message = `${player.name} played +2! Stack is +${newPendingDrawCount} cards! Next player must counter or draw!`
        } else {
          step = 2
          const targetIdx = getNextActivePlayerIndex(
            playerIndex,
            1,
            players,
            newDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          const targetPlayer = players[targetIdx]
          const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
            2,
            currentDraw,
            currentDiscard
          )
          currentDraw = newDrawPile
          currentDiscard = newDiscardPile
          updatedPlayers = updatedPlayers.map((p, idx) =>
            idx === targetIdx ? { ...p, hand: [...drawnCards, ...p.hand] } : p
          )
          currentSkippedInfo = {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            playedByName: player.name,
            cardType: 'draw2',
            cardsDrawn: 2,
          }
          message = `${player.name} played +2! ${targetPlayer.name} drew 2 cards and was skipped!`
        }
      }

      if (card.type === CARD_TYPES.WILD_DRAW_FOUR) {
        if (aiStackingEnabled) {
          newPendingDrawCount = (aiPendingDrawCount || 0) + 4
          newPendingStackType = CARD_TYPES.WILD_DRAW_FOUR
          step = 1
          message = `${player.name} played Wild +4! Color is now ${effectiveColor}. Stack is +${newPendingDrawCount} cards!`
        } else {
          step = 2
          const targetIdx = getNextActivePlayerIndex(
            playerIndex,
            1,
            players,
            newDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          const targetPlayer = players[targetIdx]
          const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
            4,
            currentDraw,
            currentDiscard
          )
          currentDraw = newDrawPile
          currentDiscard = newDiscardPile
          updatedPlayers = updatedPlayers.map((p, idx) =>
            idx === targetIdx ? { ...p, hand: [...drawnCards, ...p.hand] } : p
          )
          currentSkippedInfo = {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            playedByName: player.name,
            cardType: 'wild4',
            cardsDrawn: 4,
          }
          message = `${player.name} played Wild +4! Color is now ${effectiveColor}. ${targetPlayer.name} drew 4 cards and was skipped!`
        }
      }

      if (card.type === CARD_TYPES.WILD) {
        message = `${player.name} played Wild! Color is now ${effectiveColor}.`
      }

      const nextPlayerIdx = getNextActivePlayerIndex(
        playerIndex,
        step,
        updatedPlayers,
        newDirection,
        (p) => p.hand.length === 0 || p.rank != null
      )

      setAiPlayers(updatedPlayers)
      setAiDrawPile(currentDraw)
      setAiDiscardPile(currentDiscard)
      setAiTopCard(card)
      setAiActiveColor(effectiveColor)
      setAiCurrentPlayerIndex(nextPlayerIdx)
      setAiHasDrawnCardThisTurn(false)
      if (player.isHuman && nextHand.length !== 1) {
        setAiHasCalledUnoThisRound(false)
      }
      setAiActionMessage(message)
      setAiSkippedInfo(currentSkippedInfo)
      setAiPendingDrawCount(newPendingDrawCount)
      setAiPendingStackType(newPendingStackType)
    },
    [
      aiPlayers,
      aiRankings,
      aiDirection,
      aiDrawPile,
      aiDiscardPile,
      aiHasCalledUnoThisRound,
      aiStackingEnabled,
      aiPendingDrawCount,
      executeAiCatchUno,
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
    if (isDrawingAiRef.current) return
    if (aiHasDrawnCardThisTurn && aiPendingDrawCount === 0) return
    isDrawingAiRef.current = true
    playCardDrawSound()

    // Taking Stack Penalty
    if (aiPendingDrawCount > 0) {
      const penaltyCount = aiPendingDrawCount
      const penaltyType = aiPendingStackType
      const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
        penaltyCount,
        aiDrawPile,
        aiDiscardPile
      )
      const humanPlayer = aiPlayers[aiCurrentPlayerIndex]
      const updatedPlayers = aiPlayers.map((p, idx) =>
        idx === aiCurrentPlayerIndex ? { ...p, hand: [...drawnCards, ...p.hand] } : p
      )
      const nextPlayerIdx = getNextActivePlayerIndex(
        aiCurrentPlayerIndex,
        1,
        updatedPlayers,
        aiDirection,
        (p) => p.hand.length === 0 || p.rank != null
      )
      setAiPlayers(updatedPlayers)
      setAiDrawPile(newDrawPile)
      setAiDiscardPile(newDiscardPile)
      setAiPendingDrawCount(0)
      setAiPendingStackType(null)
      setAiCurrentPlayerIndex(nextPlayerIdx)
      setAiHasDrawnCardThisTurn(false)
      setAiUnoCalledPlayers((prev) => {
        const next = new Set(prev)
        next.delete(humanPlayer.id)
        return next
      })
      setAiHasCalledUnoThisRound(false)
      setAiSkippedInfo({
        playerId: humanPlayer.id,
        playerName: humanPlayer.name,
        playedByName: 'Stack Penalty',
        cardType: penaltyType,
        cardsDrawn: penaltyCount,
      })
      setAiActionMessage(
        `You drew ${penaltyCount} cards from the stack penalty! Turn passed to ${updatedPlayers[nextPlayerIdx].name}.`
      )
      return
    }

    // Normal 1-card draw
    const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
      1,
      aiDrawPile,
      aiDiscardPile
    )
    if (drawnCards.length === 0) {
      setAiHasDrawnCardThisTurn(true)
      setAiActionMessage('No cards left in the draw pile! Pass your turn or play a card.')
      return
    }

    const drawnCard = drawnCards[0]
    const updatedPlayers = aiPlayers.map((p, idx) =>
      idx === aiCurrentPlayerIndex ? { ...p, hand: [drawnCard, ...p.hand] } : p
    )

    setAiPlayers(updatedPlayers)
    setAiDrawPile(newDrawPile)
    setAiDiscardPile(newDiscardPile)
    setAiHasDrawnCardThisTurn(true)
    setAiUnoCalledPlayers((prev) => {
      const next = new Set(prev)
      next.delete(0)
      return next
    })
    setAiHasCalledUnoThisRound(false)
    const activeP = aiPlayers[aiCurrentPlayerIndex]
    setAiActionMessage(`${activeP.name} drew a card.`)
  }

  const handlePassTurnAi = () => {
    if (!aiHasDrawnCardThisTurn && aiPendingDrawCount === 0) return
    const nextPlayerIdx = getNextActivePlayerIndex(
      aiCurrentPlayerIndex,
      1,
      aiPlayers,
      aiDirection,
      (p) => p.hand.length === 0 || p.rank != null
    )
    setAiCurrentPlayerIndex(nextPlayerIdx)
    setAiHasDrawnCardThisTurn(false)
    if (aiPlayers[0]?.hand?.length !== 1) {
      setAiHasCalledUnoThisRound(false)
    }
    setAiSkippedInfo(null)
    const currentP = aiPlayers[aiCurrentPlayerIndex]
    setAiActionMessage(`${currentP.name} passed turn.`)
  }

  const handleCallUnoAi = () => {
    playUnoCallSound()
    setAiHasCalledUnoThisRound(true)
    setAiUnoCalledPlayers((prev) => new Set(prev).add(0))
    if (botCatchHumanTimerRef.current) {
      clearTimeout(botCatchHumanTimerRef.current)
      botCatchHumanTimerRef.current = null
    }
    const humanHand = aiPlayers[0]?.hand || []
    if (humanHand.length === 1) {
      setAiActionMessage('🔔 You shouted UNO! 1 card remaining!')
    } else {
      setAiActionMessage('🔔 You shouted UNO!')
    }
  }

  const handleCatchUnoAi = (targetPlayerId) => {
    executeAiCatchUno(0, targetPlayerId)
  }

  // AI Bots automatic turn loop
  useEffect(() => {
    if (screen !== 'ai_playing' || aiWinner || penaltyGiveCardModal.isOpen) return

    const activePlayer = aiPlayers[aiCurrentPlayerIndex]
    if (!activePlayer || activePlayer.isHuman || activePlayer.hand.length === 0 || activePlayer.rank) {
      // If current player has finished, automatically advance turn to next active player
      if (activePlayer && (activePlayer.hand.length === 0 || activePlayer.rank)) {
        botTimeoutRef.current = setTimeout(() => {
          const nextIdx = getNextActivePlayerIndex(
            aiCurrentPlayerIndex,
            1,
            aiPlayers,
            aiDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          setAiCurrentPlayerIndex(nextIdx)
        }, 100)
      }
      return
    }

    botTimeoutRef.current = setTimeout(() => {
      // 1. Stack Counter Check for Bot
      if (aiPendingDrawCount > 0) {
        const stackCard = activePlayer.hand.find((c) => c.type === aiPendingStackType)
        if (stackCard) {
          const chosenColor =
            stackCard.color === CARD_COLORS.WILD
              ? chooseAiColor(activePlayer.hand)
              : stackCard.color
          executeAiPlayCard(aiCurrentPlayerIndex, stackCard, chosenColor)
          return
        } else {
          // Bot takes the stack penalty
          playCardDrawSound()
          const penaltyCount = aiPendingDrawCount
          const penaltyType = aiPendingStackType
          const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
            penaltyCount,
            aiDrawPile,
            aiDiscardPile
          )
          const updatedPlayers = aiPlayers.map((p, idx) =>
            idx === aiCurrentPlayerIndex ? { ...p, hand: [...drawnCards, ...p.hand] } : p
          )
          const nextIdx = getNextActivePlayerIndex(
            aiCurrentPlayerIndex,
            1,
            updatedPlayers,
            aiDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          setAiPlayers(updatedPlayers)
          setAiDrawPile(newDrawPile)
          setAiDiscardPile(newDiscardPile)
          setAiPendingDrawCount(0)
          setAiPendingStackType(null)
          setAiCurrentPlayerIndex(nextIdx)
          setAiHasDrawnCardThisTurn(false)
          setAiUnoCalledPlayers((prev) => {
            const next = new Set(prev)
            next.delete(activePlayer.id)
            return next
          })
          setAiSkippedInfo({
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            playedByName: 'Stack Penalty',
            cardType: penaltyType,
            cardsDrawn: penaltyCount,
          })
          setAiActionMessage(
            `${activePlayer.name} drew ${penaltyCount} cards from the stack penalty! Turn passed to ${updatedPlayers[nextIdx].name}.`
          )
          return
        }
      }

      const nextPlayerIdx = getNextActivePlayerIndex(
        aiCurrentPlayerIndex,
        1,
        aiPlayers,
        aiDirection,
        (p) => p.hand.length === 0 || p.rank != null
      )
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
          const newHand = [drawnCard, ...activePlayer.hand]

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

            // Hand the post-draw roster over explicitly: executeAiPlayCard's captured
            // aiPlayers predates this draw, so without it the drawn card is not found
            // in the hand, is not removed, and the stale hand is committed back over
            // this one - losing the card while still pushing it to the discard pile.
            if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current)
            botTimeoutRef.current = setTimeout(() => {
              executeAiPlayCard(aiCurrentPlayerIndex, drawnCard, chosenColor, updatedPlayers)
            }, 600)
            return
          } else {
            const updatedPlayers = aiPlayers.map((p, idx) =>
              idx === aiCurrentPlayerIndex ? { ...p, hand: newHand } : p
            )
            setAiPlayers(updatedPlayers)
            setAiDrawPile(newDrawPile)
            setAiDiscardPile(newDiscardPile)
            const nextIdx = getNextActivePlayerIndex(
              aiCurrentPlayerIndex,
              1,
              aiPlayers,
              aiDirection,
              (p) => p.hand.length === 0 || p.rank != null
            )
            setAiCurrentPlayerIndex(nextIdx)
            setAiHasDrawnCardThisTurn(false)
            setAiUnoCalledPlayers((prev) => {
              const next = new Set(prev)
              next.delete(activePlayer.id)
              return next
            })
            setAiSkippedInfo(null)
            setAiActionMessage(`${activePlayer.name} drew a card and passed.`)
          }
        } else {
          const nextIdx = getNextActivePlayerIndex(
            aiCurrentPlayerIndex,
            1,
            aiPlayers,
            aiDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          setAiCurrentPlayerIndex(nextIdx)
          setAiHasDrawnCardThisTurn(false)
          setAiSkippedInfo(null)
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
    executeAiPlayCard,
    aiPendingDrawCount,
    aiPendingStackType,
    penaltyGiveCardModal.isOpen,
  ])

  // ==========================================
  // 3. MULTIPLAYER WEBRTC GAME ENGINE
  // ==========================================

  // Broadcasts state to all connected clients & updates host UI
  const hostBroadcastGameState = useCallback((customMessage = null) => {
    const g = hostGameRef.current
    if (!g) return

    const sanitizedPlayers = sanitizePlayers(g)
    const message = customMessage !== null ? customMessage : g.actionMessage || ''

    // 1. Update Host local UI
    setMpPlayers(sanitizedPlayers)
    setMpRankings(g.rankings || [])
    setMpTopCard(g.topCard)
    setMpActiveColor(g.activeColor)
    setMpCurrentPlayerIndex(g.currentPlayerIndex)
    setMpDirection(g.direction)
    setMpDrawPileCount(g.drawPile.length)
    setMpActionMessage(message)
    setMpUnoCalledPlayers(new Set(g.unoCalledPlayers))
    setMpHasDrawnCardThisTurn(g.hasDrawnThisTurn)
    setMpSkippedInfo(g.skippedInfo || null)
    setMpPendingDrawCount(g.pendingDrawCount || 0)
    setMpPendingStackType(g.pendingStackType || null)
    const hostHandNow = [...handOf(g, HOST_PLAYER_ID)]
    setMyHand(hostHandNow)
    if (hostHandNow.length > 1) {
      setMpHasCalledUnoThisRound(false)
    } else if (g.unoCalledPlayers.has(0)) {
      setMpHasCalledUnoThisRound(true)
    }

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
            hand: [...handOf(g, p.id)],
            topCard: g.topCard,
            activeColor: g.activeColor,
            currentPlayerIndex: g.currentPlayerIndex,
            direction: g.direction,
            drawPileCount: g.drawPile.length,
            players: sanitizedPlayers,
            rankings: g.rankings || [],
            actionMessage: message,
            unoCalledPlayers: Array.from(g.unoCalledPlayers),
            hasDrawnThisTurn: g.hasDrawnThisTurn,
            winner: g.winner,
            skippedInfo: g.skippedInfo || null,
            pendingDrawCount: g.pendingDrawCount || 0,
            pendingStackType: g.pendingStackType || null,
            stackingEnabled: g.stackingEnabled !== false,
          })
        }
      })
    }
  }, [])

  // -----------------------------------------------------------------
  // Host action dispatch
  //
  // All rules live in engine/hostEngine.js. The component's job is only to run an
  // engine call against the authoritative game object, turn the events it reports
  // into side effects (sound, modals, timers), and broadcast the new state.
  // -----------------------------------------------------------------

  const playEngineSound = useCallback((name) => {
    switch (name) {
      case SOUNDS.CARD_PLAY:
        playCardPlaySound()
        break
      case SOUNDS.CARD_DRAW:
        playCardDrawSound()
        break
      case SOUNDS.ACTION_PENALTY:
        playActionCardSound(true)
        break
      case SOUNDS.ACTION_NEUTRAL:
        playActionCardSound(false)
        break
      case SOUNDS.UNO_CALL:
        playUnoCallSound()
        break
      default:
        break
    }
  }, [])

  const applyEngineEvents = useCallback(
    (events) => {
      for (const event of events) {
        switch (event.type) {
          case 'SOUND':
            playEngineSound(event.sound)
            break

          case 'BROADCAST':
            hostNetworkRef.current?.broadcast(event.message)
            break

          case 'CELEBRATE':
            // Only the host's own placement pops a modal here; clients get theirs
            // from the rankings in SYNC_GAME_STATE.
            if (event.playerId === HOST_PLAYER_ID) {
              hasShownMyCelebrationRef.current = true
              setFinishedCelebration({
                isOpen: true,
                rank: event.rank,
                playerName: 'You',
                activeRemaining: event.activeRemaining,
              })
            }
            break

          case 'PENALTY_STARTED': {
            if (event.giverIds.includes(HOST_PLAYER_ID)) {
              setPenaltyGiveCardModal({
                isOpen: true,
                mode: 'mp',
                penaltyId: event.penaltyId,
                targetPlayerId: event.targetPlayerId,
                targetPlayerName: event.targetPlayerName,
                challengerId: event.challengerId,
                botGifts: [],
              })
            }
            // One AFK giver must not be able to stall the match.
            if (penaltyTimeoutRef.current) clearTimeout(penaltyTimeoutRef.current)
            penaltyTimeoutRef.current = setTimeout(() => {
              penaltyTimeoutRef.current = null
              runHostActionRef.current?.(forceResolvePenalty)
            }, PENALTY_TIMEOUT_MS)
            break
          }

          case 'PENALTY_RESOLVED':
            if (penaltyTimeoutRef.current) {
              clearTimeout(penaltyTimeoutRef.current)
              penaltyTimeoutRef.current = null
            }
            setPenaltyGiveCardModal((prev) => ({ ...prev, isOpen: false }))
            break

          default:
            break
        }
      }
    },
    [playEngineSound]
  )

  /**
   * Run one engine action against the authoritative game and publish the result.
   * A rejected action changes nothing and is not broadcast.
   */
  const runHostAction = useCallback(
    (action) => {
      const g = hostGameRef.current
      if (!g) return false

      const result = action(g)
      if (!result.ok) {
        console.warn('[Host] rejected action:', result.reason)
        return false
      }

      applyEngineEvents(result.events)
      hostBroadcastGameState()
      return true
    },
    [applyEngineEvents, hostBroadcastGameState]
  )

  // Lets the penalty timeout reach the latest runHostAction without re-arming itself.
  useEffect(() => {
    runHostActionRef.current = runHostAction
  }, [runHostAction])

  const hostProcessPlayCard = useCallback(
    (playerId, cardId, chosenColor = null, fallbackCard = null) =>
      runHostAction((g) => playCard(g, playerId, cardId, chosenColor, fallbackCard)),
    [runHostAction]
  )

  const hostProcessDrawCard = useCallback(
    (playerId) => runHostAction((g) => drawCard(g, playerId)),
    [runHostAction]
  )

  const hostProcessPassTurn = useCallback(
    (playerId) => runHostAction((g) => passTurn(g, playerId)),
    [runHostAction]
  )

  const hostProcessCallUno = useCallback(
    (playerId, playerName) => runHostAction((g) => callUno(g, playerId, playerName)),
    [runHostAction]
  )

  const hostProcessCatchUno = useCallback(
    (challengerId, targetPlayerId) =>
      runHostAction((g) => catchUno(g, challengerId, targetPlayerId)),
    [runHostAction]
  )

  const hostProcessSubmitPenaltyCard = useCallback(
    (giverId, card, penaltyId) =>
      runHostAction((g) => submitPenaltyCard(g, giverId, card, penaltyId)),
    [runHostAction]
  )


  // Host authoritative handler when a player leaves or disconnects
  const hostProcessClientLeave = useCallback(
    (clientPeerId, explicitPlayerId = null) => {
      const g = hostGameRef.current
      if (!g) return

      if (hostNetworkRef.current) {
        hostNetworkRef.current.removeConnection(clientPeerId)
      }

      const player = g.players.find(
        (p) => p.peerId === clientPeerId || (explicitPlayerId !== null && p.id === explicitPlayerId)
      )
      if (!player || player.isHost) return

      const isGameActive = isMatchInProgress(g) && !g.winner

      if (isGameActive) {
        // If match is active, mark disconnected so player can reconnect without losing hand
        player.peerId = null
        player.connected = false

        const penalty = g.pendingCatchPenalty
        if (penalty) {
          if (penalty.targetPlayerId === player.id) {
            // The caught player left; there is nobody to hand the cards to.
            g.pendingCatchPenalty = null
            if (penaltyTimeoutRef.current) {
              clearTimeout(penaltyTimeoutRef.current)
              penaltyTimeoutRef.current = null
            }
            setPenaltyGiveCardModal((prev) => ({ ...prev, isOpen: false }))
          } else if (penalty.giverIds.includes(player.id)) {
            // Drop them from the collection; resolve if they were the last holdout.
            penalty.giverIds = penalty.giverIds.filter((id) => id !== player.id)
            penalty.givenCards.delete(player.id)
            if (penalty.giverIds.every((id) => penalty.givenCards.has(id))) {
              runHostActionRef.current?.(finalizeCatchPenalty)
            }
          }
        }

        // 1. Check if only 1 connected active player remains in the game
        const connectedActive = g.players.filter(
          (p) => p.connected !== false && handOf(g, p.id).length > 0 && p.rank == null
        )
        if (connectedActive.length <= 1) {
          if (disconnectTurnTimerRef.current) clearTimeout(disconnectTurnTimerRef.current)
          disconnectTurnTimerRef.current = setTimeout(() => {
            const curG = hostGameRef.current
            if (!curG || curG.winner) return
            const curConnected = curG.players.filter(
              (p) => p.connected !== false && handOf(curG, p.id).length > 0 && p.rank == null
            )
            if (curConnected.length === 1) {
              const soleWinner = curConnected[0]
              curG.winner = {
                playerId: soleWinner.id,
                name: soleWinner.name,
                avatar: soleWinner.avatar,
                isHost: soleWinner.isHost,
                rank: 1,
                remainingCards: handOf(curG, soleWinner.id).length,
              }
              curG.actionMessage = `🏆 ${soleWinner.name} wins! All other opponents disconnected.`
              hostBroadcastGameState()
            }
          }, 15000)
        } else if (g.players[g.currentPlayerIndex]?.id === player.id) {
          // 2. Disconnected player's turn is active: give 12s to reconnect before auto-passing turn
          if (disconnectTurnTimerRef.current) clearTimeout(disconnectTurnTimerRef.current)
          disconnectTurnTimerRef.current = setTimeout(() => {
            const curG = hostGameRef.current
            if (!curG || curG.winner) return
            const curActive = curG.players[curG.currentPlayerIndex]
            if (curActive && curActive.connected === false) {
              const nextIdx = getNextActivePlayerIndex(
                curG.currentPlayerIndex,
                1,
                curG.players,
                curG.direction,
                (p) => handOf(curG, p.id).length === 0 || p.rank != null
              )
              curG.currentPlayerIndex = nextIdx
              curG.hasDrawnThisTurn = false
              curG.actionMessage = `${curActive.name} disconnected. Turn passed to ${curG.players[nextIdx]?.name || 'next player'}.`
              hostBroadcastGameState()
            }
          }, 12000)
        }

        hostBroadcastGameState(`${player.name} temporarily disconnected. Waiting for reconnect...`)
        return
      }

      // If in lobby, remove player normally and re-index player IDs cleanly (0 is Host, 1, 2...)
      const filtered = g.players.filter((p) => p.id !== player.id)
      const reIndexed = filtered.map((p, idx) => ({
        ...p,
        id: idx,
        isHost: idx === 0,
      }))
      g.players = reIndexed

      if (hostNetworkRef.current) {
        hostNetworkRef.current.broadcast({
          type: 'ROOM_UPDATE',
          roomCode: g.roomCode,
          players: reIndexed,
          maxPlayers: g.maxPlayers || 4,
          stackingEnabled: g.stackingEnabled !== false,
        })
      }
      setMpRoomState((prev) => ({ ...prev, players: reIndexed }))
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
      } else if (data.type === 'ACTION_CATCH_UNO') {
        hostProcessCatchUno(playerId, data.targetPlayerId)
      } else if (data.type === 'ACTION_SUBMIT_PENALTY_CARD') {
        hostProcessSubmitPenaltyCard(playerId, data.card, data.penaltyId)
      } else if (data.type === 'ACTION_REQUEST_SYNC') {
        hostBroadcastGameState('Host synchronized game state.')
      } else if (data.type === 'ACTION_LEAVE') {
        hostProcessClientLeave(clientPeerId, data.playerId)
      }
    }
  }, [
    hostProcessPlayCard,
    hostProcessDrawCard,
    hostProcessPassTurn,
    hostProcessCallUno,
    hostProcessCatchUno,
    hostProcessSubmitPenaltyCard,
    hostBroadcastGameState,
    hostProcessClientLeave,
  ])

  // Inform host immediately if tab or window is closing / navigating away
  useEffect(() => {
    const handleLeaveGracefully = () => {
      if (clientNetworkRef.current) {
        try {
          clientNetworkRef.current.sendAction({
            type: 'ACTION_LEAVE',
            playerId: myPlayerIdRef.current,
          })
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('beforeunload', handleLeaveGracefully)
    window.addEventListener('pagehide', handleLeaveGracefully)
    return () => {
      window.removeEventListener('beforeunload', handleLeaveGracefully)
      window.removeEventListener('pagehide', handleLeaveGracefully)
    }
  }, [])

  // Host creates room
  const handleCreateRoom = ({ name, avatar, maxPlayers, enableStacking = true }) => {
    if (clientNetworkRef.current) {
      try {
        clientNetworkRef.current.destroy()
      } catch (e) {
        console.error('[Host] Error destroying client peer when creating room:', e)
      }
      clientNetworkRef.current = null
    }
    if (hostNetworkRef.current) {
      try {
        hostNetworkRef.current.destroy()
      } catch (e) {
        console.error('[Host] Error destroying old host peer when creating room:', e)
      }
      hostNetworkRef.current = null
    }

    const code = generateRoomCode()
    setUrlRoomCode(code)
    try {
      sessionStorage.setItem('uno_active_room', code)
    } catch {
      // ignore
    }
    const hostPlayer = {
      id: HOST_PLAYER_ID,
      name,
      avatar,
      isHost: true,
      isYou: true,
      connected: true,
      sessionId: getClientSessionId(),
    }
    myProfileRef.current = { name, avatar, roomCode: code }
    setMpConnectionStatus('connected')

    hostGameRef.current = createHostGame({
      roomCode: code,
      hostPlayer,
      maxPlayers,
      stackingEnabled: enableStacking,
    })

    setMpRoomState({
      isInRoom: false,
      isHost: true,
      roomCode: code,
      players: [hostPlayer],
      maxPlayers,
      stackingEnabled: enableStacking,
      isConnecting: true,
      error: '',
    })
    setMpStackingEnabled(enableStacking)
    setMpPendingDrawCount(0)
    setMpPendingStackType(null)
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
      onClientJoin: async (clientPeerId, clientPlayer, conn) => {
        const g = hostGameRef.current
        if (!g) return
        const currentPlayers = g.players
        const roomCapacity = g.maxPlayers || maxPlayers || 4
        const rawName = clientPlayer?.name || ''
        const incomingName = rawName.trim()
        const cleanIncomingName = incomingName.toLowerCase()
        const incomingSessionId = clientPlayer?.sessionId || ''

        // 1. Validate that name is not empty
        if (!incomingName) {
          try {
            conn.send({
              type: 'ROOM_ERROR',
              error: 'Please enter a valid player name before joining.',
            })
          } catch (e) {
            console.error('[Host] Failed to send empty name ROOM_ERROR:', e)
          }
          setTimeout(() => {
            if (hostNetworkRef.current) {
              hostNetworkRef.current.removeConnection(clientPeerId)
            }
          }, 300)
          return
        }

        const isGameStarted = isMatchInProgress(g)

        // 2. If the game has already started: only allow registered players from the lobby to reconnect
        if (isGameStarted) {
          const wasInLobby = g.lockedLobbyPlayerNames
            ? g.lockedLobbyPlayerNames.has(cleanIncomingName)
            : currentPlayers.some((p) => p.name.trim().toLowerCase() === cleanIncomingName)

          const existingPlayer = currentPlayers.find(
            (p) =>
              !p.isHost &&
              (p.peerId === clientPeerId ||
                (incomingSessionId && p.sessionId && p.sessionId === incomingSessionId) ||
                p.name.trim().toLowerCase() === cleanIncomingName)
          )

          // External player who was NOT in the lobby when created/started: reject immediately!
          if (!wasInLobby || !existingPlayer) {
            try {
              conn.send({
                type: 'ROOM_ERROR',
                error: 'This game has already started. External players cannot join an active match.',
              })
            } catch (e) {
              console.error('[Host] Failed to send game-started ROOM_ERROR:', e)
            }
            setTimeout(() => {
              if (hostNetworkRef.current) {
                hostNetworkRef.current.removeConnection(clientPeerId)
              }
            }, 300)
            return
          }

          // Check if this lobby player is ALREADY actively connected (prevent duplicate session / hijack)
          if (existingPlayer.connected && existingPlayer.peerId && existingPlayer.peerId !== clientPeerId) {
            const isSameSession = Boolean(
              incomingSessionId && existingPlayer.sessionId && existingPlayer.sessionId === incomingSessionId
            )

            // If not verified as the same browser session ID, test if old connection is still responsive
            if (!isSameSession) {
              const isOldConnAlive = hostNetworkRef.current
                ? await hostNetworkRef.current.checkPeerResponsive(existingPlayer.peerId, 1200)
                : false

              // If the old connection is genuinely still alive and active, prevent duplicate session
              if (isOldConnAlive) {
                try {
                  conn.send({
                    type: 'ROOM_ERROR',
                    error: `A player named "${incomingName}" is already actively connected in this match.`,
                  })
                } catch (e) {
                  console.error('[Host] Failed to send duplicate active player ROOM_ERROR:', e)
                }
                setTimeout(() => {
                  if (hostNetworkRef.current) {
                    hostNetworkRef.current.removeConnection(clientPeerId)
                  }
                }, 300)
                return
              }
            }
          }

          // Legitimate registered player reconnecting to their seat (replaces old ghost connection)
          if (existingPlayer.peerId && existingPlayer.peerId !== clientPeerId && hostNetworkRef.current) {
            hostNetworkRef.current.removeConnection(existingPlayer.peerId)
          }
          existingPlayer.peerId = clientPeerId
          existingPlayer.connected = true
          if (incomingSessionId) {
            existingPlayer.sessionId = incomingSessionId
          }
          if (clientPlayer?.avatar) {
            existingPlayer.avatar = clientPlayer.avatar
          }

          try {
            conn.send({
              type: 'WELCOME',
              playerId: existingPlayer.id,
              roomCode: code,
              players: currentPlayers,
              maxPlayers: roomCapacity,
              stackingEnabled: g.stackingEnabled !== false,
            })
          } catch (e) {
            console.error('[Host] Failed to send WELCOME to reconnecting player:', e)
          }

          const sanitizedPlayers = sanitizePlayers(g)

          try {
            conn.send({
              type: 'SYNC_GAME_STATE',
              yourPlayerId: existingPlayer.id,
              hand: [...handOf(g, existingPlayer.id)],
              topCard: g.topCard,
              activeColor: g.activeColor,
              currentPlayerIndex: g.currentPlayerIndex,
              direction: g.direction,
              drawPileCount: g.drawPile.length,
              players: sanitizedPlayers,
              rankings: g.rankings || [],
              actionMessage: `${existingPlayer.name} reconnected to the game!`,
              unoCalledPlayers: Array.from(g.unoCalledPlayers),
              hasDrawnThisTurn: g.hasDrawnThisTurn,
              winner: g.winner,
              skippedInfo: g.skippedInfo || null,
              pendingDrawCount: g.pendingDrawCount || 0,
              pendingStackType: g.pendingStackType || null,
              stackingEnabled: g.stackingEnabled !== false,
            })
          } catch (e) {
            console.error('[Host] Failed to send SYNC_GAME_STATE on reconnect:', e)
          }

          if (disconnectTurnTimerRef.current) {
            clearTimeout(disconnectTurnTimerRef.current)
            disconnectTurnTimerRef.current = null
          }

          hostBroadcastGameState(`${existingPlayer.name} reconnected!`)
          setMpRoomState((prev) => ({ ...prev, players: currentPlayers }))
          return
        }

        // 3. Game has NOT started yet (In Lobby)
        // Check if there's an existing player with the same name or session ID in the room
        const existingLobbyPlayer = currentPlayers.find(
          (p) =>
            !p.isHost &&
            (p.peerId === clientPeerId ||
              (incomingSessionId && p.sessionId && p.sessionId === incomingSessionId) ||
              p.name.trim().toLowerCase() === cleanIncomingName)
        )

        // Check if the host itself has this name
        const isHostName = currentPlayers.some(
          (p) => p.isHost && p.name.trim().toLowerCase() === cleanIncomingName
        )

        if (isHostName) {
          try {
            conn.send({
              type: 'ROOM_ERROR',
              error: `The name "${incomingName}" is already taken by the room host. Please choose a different name.`,
            })
          } catch (e) {
            console.error('[Host] Failed to send host name duplicate ROOM_ERROR:', e)
          }
          setTimeout(() => {
            if (hostNetworkRef.current) {
              hostNetworkRef.current.removeConnection(clientPeerId)
            }
          }, 300)
          return
        }

        if (existingLobbyPlayer) {
          const isSameSession = Boolean(
            incomingSessionId && existingLobbyPlayer.sessionId && existingLobbyPlayer.sessionId === incomingSessionId
          )

          let canReclaimSeat = isSameSession || !existingLobbyPlayer.connected

          if (!canReclaimSeat && existingLobbyPlayer.peerId && existingLobbyPlayer.peerId !== clientPeerId) {
            const isOldConnAlive = hostNetworkRef.current
              ? await hostNetworkRef.current.checkPeerResponsive(existingLobbyPlayer.peerId, 1200)
              : false
            canReclaimSeat = !isOldConnAlive
          }

          if (canReclaimSeat) {
            // Reconnect / reclaim lobby seat
            if (existingLobbyPlayer.peerId && existingLobbyPlayer.peerId !== clientPeerId && hostNetworkRef.current) {
              hostNetworkRef.current.removeConnection(existingLobbyPlayer.peerId)
            }
            existingLobbyPlayer.peerId = clientPeerId
            existingLobbyPlayer.connected = true
            existingLobbyPlayer.name = incomingName
            if (incomingSessionId) existingLobbyPlayer.sessionId = incomingSessionId
            if (clientPlayer?.avatar) existingLobbyPlayer.avatar = clientPlayer.avatar

            try {
              conn.send({
                type: 'WELCOME',
                playerId: existingLobbyPlayer.id,
                roomCode: code,
                players: currentPlayers,
                maxPlayers: roomCapacity,
                stackingEnabled: g.stackingEnabled !== false,
              })
            } catch (e) {
              console.error('[Host] Failed to send WELCOME to reconnected lobby player:', e)
            }

            setTimeout(() => {
              if (hostNetworkRef.current) {
                hostNetworkRef.current.broadcast({
                  type: 'ROOM_UPDATE',
                  roomCode: code,
                  players: currentPlayers,
                  maxPlayers: roomCapacity,
                  stackingEnabled: g.stackingEnabled !== false,
                })
              }
            }, 50)

            setMpRoomState((prev) => ({ ...prev, players: currentPlayers }))
            return
          } else {
            // Name genuinely in use by another active player
            try {
              conn.send({
                type: 'ROOM_ERROR',
                error: `The name "${incomingName}" is already taken in this room. Please choose a different name.`,
              })
            } catch (e) {
              console.error('[Host] Failed to send duplicate name ROOM_ERROR:', e)
            }
            setTimeout(() => {
              if (hostNetworkRef.current) {
                hostNetworkRef.current.removeConnection(clientPeerId)
              }
            }, 300)
            return
          }
        }

        // 4. Check room capacity
        if (currentPlayers.length >= roomCapacity) {
          try {
            conn.send({
              type: 'ROOM_ERROR',
              error: `Room is full (maximum ${roomCapacity} players).`,
            })
          } catch (e) {
            console.error('[Host] Failed to send ROOM_ERROR for full room:', e)
          }
          setTimeout(() => {
            if (hostNetworkRef.current) {
              hostNetworkRef.current.removeConnection(clientPeerId)
            }
          }, 300)
          return
        }

        // 5. Add new player to lobby
        const newId = currentPlayers.length
        const newPlayer = {
          id: newId,
          peerId: clientPeerId,
          sessionId: incomingSessionId,
          name: incomingName,
          avatar: clientPlayer?.avatar || '😎',
          isHost: false,
          isYou: false,
          connected: true,
        }
        const updatedPlayers = [...currentPlayers, newPlayer]
        g.players = updatedPlayers

        try {
          conn.send({
            type: 'WELCOME',
            playerId: newPlayer.id,
            roomCode: code,
            players: updatedPlayers,
            maxPlayers: roomCapacity,
            stackingEnabled: g.stackingEnabled !== false,
          })
        } catch (e) {
          console.error('[Host] Failed to send WELCOME to new player:', e)
        }

        setTimeout(() => {
          if (hostNetworkRef.current) {
            hostNetworkRef.current.broadcast({
              type: 'ROOM_UPDATE',
              roomCode: code,
              players: updatedPlayers,
              maxPlayers: roomCapacity,
              stackingEnabled: g.stackingEnabled !== false,
            })
          }
        }, 50)

        setMpRoomState((prev) => ({ ...prev, players: updatedPlayers }))
      },
      onClientLeave: (clientPeerId) => {
        hostProcessClientLeave(clientPeerId)
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
    if (clientNetworkRef.current) {
      try {
        clientNetworkRef.current.destroy()
      } catch (e) {
        console.error('[Client] Error destroying existing client peer:', e)
      }
      clientNetworkRef.current = null
    }

    myProfileRef.current = { name, avatar, roomCode }
    setMpConnectionStatus('reconnecting')
    setMpRoomState((prev) => ({
      ...prev,
      isConnecting: true,
      error: '',
    }))

    const clientPeer = initClientPeer({
      roomCode,
      player: { name, avatar, sessionId: getClientSessionId() },
      onConnected: () => {
        setMpConnectionStatus('connected')
        setMpRoomState((prev) => ({
          ...prev,
          roomCode,
          isConnecting: true,
          // note: do not set isInRoom: true until host sends WELCOME or SYNC_GAME_STATE!
        }))
      },
      onData: (data) => {
        if (data.type === 'ROOM_ERROR') {
          setMpConnectionStatus('disconnected')
          if (clientNetworkRef.current) {
            try {
              clientNetworkRef.current.destroy()
            } catch {
              // ignore
            }
            clientNetworkRef.current = null
          }
          setMpRoomState((prev) => ({
            ...prev,
            isConnecting: false,
            isInRoom: false,
            error: data.error || 'Unable to join room.',
          }))
          return
        }
        if (data.type === 'WELCOME') {
          setUrlRoomCode(roomCode)
          try {
            sessionStorage.setItem('uno_active_room', roomCode)
            sessionStorage.setItem('uno_last_room', roomCode)
          } catch {
            // ignore
          }
          setMyPlayerId(data.playerId)
          myPlayerIdRef.current = data.playerId
          if (data.stackingEnabled !== undefined) {
            setMpStackingEnabled(data.stackingEnabled)
          }
          if (data.players) {
            setMpRoomState((prev) => ({
              ...prev,
              isInRoom: true,
              isHost: false,
              roomCode,
              error: '',
              isConnecting: false,
              maxPlayers: data.maxPlayers || prev.maxPlayers,
              stackingEnabled: data.stackingEnabled !== undefined ? data.stackingEnabled : prev.stackingEnabled,
              players: data.players.map((p) => ({
                ...p,
                isYou: p.id === data.playerId,
              })),
            }))
          }
        } else if (data.type === 'ROOM_UPDATE') {
          if (data.stackingEnabled !== undefined) {
            setMpStackingEnabled(data.stackingEnabled)
          }
          const myPlayer = data.players.find(
            (p) => (!p.isHost && p.name === name) || p.id === myPlayerIdRef.current
          )
          if (myPlayer) {
            setMyPlayerId(myPlayer.id)
            myPlayerIdRef.current = myPlayer.id
          }
          setMpRoomState((prev) => ({
            ...prev,
            maxPlayers: data.maxPlayers !== undefined ? data.maxPlayers : prev.maxPlayers,
            stackingEnabled: data.stackingEnabled !== undefined ? data.stackingEnabled : prev.stackingEnabled,
            players: data.players.map((p) => ({
              ...p,
              isYou: myPlayer ? p.id === myPlayer.id : p.id === myPlayerIdRef.current,
            })),
          }))
        } else if (data.type === 'SYNC_GAME_STATE') {
          setUrlRoomCode(roomCode)
          try {
            sessionStorage.setItem('uno_active_room', roomCode)
            sessionStorage.setItem('uno_last_room', roomCode)
          } catch {
            // ignore
          }
          setMpConnectionStatus('connected')
          if (data.yourPlayerId !== undefined) {
            setMyPlayerId(data.yourPlayerId)
            myPlayerIdRef.current = data.yourPlayerId
          }
          setMpRoomState((prev) => ({
            ...prev,
            isInRoom: true,
            isHost: false,
            roomCode,
            error: '',
            isConnecting: false,
          }))
          const myHandNow = data.hand || []
          setMyHand(myHandNow)
          setMpPlayers(data.players || [])
          setMpTopCard(data.topCard)
          setMpActiveColor(data.activeColor)
          setMpCurrentPlayerIndex(data.currentPlayerIndex)
          setMpDirection(data.direction)
          setMpDrawPileCount(data.drawPileCount)
          setMpActionMessage(data.actionMessage)
          const unoSet = new Set(data.unoCalledPlayers || [])
          setMpUnoCalledPlayers(unoSet)
          setMpHasDrawnCardThisTurn(data.hasDrawnThisTurn || false)
          if (myHandNow.length > 1) {
            setMpHasCalledUnoThisRound(false)
          } else if (unoSet.has(myPlayerIdRef.current)) {
            setMpHasCalledUnoThisRound(true)
          }
          setMpSkippedInfo(data.skippedInfo || null)
          setMpPendingDrawCount(data.pendingDrawCount || 0)
          setMpPendingStackType(data.pendingStackType || null)
          if (data.stackingEnabled !== undefined) {
            setMpStackingEnabled(data.stackingEnabled)
          }

          if (data.rankings) {
            setMpRankings(data.rankings)
            if (data.rankings.length === 0) {
              hasShownMyCelebrationRef.current = false
              setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
              setPenaltyGiveCardModal({
                isOpen: false,
                mode: 'mp',
                penaltyId: null,
                targetPlayerId: null,
                targetPlayerName: '',
                challengerId: null,
                botGifts: [],
              })
            } else {
              const myRankRecord = data.rankings.find((r) => r.playerId === myPlayerIdRef.current)
              if (myRankRecord && !hasShownMyCelebrationRef.current && !data.winner) {
                hasShownMyCelebrationRef.current = true
                const remainingActive = (data.players || []).filter((p) => (p.cardCount || 0) > 0).length
                setFinishedCelebration({
                  isOpen: true,
                  rank: myRankRecord.rank,
                  playerName: 'You',
                  activeRemaining: remainingActive,
                })
              }
            }
          }

          if (data.winner) {
            setMpWinner(data.winner)
            setFinishedCelebration((prev) => ({ ...prev, isOpen: false }))
            setScreen('mp_gameover')
          } else {
            setScreen('mp_playing')
          }
        } else if (data.type === 'ROOM_RESET_TO_LOBBY') {
          if (data.players) {
            setMpRoomState((prev) => ({
              ...prev,
              isInRoom: true,
              players: data.players.map((p) => ({
                ...p,
                isYou: p.id === myPlayerIdRef.current,
              })),
            }))
          }
          setScreen('mp_lobby')
          setMpPendingDrawCount(0)
          setMpPendingStackType(null)
          setMpRankings([])
          hasShownMyCelebrationRef.current = false
          setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
          setPenaltyGiveCardModal({
            isOpen: false,
            mode: 'mp',
            penaltyId: null,
            targetPlayerId: null,
            targetPlayerName: '',
            challengerId: null,
            botGifts: [],
          })
          setMpActionMessage('Host returned all players to room lobby.')
        } else if (data.type === 'UNO_SHOUTED') {
          playUnoCallSound()
          setMpUnoCalledPlayers((prev) => new Set(prev).add(data.playerId))
          setMpActionMessage(`🔔 ${data.playerName} shouted UNO!`)
        } else if (data.type === 'PENALTY_CARD_REQUEST') {
          if (data.giverIds && data.giverIds.includes(myPlayerIdRef.current)) {
            setPenaltyGiveCardModal({
              isOpen: true,
              mode: 'mp',
              penaltyId: data.penaltyId,
              targetPlayerId: data.targetPlayerId,
              targetPlayerName: data.targetPlayerName,
              challengerId: data.challengerId,
              botGifts: [],
            })
          }
        } else if (data.type === 'UNO_CAUGHT') {
          playActionCardSound(true)
          setMpActionMessage(data.message)
          setPenaltyGiveCardModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
      onDisconnected: () => {
        setMpConnectionStatus('disconnected')
        if (screenRef.current === 'mp_playing') {
          setMpActionMessage('Connection interrupted. Click Menu or Reconnect to restore state.')
        } else {
          setMpRoomState((prev) => ({
            ...prev,
            isInRoom: false,
            isConnecting: false,
            error: prev.error || 'Disconnected from host or room closed.',
          }))
          setScreen('mp_lobby')
        }
      },
      onError: (err) => {
        setMpConnectionStatus('disconnected')
        setMpRoomState((prev) => ({
          ...prev,
          isConnecting: false,
          isInRoom: false,
          error: prev.error || err?.message || 'Could not connect to room. Check code and try again.',
        }))
      },
    })

    clientNetworkRef.current = clientPeer
  }

  // Host starts the match (Host ALWAYS has the first move: currentPlayerIndex = 0)
  const handleHostStartGame = () => {
    if (disconnectTurnTimerRef.current) {
      clearTimeout(disconnectTurnTimerRef.current)
      disconnectTurnTimerRef.current = null
    }
    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current)
      penaltyTimeoutRef.current = null
    }

    const g = hostGameRef.current
    if (!g) return
    startMatch(g)

    setMpConnectionStatus('connected')
    setMpRoomState((prev) => ({
      ...prev,
      isInRoom: true,
      isHost: true,
      error: '',
    }))
    setScreen('mp_playing')
    setMpCurrentPlayerIndex(0)
    setMyPlayerId(HOST_PLAYER_ID)
    myPlayerIdRef.current = HOST_PLAYER_ID
    setMpWinner(null)
    setMpRankings([])
    setMpSkippedInfo(null)
    setMpPendingDrawCount(0)
    setMpPendingStackType(null)
    hasShownMyCelebrationRef.current = false
    setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
    setPenaltyGiveCardModal({
      isOpen: false,
      mode: 'mp',
      penaltyId: null,
      targetPlayerId: null,
      targetPlayerName: '',
      challengerId: null,
      botGifts: [],
    })

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
      hostProcessPlayCard(HOST_PLAYER_ID, card.id, color, card)
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
    if (isDrawingMpRef.current) return
    if (mpHasDrawnCardThisTurn && mpPendingDrawCount === 0) return
    isDrawingMpRef.current = true

    // Safety fallback: release drawing lock after 2000ms if network response is delayed
    setTimeout(() => {
      isDrawingMpRef.current = false
    }, 2000)

    if (mpRoomState.isHost) {
      hostProcessDrawCard(HOST_PLAYER_ID)
    } else if (clientNetworkRef.current) {
      clientNetworkRef.current.sendAction({
        type: 'ACTION_DRAW_CARD',
        playerId: myPlayerIdRef.current,
      })
    }
  }

  const handleMpPassTurn = () => {
    if (mpRoomState.isHost) {
      hostProcessPassTurn(HOST_PLAYER_ID)
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
      hostProcessCallUno(HOST_PLAYER_ID, myPlayer?.name || 'Host')
    } else if (clientNetworkRef.current) {
      clientNetworkRef.current.sendAction({
        type: 'ACTION_CALL_UNO',
        playerId: myPlayerIdRef.current,
        playerName: myPlayer?.name || 'Friend',
      })
    }
  }

  const handleMpCatchUno = useCallback(
    (targetPlayerId) => {
      const targetPlayer = mpPlayers.find((p) => p.id === targetPlayerId)
      if (!targetPlayer) return

      if (targetPlayer.rank != null) {
        setMpActionMessage(`${targetPlayer.name} has already finished the match!`)
        return
      }
      if (targetPlayer.cardCount !== 1) {
        setMpActionMessage(
          `${targetPlayer.name} has ${targetPlayer.cardCount} cards (must have exactly 1 card to be caught).`
        )
        return
      }
      if (mpUnoCalledPlayers.has(targetPlayerId)) {
        setMpActionMessage(`${targetPlayer.name} already called UNO!`)
        return
      }

      if (mpRoomState.isHost) {
        hostProcessCatchUno(myPlayerIdRef.current, targetPlayerId)
      } else if (clientNetworkRef.current) {
        clientNetworkRef.current.sendAction({
          type: 'ACTION_CATCH_UNO',
          challengerId: myPlayerIdRef.current,
          targetPlayerId,
        })
      }
    },
    [mpPlayers, mpUnoCalledPlayers, mpRoomState.isHost, hostProcessCatchUno]
  )

  const handleConfirmGiveCardMp = useCallback(
    (selectedCard) => {
      const penaltyId = penaltyGiveCardModal.penaltyId
      if (mpRoomState.isHost) {
        hostProcessSubmitPenaltyCard(HOST_PLAYER_ID, selectedCard, penaltyId)
      } else if (clientNetworkRef.current) {
        clientNetworkRef.current.sendAction({
          type: 'ACTION_SUBMIT_PENALTY_CARD',
          playerId: myPlayerIdRef.current,
          penaltyId,
          card: selectedCard,
        })
      }
      setPenaltyGiveCardModal({
        isOpen: false,
        mode: 'mp',
        penaltyId: null,
        targetPlayerId: null,
        targetPlayerName: '',
        challengerId: null,
        botGifts: [],
      })
    },
    [penaltyGiveCardModal, mpRoomState.isHost, hostProcessSubmitPenaltyCard]
  )

  const handleReconnectMp = useCallback(() => {
    // If this instance is the host, never execute client reconnection logic
    if (hostNetworkRef.current || mpRoomState.isHost) {
      if (
        hostNetworkRef.current?.peer &&
        hostNetworkRef.current.peer.disconnected &&
        !hostNetworkRef.current.peer.destroyed
      ) {
        try {
          hostNetworkRef.current.peer.reconnect()
        } catch (e) {
          console.warn('[Host] Reconnect signaling peer error:', e)
        }
      }
      setMpConnectionStatus('connected')
      return
    }

    if (!myProfileRef.current || !myProfileRef.current.roomCode) return
    setMpConnectionStatus('reconnecting')
    if (clientNetworkRef.current) {
      try {
        clientNetworkRef.current.destroy()
      } catch (e) {
        console.error('[Client] Error destroying peer on reconnect:', e)
      }
      clientNetworkRef.current = null
    }
    handleJoinRoom(myProfileRef.current)
  }, [mpRoomState.isHost])

  const handleSyncGameStateMp = useCallback(() => {
    if (hostNetworkRef.current || mpRoomState.isHost) {
      setMpConnectionStatus('connected')
      hostBroadcastGameState('Host synchronized game state.')
      return
    }
    if (clientNetworkRef.current) {
      if (!clientNetworkRef.current.isConnected()) {
        handleReconnectMp()
        return
      }
      const sent = clientNetworkRef.current.sendAction({
        type: 'ACTION_REQUEST_SYNC',
        playerId: myPlayerIdRef.current,
      })
      if (!sent) {
        handleReconnectMp()
      }
    } else {
      handleReconnectMp()
    }
  }, [mpRoomState.isHost, hostBroadcastGameState, handleReconnectMp])

  const handleHostReturnAllToLobby = useCallback(() => {
    if (disconnectTurnTimerRef.current) {
      clearTimeout(disconnectTurnTimerRef.current)
      disconnectTurnTimerRef.current = null
    }
    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current)
      penaltyTimeoutRef.current = null
    }

    const g = hostGameRef.current
    if (!g) return
    resetToLobby(g)
    if (hostNetworkRef.current) {
      hostNetworkRef.current.broadcast({
        type: 'ROOM_RESET_TO_LOBBY',
        players: g.players,
      })
    }
    setMpConnectionStatus('connected')
    setMpRoomState((prev) => ({
      ...prev,
      isInRoom: true,
      isHost: true,
      players: g.players,
      error: '',
      isConnecting: false,
    }))
    setScreen('mp_lobby')
    setMpPendingDrawCount(0)
    setMpPendingStackType(null)
    setMpRankings([])
    hasShownMyCelebrationRef.current = false
    setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
    setMpActionMessage('Host returned all players to room lobby.')
  }, [])

  const handleClientReturnToLobby = useCallback(() => {
    if (clientNetworkRef.current) {
      try {
        clientNetworkRef.current.sendAction({
          type: 'ACTION_LEAVE',
          playerId: myPlayerIdRef.current,
        })
      } catch (e) {
        console.error('[Client] Error sending ACTION_LEAVE on return to lobby:', e)
      }
      try {
        clientNetworkRef.current.destroy()
      } catch (e) {
        console.error('[Client] Error destroying client network on return to lobby:', e)
      }
      clientNetworkRef.current = null
    }
    clearUrlRoomCode()
    try {
      sessionStorage.removeItem('uno_active_room')
    } catch {
      // ignore
    }
    setMpConnectionStatus('connected')
    setMpRoomState((prev) => ({
      ...prev,
      isInRoom: false,
      isHost: false,
      roomCode: '',
      players: [],
      isConnecting: false,
      error: '',
    }))
    setScreen('mp_lobby')
    setMpPendingDrawCount(0)
    setMpPendingStackType(null)
    setMpRankings([])
    hasShownMyCelebrationRef.current = false
    setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
  }, [])

  const handleUniversalReturnToLobby = useCallback(() => {
    if (hostNetworkRef.current || mpRoomState.isHost) {
      handleHostReturnAllToLobby()
    } else {
      handleClientReturnToLobby()
    }
  }, [mpRoomState.isHost, handleHostReturnAllToLobby, handleClientReturnToLobby])

  const handleLeaveMpRoom = useCallback(() => {
    if (disconnectTurnTimerRef.current) {
      clearTimeout(disconnectTurnTimerRef.current)
      disconnectTurnTimerRef.current = null
    }
    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current)
      penaltyTimeoutRef.current = null
    }

    if (clientNetworkRef.current) {
      try {
        clientNetworkRef.current.sendAction({
          type: 'ACTION_LEAVE',
          playerId: myPlayerIdRef.current,
        })
      } catch (e) {
        console.error('[Client] Error sending ACTION_LEAVE on leave room:', e)
      }
      try {
        clientNetworkRef.current.destroy()
      } catch (e) {
        console.error('[Client] Error destroying client network on leave room:', e)
      }
      clientNetworkRef.current = null
    }
    if (hostNetworkRef.current) {
      try {
        hostNetworkRef.current.destroy()
      } catch (e) {
        console.error('[Host] Error destroying host peer on leave room:', e)
      }
      hostNetworkRef.current = null
    }

    clearUrlRoomCode()
    try {
      sessionStorage.removeItem('uno_active_room')
    } catch {
      // ignore
    }

    setMpConnectionStatus('connected')
    setMpRoomState({
      isInRoom: false,
      isHost: false,
      roomCode: '',
      players: [],
      maxPlayers: 4,
      isConnecting: false,
      error: '',
    })
    setMpPendingDrawCount(0)
    setMpPendingStackType(null)
    setMpRankings([])
    hasShownMyCelebrationRef.current = false
    setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
    setScreen('mp_lobby')
  }, [])

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
    <div className="w-full flex-1 flex flex-col justify-center">
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
          rankings={aiRankings}
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
          onCatchUno={handleCatchUnoAi}
          hasCalledUnoThisRound={aiHasCalledUnoThisRound}
          myPlayerId={0}
          skippedInfo={aiSkippedInfo}
          pendingDrawCount={aiPendingDrawCount}
          pendingStackType={aiPendingStackType}
          isMultiplayer={false}
          isHost={false}
          onReturnToLobby={() => setScreen('ai_lobby')}
          onLeaveGame={() => setScreen('mode_select')}
          onOpenRules={() => setInternalRulesOpen(true)}
        />
      )}

      {screen === 'ai_gameover' && (
        <UnoGameOverModal
          winner={aiWinner}
          players={aiPlayers}
          rankings={aiRankings}
          myPlayerId={0}
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
          roomState={{ ...mpRoomState, stackingEnabled: mpStackingEnabled }}
        />
      )}

      {screen === 'mp_playing' && (
        <UnoBoard
          players={mpPlayers}
          rankings={mpRankings}
          currentPlayerIndex={mpCurrentPlayerIndex}
          direction={mpDirection}
          topCard={mpTopCard}
          activeColor={mpActiveColor}
          drawPileCount={mpDrawPileCount}
          onPlayCard={handleMpPlayCard}
          onDrawCard={handleMpDrawCard}
          onPassTurn={handleMpPassTurn}
          hasDrawnCardThisTurn={mpHasDrawnCardThisTurn}
          isHumanTurn={mpCurrentPlayerIndex === myPlayerId || mpPlayers[mpCurrentPlayerIndex]?.id === myPlayerId}
          isWaitingForBot={false}
          actionMessage={mpActionMessage}
          unoCalledPlayers={mpUnoCalledPlayers}
          onCallUno={handleMpCallUno}
          onCatchUno={handleMpCatchUno}
          hasCalledUnoThisRound={mpHasCalledUnoThisRound}
          myPlayerId={myPlayerId}
          myHand={myHand}
          skippedInfo={mpSkippedInfo}
          pendingDrawCount={mpPendingDrawCount}
          pendingStackType={mpPendingStackType}
          isMultiplayer={true}
          isHost={mpRoomState.isHost}
          roomCode={mpRoomState.roomCode}
          onSyncState={handleSyncGameStateMp}
          onReturnToLobby={handleUniversalReturnToLobby}
          onLeaveGame={handleLeaveMpRoom}
          onOpenRules={() => setInternalRulesOpen(true)}
          connectionStatus={mpRoomState.isHost ? 'connected' : mpConnectionStatus}
          onReconnect={mpRoomState.isHost ? undefined : handleReconnectMp}
        />
      )}

      {screen === 'mp_gameover' && (
        <UnoGameOverModal
          winner={mpWinner}
          players={mpPlayers}
          rankings={mpRankings}
          myPlayerId={myPlayerId}
          onPlayAgain={mpRoomState.isHost ? handleHostStartGame : undefined}
          onResetToLobby={handleUniversalReturnToLobby}
          onBackToMenu={onBackToMenu}
        />
      )}

      {/* Wild Color Selection Modal */}
      <ColorPickerModal
        isOpen={colorPickerOpen}
        onSelectColor={handleColorSelected}
      />

      {/* Uno Give Card Penalty Modal (AI and Multiplayer) */}
      <UnoGiveCardModal
        isOpen={penaltyGiveCardModal.isOpen}
        targetPlayerName={penaltyGiveCardModal.targetPlayerName}
        hand={
          penaltyGiveCardModal.mode === 'ai'
            ? (aiPlayers[0]?.hand || [])
            : myHand
        }
        onGiveCard={(card) => {
          if (penaltyGiveCardModal.mode === 'ai') {
            handleConfirmGiveCardAi(card)
          } else {
            handleConfirmGiveCardMp(card)
          }
        }}
      />

      {/* Rules Modal */}
      <UnoRulesModal isOpen={showRules} onClose={handleCloseRules} />

      {/* Player Finished Ranking Celebration Modal */}
      <UnoFinishedRankModal
        isOpen={finishedCelebration.isOpen}
        rank={finishedCelebration.rank}
        playerName={finishedCelebration.playerName}
        activeRemaining={finishedCelebration.activeRemaining}
        onClose={() =>
          setFinishedCelebration((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  )
}

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
  shuffleDeck,
  getNextActivePlayerIndex,
} from './utils/deck'
import { getAiMove, chooseAiColor, chooseAiCardToGive } from './utils/unoAi'
import {
  initHostPeer,
  initClientPeer,
  generateRoomCode,
  preloadIceConfig,
} from './services/unoNetwork'
import {
  playCardPlaySound,
  playCardDrawSound,
  playActionCardSound,
  playUnoCallSound,
} from '../../utils/sound'

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

  const showRules = isRulesOpen !== undefined ? isRulesOpen : internalRulesOpen
  const handleCloseRules = onCloseRules || (() => setInternalRulesOpen(false))

  // ==========================================
  // SHARED CARD ENGINE HELPERS
  // ==========================================

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

  // Clean up WebRTC and timers on unmount
  useEffect(() => {
    return () => {
      if (hostNetworkRef.current) hostNetworkRef.current.destroy()
      if (clientNetworkRef.current) clientNetworkRef.current.destroy()
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current)
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

        const updatedPlayers = aiPlayers.map((p, idx) =>
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
        const activeCountNow = aiPlayers.filter((p) => p.hand.length > 0).length
        if (activeCountNow === 2) {
          step = 2
          const skippedIdx = getNextActivePlayerIndex(
            playerIndex,
            1,
            aiPlayers,
            newDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          const targetPlayer = aiPlayers[skippedIdx]
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
          aiPlayers,
          newDirection,
          (p) => p.hand.length === 0 || p.rank != null
        )
        const targetPlayer = aiPlayers[skippedIdx]
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
      let updatedPlayers = aiPlayers.map((p, idx) =>
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
            aiPlayers,
            newDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          const targetPlayer = aiPlayers[targetIdx]
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
            aiPlayers,
            newDirection,
            (p) => p.hand.length === 0 || p.rank != null
          )
          const targetPlayer = aiPlayers[targetIdx]
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
      drawCardsFromPile,
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
    if (aiHasDrawnCardThisTurn && aiPendingDrawCount === 0) return
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
    if (drawnCards.length === 0) return

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
    drawCardsFromPile,
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

    const sanitizedPlayers = g.players.map((p) => {
      const pRank = p.rank || (g.rankings || []).find((r) => r.playerId === p.id)?.rank || null
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        cardCount: g.hands.get(p.id)?.length || 0,
        rank: pRank,
      }
    })

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
    const hostHandNow = [...(g.hands.get(0) || [])]
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
            hand: [...(g.hands.get(p.id) || [])],
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
      if (
        !canPlayCard(
          card,
          g.topCard,
          g.activeColor,
          g.pendingDrawCount || 0,
          g.pendingStackType || null
        )
      ) {
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

      // If player emptied their hand, record placement!
      if (nextHand.length === 0) {
        const currentRank = (g.rankings || []).length + 1
        const rankRecord = {
          playerId: player.id,
          name: player.name,
          avatar: player.avatar,
          isHost: player.isHost,
          rank: currentRank,
          remainingCards: 0,
        }
        g.rankings = [...(g.rankings || []), rankRecord]
        player.rank = currentRank

        const remainingActive = g.players.filter((p) => (g.hands.get(p.id) || []).length > 0)

        // If only 1 player remains with cards, match is over!
        if (remainingActive.length <= 1) {
          if (remainingActive.length === 1) {
            const lastPlayer = remainingActive[0]
            const lastRank = currentRank + 1
            lastPlayer.rank = lastRank
            g.rankings.push({
              playerId: lastPlayer.id,
              name: lastPlayer.name,
              avatar: lastPlayer.avatar,
              isHost: lastPlayer.isHost,
              rank: lastRank,
              remainingCards: (g.hands.get(lastPlayer.id) || []).length,
            })
          }
          g.winner = g.rankings[0]
          g.actionMessage = `🏆 Tournament complete! 1st Place: ${g.rankings[0].name}!`
          hostBroadcastGameState()
          return
        }

        // More than 1 active player remains: match continues!
        if (player.id === 0) {
          hasShownMyCelebrationRef.current = true
          setFinishedCelebration({
            isOpen: true,
            rank: currentRank,
            playerName: 'You',
            activeRemaining: remainingActive.length,
          })
        }

        const rankBadge = getRankBadge(currentRank)
        let step = 1
        let message = `${rankBadge.medal} ${player.name} finished in ${rankBadge.label}! (${remainingActive.length} players still battling)`
        let currentSkippedInfo = null

        if (card.type === CARD_TYPES.REVERSE) {
          if (remainingActive.length === 2) {
            step = 1
          } else {
            g.direction = g.direction * -1
          }
        } else if (card.type === CARD_TYPES.SKIP) {
          step = 2
          const skippedIdx = getNextActivePlayerIndex(
            g.currentPlayerIndex,
            1,
            g.players,
            g.direction,
            (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
          )
          const targetPlayer = g.players[skippedIdx]
          currentSkippedInfo = {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            playedByName: player.name,
            cardType: 'skip',
            cardsDrawn: 0,
          }
        } else if (card.type === CARD_TYPES.DRAW_TWO) {
          if (g.stackingEnabled !== false) {
            g.pendingDrawCount = (g.pendingDrawCount || 0) + 2
            g.pendingStackType = CARD_TYPES.DRAW_TWO
            step = 1
          } else {
            step = 2
            const targetIdx = getNextActivePlayerIndex(
              g.currentPlayerIndex,
              1,
              g.players,
              g.direction,
              (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
            )
            const targetPlayer = g.players[targetIdx]
            const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
              2,
              g.drawPile,
              g.discardPile
            )
            g.drawPile = newDrawPile
            g.discardPile = newDiscardPile
            const targetHand = g.hands.get(targetPlayer.id) || []
            g.hands.set(targetPlayer.id, [...drawnCards, ...targetHand])
            currentSkippedInfo = {
              playerId: targetPlayer.id,
              playerName: targetPlayer.name,
              playedByName: player.name,
              cardType: 'draw2',
              cardsDrawn: 2,
            }
          }
        } else if (card.type === CARD_TYPES.WILD_DRAW_FOUR) {
          if (g.stackingEnabled !== false) {
            g.pendingDrawCount = (g.pendingDrawCount || 0) + 4
            g.pendingStackType = CARD_TYPES.WILD_DRAW_FOUR
            step = 1
          } else {
            step = 2
            const targetIdx = getNextActivePlayerIndex(
              g.currentPlayerIndex,
              1,
              g.players,
              g.direction,
              (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
            )
            const targetPlayer = g.players[targetIdx]
            const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
              4,
              g.drawPile,
              g.discardPile
            )
            g.drawPile = newDrawPile
            g.discardPile = newDiscardPile
            const targetHand = g.hands.get(targetPlayer.id) || []
            g.hands.set(targetPlayer.id, [...drawnCards, ...targetHand])
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
          g.pendingDrawCount = 0
          g.pendingStackType = null
        }

        const nextIdx = getNextActivePlayerIndex(
          g.currentPlayerIndex,
          step,
          g.players,
          g.direction,
          (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
        )
        g.currentPlayerIndex = nextIdx
        g.actionMessage = message
        g.skippedInfo = currentSkippedInfo
        hostBroadcastGameState()
        return
      }

      // UNO reminder check
      if (nextHand.length === 1) {
        if (g.unoPreCalledPlayers?.has(playerId) || g.unoCalledPlayers.has(playerId)) {
          g.unoCalledPlayers.add(playerId)
          if (g.unoPreCalledPlayers) g.unoPreCalledPlayers.delete(playerId)
          playUnoCallSound()
        }
      } else {
        g.unoCalledPlayers.delete(playerId)
        if (g.unoPreCalledPlayers) g.unoPreCalledPlayers.delete(playerId)
      }

      // Action card effects
      let step = 1
      let message = `${player.name} played ${card.color !== CARD_COLORS.WILD ? card.color : ''} ${card.label}`
      let currentSkippedInfo = null

      if (card.type === CARD_TYPES.REVERSE) {
        const remainingActive = g.players.filter((p) => (g.hands.get(p.id) || []).length > 0)
        if (remainingActive.length === 2) {
          step = 2
          const skippedIdx = getNextActivePlayerIndex(
            g.currentPlayerIndex,
            1,
            g.players,
            g.direction,
            (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
          )
          const targetPlayer = g.players[skippedIdx]
          currentSkippedInfo = {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            playedByName: player.name,
            cardType: 'reverse',
            cardsDrawn: 0,
          }
          message = `${player.name} played Reverse! ${targetPlayer.name} was skipped.`
        } else {
          g.direction = g.direction * -1
          message = `${player.name} reversed direction!`
        }
      }

      if (card.type === CARD_TYPES.SKIP) {
        step = 2
        const skippedIdx = getNextActivePlayerIndex(
          g.currentPlayerIndex,
          1,
          g.players,
          g.direction,
          (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
        )
        const targetPlayer = g.players[skippedIdx]
        currentSkippedInfo = {
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
          playedByName: player.name,
          cardType: 'skip',
          cardsDrawn: 0,
        }
        message = `${player.name} skipped ${targetPlayer?.name}!`
      }

      if (card.type === CARD_TYPES.DRAW_TWO) {
        if (g.stackingEnabled !== false) {
          g.pendingDrawCount = (g.pendingDrawCount || 0) + 2
          g.pendingStackType = CARD_TYPES.DRAW_TWO
          step = 1
          message = `${player.name} played +2! Stack is +${g.pendingDrawCount} cards! Next player must counter or draw!`
          currentSkippedInfo = null
        } else {
          step = 2
          const targetIdx = getNextActivePlayerIndex(
            g.currentPlayerIndex,
            1,
            g.players,
            g.direction,
            (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
          )
          const targetPlayer = g.players[targetIdx]
          const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
            2,
            g.drawPile,
            g.discardPile
          )
          g.drawPile = newDrawPile
          g.discardPile = newDiscardPile
          const targetHand = g.hands.get(targetPlayer.id) || []
          g.hands.set(targetPlayer.id, [...drawnCards, ...targetHand])
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
        if (g.stackingEnabled !== false) {
          g.pendingDrawCount = (g.pendingDrawCount || 0) + 4
          g.pendingStackType = CARD_TYPES.WILD_DRAW_FOUR
          step = 1
          message = `${player.name} played Wild +4! Color is now ${effectiveColor}. Stack is +${g.pendingDrawCount} cards!`
          currentSkippedInfo = null
        } else {
          step = 2
          const targetIdx = getNextActivePlayerIndex(
            g.currentPlayerIndex,
            1,
            g.players,
            g.direction,
            (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
          )
          const targetPlayer = g.players[targetIdx]
          const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
            4,
            g.drawPile,
            g.discardPile
          )
          g.drawPile = newDrawPile
          g.discardPile = newDiscardPile
          const targetHand = g.hands.get(targetPlayer.id) || []
          g.hands.set(targetPlayer.id, [...drawnCards, ...targetHand])
          currentSkippedInfo = {
            playerId: targetPlayer.id,
            playerName: targetPlayer.name,
            playedByName: player.name,
            cardType: 'wild4',
            cardsDrawn: 4,
          }
          message = `${player.name} played Wild +4! Color is ${effectiveColor}. ${targetPlayer.name} drew 4 cards and was skipped!`
        }
      }

      if (card.type === CARD_TYPES.WILD) {
        message = `${player.name} played Wild! Color is ${effectiveColor}.`
      }

      // If a non-stacking card was played, reset pending stack penalty
      if (
        card.type !== CARD_TYPES.DRAW_TWO &&
        card.type !== CARD_TYPES.WILD_DRAW_FOUR
      ) {
        g.pendingDrawCount = 0
        g.pendingStackType = null
      }

      const nextIdx = getNextActivePlayerIndex(
        g.currentPlayerIndex,
        step,
        g.players,
        g.direction,
        (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
      )
      g.currentPlayerIndex = nextIdx
      g.actionMessage = message
      g.skippedInfo = currentSkippedInfo

      hostBroadcastGameState()
    },
    [drawCardsFromPile, hostBroadcastGameState]
  )

  // Authoritative host card draw execution
  const hostProcessDrawCard = useCallback(
    (playerId) => {
      const g = hostGameRef.current
      if (!g || g.currentPlayerIndex !== playerId) return

      const player = g.players.find((p) => p.id === playerId)
      if (!player) return

      playCardDrawSound()

      // Taking Stack Penalty
      if ((g.pendingDrawCount || 0) > 0) {
        const penaltyCount = g.pendingDrawCount
        const penaltyType = g.pendingStackType
        const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
          penaltyCount,
          g.drawPile,
          g.discardPile
        )
        g.drawPile = newDrawPile
        g.discardPile = newDiscardPile
        const currentHand = g.hands.get(playerId) || []
        g.hands.set(playerId, [...drawnCards, ...currentHand])
        g.pendingDrawCount = 0
        g.pendingStackType = null
        g.hasDrawnThisTurn = false
        g.unoCalledPlayers.delete(player.id)
        if (g.unoPreCalledPlayers) g.unoPreCalledPlayers.delete(player.id)

        const nextIdx = getNextActivePlayerIndex(
          g.currentPlayerIndex,
          1,
          g.players,
          g.direction,
          (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
        )
        const nextPlayer = g.players[nextIdx]
        g.currentPlayerIndex = nextIdx
        g.skippedInfo = {
          playerId: player.id,
          playerName: player.name,
          playedByName: 'Stack Penalty',
          cardType: penaltyType,
          cardsDrawn: penaltyCount,
        }
        g.actionMessage = `${player.name} drew ${penaltyCount} cards from the stack penalty! Turn passed to ${nextPlayer?.name || 'next player'}.`

        hostBroadcastGameState()
        return
      }

      // Normal 1-card draw
      const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
        1,
        g.drawPile,
        g.discardPile
      )
      if (drawnCards.length === 0) return

      g.drawPile = newDrawPile
      g.discardPile = newDiscardPile
      const currentHand = g.hands.get(playerId) || []
      const updatedHand = [drawnCards[0], ...currentHand]
      g.hands.set(playerId, updatedHand)
      if (updatedHand.length > 1) {
        g.unoCalledPlayers.delete(playerId)
        if (g.unoPreCalledPlayers) g.unoPreCalledPlayers.delete(playerId)
      }
      g.hasDrawnThisTurn = true
      g.skippedInfo = null
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
      const nextIdx = getNextActivePlayerIndex(
        g.currentPlayerIndex,
        1,
        g.players,
        g.direction,
        (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
      )
      g.currentPlayerIndex = nextIdx
      g.hasDrawnThisTurn = false
      g.skippedInfo = null
      g.actionMessage = `${player?.name || 'Player'} passed turn.`

      hostBroadcastGameState()
    },
    [hostBroadcastGameState]
  )

  // Authoritative host UNO shout execution
  const hostProcessCallUno = useCallback(
    (playerId, playerName) => {
      const g = hostGameRef.current
      if (!g) return

      playUnoCallSound()
      const playerHand = g.hands.get(playerId) || []
      if (playerHand.length === 1) {
        g.unoCalledPlayers.add(playerId)
      } else {
        if (!g.unoPreCalledPlayers) g.unoPreCalledPlayers = new Set()
        g.unoPreCalledPlayers.add(playerId)
      }
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

  // Finalize host catch penalty (only called when all givers submitted their card)
  const hostFinalizeCatchPenalty = useCallback(() => {
    const g = hostGameRef.current
    if (!g || !g.pendingCatchPenalty) return

    const {
      targetPlayerId,
      targetPlayerName,
      challengerName,
      giverIds,
      givenCards,
    } = g.pendingCatchPenalty

    const targetHand = g.hands.get(targetPlayerId) || []
    const penaltyCards = []
    const finishedGivers = []

    giverIds.forEach((giverId) => {
      const card = givenCards.get(giverId)
      const gHand = g.hands.get(giverId) || []

      if (card) {
        penaltyCards.push(card)
        const nextHand = gHand.filter((c) => c.id !== card.id)
        g.hands.set(giverId, nextHand)

        if (nextHand.length === 0) {
          const giverPlayer = g.players.find((p) => p.id === giverId)
          if (giverPlayer && giverPlayer.rank == null) {
            const nextRank = (g.rankings || []).length + 1
            giverPlayer.rank = nextRank
            const rankRecord = {
              playerId: giverPlayer.id,
              name: giverPlayer.name,
              avatar: giverPlayer.avatar,
              isHost: giverPlayer.isHost,
              rank: nextRank,
              remainingCards: 0,
            }
            g.rankings = [...(g.rankings || []), rankRecord]
            finishedGivers.push(giverPlayer)
          }
        }
      }
    })

    // Give all cards to target
    g.hands.set(targetPlayerId, [...targetHand, ...penaltyCards])
    g.unoCalledPlayers.delete(targetPlayerId)
    if (g.unoPreCalledPlayers) g.unoPreCalledPlayers.delete(targetPlayerId)

    // Check tournament completion
    const remainingActive = g.players.filter(
      (p) => (g.hands.get(p.id) || []).length > 0 && p.rank == null
    )
    if (remainingActive.length <= 1) {
      if (remainingActive.length === 1) {
        const lastPlayer = remainingActive[0]
        const lastRank = (g.rankings || []).length + 1
        lastPlayer.rank = lastRank
        g.rankings.push({
          playerId: lastPlayer.id,
          name: lastPlayer.name,
          avatar: lastPlayer.avatar,
          isHost: lastPlayer.isHost,
          rank: lastRank,
          remainingCards: (g.hands.get(lastPlayer.id) || []).length,
        })
      }
      g.winner = g.rankings[0]
      g.actionMessage = `🏆 Tournament complete! 1st Place: ${g.rankings[0].name}!`
    }

    // Advance turn if current player finished
    const currentP = g.players.find((p) => p.id === g.currentPlayerIndex)
    if (
      currentP &&
      ((g.hands.get(currentP.id) || []).length === 0 || currentP.rank != null)
    ) {
      g.currentPlayerIndex = getNextActivePlayerIndex(
        g.currentPlayerIndex,
        1,
        g.players,
        g.direction,
        (p) => (g.hands.get(p.id) || []).length === 0 || p.rank != null
      )
    }

    let message = `🚨 ${challengerName} caught ${targetPlayerName}! Received 1 card from each active player (+${penaltyCards.length} cards)!`
    if (finishedGivers.length > 0) {
      const names = finishedGivers.map((p) => p.name).join(', ')
      message += ` 🏆 ${names} gave away their last card and finished the game!`
    }
    g.actionMessage = message
    g.pendingCatchPenalty = null

    playActionCardSound(true)
    if (hostNetworkRef.current) {
      hostNetworkRef.current.broadcast({
        type: 'UNO_CAUGHT',
        targetPlayerId,
        message,
      })
    }

    hostBroadcastGameState(message)
  }, [hostBroadcastGameState])

  // Host process penalty card submission from a giver
  const hostProcessSubmitPenaltyCard = useCallback(
    (giverId, card, penaltyId) => {
      const g = hostGameRef.current
      if (
        !g ||
        !g.pendingCatchPenalty ||
        g.pendingCatchPenalty.penaltyId !== penaltyId
      ) {
        return
      }

      const giverHand = g.hands.get(giverId) || []
      let validCard = giverHand.find((c) => c.id === card?.id)
      if (!validCard && giverHand.length > 0) {
        validCard = giverHand[0]
      }
      if (!validCard) return

      g.pendingCatchPenalty.givenCards.set(giverId, validCard)

      const allSubmitted = g.pendingCatchPenalty.giverIds.every((id) =>
        g.pendingCatchPenalty.givenCards.has(id)
      )

      if (allSubmitted) {
        hostFinalizeCatchPenalty()
      }
    },
    [hostFinalizeCatchPenalty]
  )

  // Authoritative host UNO catch execution
  const hostProcessCatchUno = useCallback(
    (challengerId, targetPlayerId) => {
      const g = hostGameRef.current
      if (!g) return

      // Do not allow new catch if a penalty is already being resolved
      if (g.pendingCatchPenalty) return

      const targetHand = g.hands.get(targetPlayerId) || []
      const targetPlayer = g.players.find((p) => p.id === targetPlayerId)
      const challenger = g.players.find((p) => p.id === challengerId)

      if (
        targetHand.length !== 1 ||
        targetPlayer?.rank != null ||
        g.unoCalledPlayers.has(targetPlayerId)
      ) {
        return
      }

      const activeGivers = g.players.filter(
        (p) =>
          p.id !== targetPlayerId &&
          (g.hands.get(p.id) || []).length > 0 &&
          p.rank == null
      )
      if (activeGivers.length === 0) return

      const penaltyId = Date.now()
      g.pendingCatchPenalty = {
        penaltyId,
        challengerId,
        challengerName: challenger?.name || 'Player',
        targetPlayerId,
        targetPlayerName: targetPlayer?.name || 'Player',
        giverIds: activeGivers.map((p) => p.id),
        givenCards: new Map(),
      }

      // Broadcast penalty selection request to clients
      if (hostNetworkRef.current) {
        hostNetworkRef.current.broadcast({
          type: 'PENALTY_CARD_REQUEST',
          penaltyId,
          targetPlayerId,
          targetPlayerName: targetPlayer?.name || 'Player',
          challengerId,
          challengerName: challenger?.name || 'Player',
          giverIds: activeGivers.map((p) => p.id),
        })
      }

      // If host is an active giver, open modal for host
      if (activeGivers.some((p) => p.id === 0)) {
        setPenaltyGiveCardModal({
          isOpen: true,
          mode: 'mp',
          penaltyId,
          targetPlayerId,
          targetPlayerName: targetPlayer?.name || 'Player',
          challengerId,
          botGifts: [],
        })
      }

      const waitMessage = `🚨 ${challenger?.name || 'Player'} caught ${targetPlayer?.name || 'Player'}! Active players are choosing a card to give...`
      g.actionMessage = waitMessage
      hostBroadcastGameState(waitMessage)
    },
    [hostBroadcastGameState]
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

      const isGameActive = (g.drawPile.length > 0 || g.topCard !== null) && !g.winner

      if (isGameActive) {
        // If match is active, mark disconnected so player can reconnect without losing hand
        player.peerId = null
        player.connected = false

        if (g.pendingCatchPenalty) {
          if (g.pendingCatchPenalty.targetPlayerId === player.id) {
            g.pendingCatchPenalty = null
          } else if (g.pendingCatchPenalty.giverIds.includes(player.id)) {
            g.pendingCatchPenalty.giverIds = g.pendingCatchPenalty.giverIds.filter((id) => id !== player.id)
            g.pendingCatchPenalty.givenCards.delete(player.id)
            if (
              g.pendingCatchPenalty.giverIds.length === 0 ||
              g.pendingCatchPenalty.giverIds.every((id) => g.pendingCatchPenalty.givenCards.has(id))
            ) {
              hostFinalizeCatchPenalty()
            }
          }
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
    [hostBroadcastGameState, hostFinalizeCatchPenalty]
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

  // Inform host immediately if tab or window is closing
  useEffect(() => {
    const handleBeforeUnload = () => {
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
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Host creates room
  const handleCreateRoom = ({ name, avatar, maxPlayers, enableStacking = true }) => {
    const code = generateRoomCode()
    setUrlRoomCode(code)
    try {
      sessionStorage.setItem('uno_active_room', code)
    } catch {
      // ignore
    }
    const hostPlayer = { id: 0, name, avatar, isHost: true, isYou: true, connected: true }

    hostGameRef.current = {
      roomCode: code,
      players: [hostPlayer],
      maxPlayers,
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
      skippedInfo: null,
      stackingEnabled: enableStacking,
      pendingDrawCount: 0,
      pendingStackType: null,
    }

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
      onClientJoin: (clientPeerId, clientPlayer, conn) => {
        const g = hostGameRef.current
        if (!g) return
        const currentPlayers = g.players
        const roomCapacity = g.maxPlayers || maxPlayers || 4

        // 1. Check if this is an EXISTING player reconnecting
        const existingPlayer = currentPlayers.find(
          (p) =>
            !p.isHost &&
            (p.peerId === clientPeerId ||
              (clientPlayer?.name && p.name.trim().toLowerCase() === clientPlayer.name.trim().toLowerCase()))
        )

        if (existingPlayer) {
          if (existingPlayer.peerId && existingPlayer.peerId !== clientPeerId && hostNetworkRef.current) {
            hostNetworkRef.current.removeConnection(existingPlayer.peerId)
          }
          existingPlayer.peerId = clientPeerId
          existingPlayer.connected = true
          if (clientPlayer?.avatar) {
            existingPlayer.avatar = clientPlayer.avatar
          }

          // Immediately send direct WELCOME message with their assigned player ID
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
            console.error('[Host] Failed to send WELCOME to existing player:', e)
          }

          // If a match is active, immediately send them their current hand and game state!
          if (g.drawPile.length > 0 || g.topCard !== null) {
            const sanitizedPlayers = currentPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              isHost: p.isHost,
              cardCount: g.hands.get(p.id)?.length || 0,
            }))

            try {
              conn.send({
                type: 'SYNC_GAME_STATE',
                yourPlayerId: existingPlayer.id,
                hand: [...(g.hands.get(existingPlayer.id) || [])],
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
              console.error('[Host] Failed to send SYNC_GAME_STATE:', e)
            }
            hostBroadcastGameState(`${existingPlayer.name} reconnected!`)
          } else {
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
          }

          setMpRoomState((prev) => ({ ...prev, players: currentPlayers }))
          return
        }

        // 2. New player joining
        if (currentPlayers.length >= roomCapacity) {
          try {
            conn.send({
              type: 'ROOM_ERROR',
              error: `Room is full (maximum ${roomCapacity} players).`,
            })
          } catch (e) {
            console.error('[Host] Failed to send ROOM_ERROR:', e)
          }
          return
        }

        const newId = currentPlayers.length
        const newPlayer = {
          id: newId,
          peerId: clientPeerId,
          name: clientPlayer?.name || `Player ${newId + 1}`,
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
      player: { name, avatar },
      onConnected: () => {
        setMpConnectionStatus('connected')
        setMpRoomState((prev) => ({
          ...prev,
          isInRoom: true,
          isHost: false,
          roomCode,
          isConnecting: false,
        }))
      },
      onData: (data) => {
        if (data.type === 'ROOM_ERROR') {
          setMpConnectionStatus('disconnected')
          setMpRoomState((prev) => ({
            ...prev,
            isConnecting: false,
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

          if (data.winner) {
            setMpWinner(data.winner)
            setFinishedCelebration((prev) => ({ ...prev, isOpen: false }))
            setScreen('mp_gameover')
          } else {
            setScreen('mp_playing')
          }
        } else if (data.type === 'ROOM_RESET_TO_LOBBY') {
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
            error: 'Disconnected from host or room closed.',
          }))
          setScreen('mp_lobby')
        }
      },
      onError: (err) => {
        setMpConnectionStatus('disconnected')
        setMpRoomState((prev) => ({
          ...prev,
          isConnecting: false,
          error: err?.message || 'Could not connect to room. Check code and try again.',
        }))
      },
    })

    clientNetworkRef.current = clientPeer
  }

  // Host starts the match (Host ALWAYS has the first move: currentPlayerIndex = 0)
  const handleHostStartGame = () => {
    const g = hostGameRef.current
    const deckCount = g.players.length >= 6 ? 2 : 1
    const freshDeck = createUnoDeck(deckCount)
    const { hands, drawPile, discardPile, initialColor } = dealHands(
      freshDeck,
      g.players.length
    )

    const handsMap = new Map()
    g.players.forEach((p, idx) => {
      handsMap.set(p.id, hands[idx])
      p.rank = null
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
    g.rankings = []
    g.actionMessage = 'Game started! Host has the first move.'
    g.skippedInfo = null
    g.pendingDrawCount = 0
    g.pendingStackType = null

    setScreen('mp_playing')
    setMpCurrentPlayerIndex(0)
    setMyPlayerId(0)
    myPlayerIdRef.current = 0
    setMpWinner(null)
    setMpRankings([])
    setMpSkippedInfo(null)
    setMpPendingDrawCount(0)
    setMpPendingStackType(null)
    hasShownMyCelebrationRef.current = false
    setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })

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
    if (mpHasDrawnCardThisTurn && mpPendingDrawCount === 0) return
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
        hostProcessSubmitPenaltyCard(0, selectedCard, penaltyId)
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
  }, [])

  const handleSyncGameStateMp = useCallback(() => {
    if (mpRoomState.isHost) {
      hostBroadcastGameState('Host synchronized game state.')
    } else if (clientNetworkRef.current) {
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
    const g = hostGameRef.current
    if (!g) return
    g.drawPile = []
    g.discardPile = []
    g.hands = new Map()
    g.topCard = null
    g.activeColor = null
    g.winner = null
    g.rankings = []
    g.players.forEach((p) => {
      p.rank = null
    })
    g.skippedInfo = null
    g.pendingDrawCount = 0
    g.pendingStackType = null
    if (hostNetworkRef.current) {
      hostNetworkRef.current.broadcast({ type: 'ROOM_RESET_TO_LOBBY' })
    }
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

  const handleLeaveMpRoom = useCallback(() => {
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
          isHumanTurn={mpCurrentPlayerIndex === myPlayerId}
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
          onReturnToLobby={mpRoomState.isHost ? handleHostReturnAllToLobby : handleClientReturnToLobby}
          onLeaveGame={handleLeaveMpRoom}
          onOpenRules={() => setInternalRulesOpen(true)}
          connectionStatus={mpConnectionStatus}
          onReconnect={handleReconnectMp}
        />
      )}

      {screen === 'mp_gameover' && (
        <UnoGameOverModal
          winner={mpWinner}
          players={mpPlayers}
          rankings={mpRankings}
          myPlayerId={myPlayerId}
          onPlayAgain={mpRoomState.isHost ? handleHostStartGame : undefined}
          onResetToLobby={mpRoomState.isHost ? handleHostReturnAllToLobby : handleClientReturnToLobby}
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

import React, { useState, useEffect, useRef, useCallback } from 'react'
import UnoModeSelect from './components/UnoModeSelect'
import UnoLobby from './components/UnoLobby'
import UnoMultiplayerLobby from './components/UnoMultiplayerLobby'
import UnoBoard from './components/UnoBoard'
import ColorPickerModal from './components/ColorPickerModal'
import UnoGameOverModal from './components/UnoGameOverModal'
import UnoRulesModal from './components/UnoRulesModal'
import UnoFinishedRankModal from './components/UnoFinishedRankModal'
import { CARD_COLORS, CARD_TYPES, getRankBadge } from './constants/unoConstants'
import {
  createUnoDeck,
  dealHands,
  canPlayCard,
  shuffleDeck,
  getNextActivePlayerIndex,
} from './utils/deck'
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

  // Celebration modal when local player empties hand
  const [finishedCelebration, setFinishedCelebration] = useState({
    isOpen: false,
    rank: 1,
    playerName: 'You',
    activeRemaining: 2,
  })
  const hasShownMyCelebrationRef = useRef(false)

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
  const handleStartAiGame = ({ players: initialPlayers, enableStacking = true }) => {
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
    setScreen('ai_playing')
  }

  const handlePlayAgainAi = () => {
    const resetPlayers = aiPlayers.map((p) => ({ ...p, hand: [], rank: null }))
    handleStartAiGame({ players: resetPlayers, enableStacking: aiStackingEnabled })
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
                idx === targetIdx ? { ...p, hand: [...p.hand, ...drawnCards] } : p
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
                idx === targetIdx ? { ...p, hand: [...p.hand, ...drawnCards] } : p
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
            idx === targetIdx ? { ...p, hand: [...p.hand, ...drawnCards] } : p
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
            idx === targetIdx ? { ...p, hand: [...p.hand, ...drawnCards] } : p
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
      setAiHasCalledUnoThisRound(false)
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
        idx === aiCurrentPlayerIndex ? { ...p, hand: [...p.hand, ...drawnCards] } : p
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
    setAiHasCalledUnoThisRound(false)
    setAiSkippedInfo(null)
    const currentP = aiPlayers[aiCurrentPlayerIndex]
    setAiActionMessage(`${currentP.name} passed turn.`)
  }

  const handleCallUnoAi = () => {
    playUnoCallSound()
    setAiHasCalledUnoThisRound(true)
    setAiUnoCalledPlayers((prev) => new Set(prev).add(0))
    setAiActionMessage('You shouted UNO! 1 card remaining!')
  }

  // AI Bots automatic turn loop
  useEffect(() => {
    if (screen !== 'ai_playing' || aiWinner) return

    const activePlayer = aiPlayers[aiCurrentPlayerIndex]
    if (!activePlayer || activePlayer.isHuman || activePlayer.hand.length === 0 || activePlayer.rank) {
      // If current player has finished, automatically advance turn to next active player
      if (activePlayer && (activePlayer.hand.length === 0 || activePlayer.rank)) {
        const nextIdx = getNextActivePlayerIndex(
          aiCurrentPlayerIndex,
          1,
          aiPlayers,
          aiDirection,
          (p) => p.hand.length === 0 || p.rank != null
        )
        setAiCurrentPlayerIndex(nextIdx)
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
            idx === aiCurrentPlayerIndex ? { ...p, hand: [...p.hand, ...drawnCards] } : p
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
    setMpStackingEnabled(g.stackingEnabled !== false)
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
            g.hands.set(targetPlayer.id, [...targetHand, ...drawnCards])
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
            g.hands.set(targetPlayer.id, [...targetHand, ...drawnCards])
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
        if (g.unoCalledPlayers.has(playerId)) {
          playUnoCallSound()
        }
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
          g.hands.set(targetPlayer.id, [...targetHand, ...drawnCards])
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
          g.hands.set(targetPlayer.id, [...targetHand, ...drawnCards])
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
        g.hands.set(playerId, [...currentHand, ...drawnCards])
        g.pendingDrawCount = 0
        g.pendingStackType = null
        g.hasDrawnThisTurn = false

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
      g.hands.set(playerId, [...currentHand, drawnCards[0]])
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
      } else if (data.type === 'ACTION_REQUEST_SYNC') {
        hostBroadcastGameState('Host synchronized game state.')
      }
    }
  }, [hostProcessPlayCard, hostProcessDrawCard, hostProcessPassTurn, hostProcessCallUno, hostBroadcastGameState])

  // Host creates room
  const handleCreateRoom = ({ name, avatar, maxPlayers, enableStacking = true }) => {
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
        const currentPlayers = g.players

        // 1. Check if this is an EXISTING player reconnecting
        const existingPlayer = currentPlayers.find(
          (p) => !p.isHost && (p.name === clientPlayer.name || p.peerId === clientPeerId)
        )

        if (existingPlayer) {
          existingPlayer.peerId = clientPeerId
          existingPlayer.connected = true

          // Immediately send direct WELCOME message with their assigned player ID
          conn.send({
            type: 'WELCOME',
            playerId: existingPlayer.id,
            roomCode: code,
            players: currentPlayers,
            stackingEnabled: g.stackingEnabled !== false,
          })

          // If a match is active, immediately send them their current hand and game state!
          if (g.drawPile.length > 0 || g.topCard !== null) {
            const sanitizedPlayers = currentPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              isHost: p.isHost,
              cardCount: g.hands.get(p.id)?.length || 0,
            }))

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
              actionMessage: `${existingPlayer.name} reconnected to the game!`,
              unoCalledPlayers: Array.from(g.unoCalledPlayers),
              hasDrawnThisTurn: g.hasDrawnThisTurn,
              winner: g.winner,
              skippedInfo: g.skippedInfo || null,
              pendingDrawCount: g.pendingDrawCount || 0,
              pendingStackType: g.pendingStackType || null,
              stackingEnabled: g.stackingEnabled !== false,
            })
            hostBroadcastGameState(`${existingPlayer.name} reconnected!`)
          } else {
            setTimeout(() => {
              hostPeer.broadcast({
                type: 'ROOM_UPDATE',
                roomCode: code,
                players: currentPlayers,
                stackingEnabled: g.stackingEnabled !== false,
              })
            }, 50)
          }

          setMpRoomState((prev) => ({ ...prev, players: currentPlayers }))
          return
        }

        if (currentPlayers.length >= maxPlayers) return

        const newPlayer = {
          id: currentPlayers.length,
          peerId: clientPeerId,
          name: clientPlayer.name || `Player ${currentPlayers.length + 1}`,
          avatar: clientPlayer.avatar || '😎',
          isHost: false,
          isYou: false,
          connected: true,
        }
        const updatedPlayers = [...currentPlayers, newPlayer]
        g.players = updatedPlayers

        // Immediately send direct WELCOME message with their assigned player ID
        conn.send({
          type: 'WELCOME',
          playerId: newPlayer.id,
          roomCode: code,
          players: updatedPlayers,
          stackingEnabled: g.stackingEnabled !== false,
        })

        // Broadcast room update to all players
        setTimeout(() => {
          hostPeer.broadcast({
            type: 'ROOM_UPDATE',
            roomCode: code,
            players: updatedPlayers,
            stackingEnabled: g.stackingEnabled !== false,
          })
        }, 50)

        setMpRoomState((prev) => ({ ...prev, players: updatedPlayers }))
      },
      onClientLeave: (clientPeerId) => {
        const g = hostGameRef.current
        const player = g.players.find((p) => p.peerId === clientPeerId)
        if (!player) return

        // If match is active, DO NOT delete player from the match!
        // Keep seat and hand intact so they can reconnect without corrupting turn order
        const isGameActive = g.drawPile.length > 0 || g.topCard !== null
        if (isGameActive && !g.winner) {
          player.peerId = null
          player.connected = false
          hostBroadcastGameState(`${player.name} temporarily disconnected. Waiting for reconnect...`)
          return
        }

        // If in lobby, remove player normally
        const updatedPlayers = g.players.filter((p) => p.peerId !== clientPeerId)
        g.players = updatedPlayers
        hostPeer.broadcast({
          type: 'ROOM_UPDATE',
          roomCode: code,
          players: updatedPlayers,
          stackingEnabled: g.stackingEnabled !== false,
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
        if (data.type === 'WELCOME') {
          setMyPlayerId(data.playerId)
          myPlayerIdRef.current = data.playerId
          if (data.stackingEnabled !== undefined) {
            setMpStackingEnabled(data.stackingEnabled)
          }
          if (data.players) {
            setMpRoomState((prev) => ({
              ...prev,
              stackingEnabled: data.stackingEnabled,
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
          setMpRoomState((prev) => ({
            ...prev,
            stackingEnabled: data.stackingEnabled !== undefined ? data.stackingEnabled : prev.stackingEnabled,
            players: data.players.map((p) => ({
              ...p,
              isYou: p.id === myPlayerIdRef.current || (!p.isHost && p.name === name),
            })),
          }))
        } else if (data.type === 'SYNC_GAME_STATE') {
          setMpConnectionStatus('connected')
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
          setMpActionMessage('Host returned all players to room lobby.')
        } else if (data.type === 'UNO_SHOUTED') {
          playUnoCallSound()
          setMpUnoCalledPlayers((prev) => new Set(prev).add(data.playerId))
          setMpActionMessage(`🔔 ${data.playerName} shouted UNO!`)
        }
      },
      onDisconnected: () => {
        setMpConnectionStatus('disconnected')
        if (screenRef.current === 'mp_playing') {
          setMpActionMessage('Connection interrupted. Click Menu or Reconnect to restore state.')
        } else {
          setMpRoomState((prev) => ({
            ...prev,
            error: 'Disconnected from host.',
          }))
          setScreen('mp_lobby')
        }
      },
      onError: () => {
        setMpConnectionStatus('disconnected')
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

  const handleSyncGameStateMp = useCallback(() => {
    if (mpRoomState.isHost) {
      hostBroadcastGameState('Host synchronized game state.')
    } else if (clientNetworkRef.current) {
      clientNetworkRef.current.sendAction({
        type: 'ACTION_REQUEST_SYNC',
        playerId: myPlayerIdRef.current,
      })
    }
  }, [mpRoomState.isHost, hostBroadcastGameState])

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
    setScreen('mp_lobby')
    setMpPendingDrawCount(0)
    setMpPendingStackType(null)
    setMpRankings([])
    hasShownMyCelebrationRef.current = false
    setFinishedCelebration({ isOpen: false, rank: 1, playerName: 'You', activeRemaining: 2 })
  }, [])

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

  const handleReconnectMp = useCallback(() => {
    if (!myProfileRef.current || !myProfileRef.current.roomCode) return
    setMpConnectionStatus('reconnecting')
    if (clientNetworkRef.current) {
      clientNetworkRef.current.destroy()
    }
    handleJoinRoom(myProfileRef.current)
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

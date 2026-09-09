import React, { useState, useEffect, useRef, useCallback } from 'react'
import UnoLobby from './components/UnoLobby'
import UnoBoard from './components/UnoBoard'
import ColorPickerModal from './components/ColorPickerModal'
import UnoGameOverModal from './components/UnoGameOverModal'
import UnoRulesModal from './components/UnoRulesModal'
import { CARD_COLORS, CARD_TYPES } from './constants/unoConstants'
import { createUnoDeck, dealHands, canPlayCard, shuffleDeck } from './utils/deck'
import { getAiMove, chooseAiColor } from './utils/unoAi'
import {
  playCardPlaySound,
  playCardDrawSound,
  playActionCardSound,
  playUnoCallSound,
} from '../../utils/sound'

export default function UnoGame({ onBackToMenu, isRulesOpen, onCloseRules }) {
  // Navigation & Screens
  const [screen, setScreen] = useState('lobby') // 'lobby' | 'playing' | 'gameover'
  const [internalRulesOpen, setInternalRulesOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [pendingCard, setPendingCard] = useState(null)

  // Game Engine State
  const [players, setPlayers] = useState([])
  const [drawPile, setDrawPile] = useState([])
  const [discardPile, setDiscardPile] = useState([])
  const [topCard, setTopCard] = useState(null)
  const [activeColor, setActiveColor] = useState(null)
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = clockwise, -1 = counter-clockwise
  const [hasDrawnCardThisTurn, setHasDrawnCardThisTurn] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [unoCalledPlayers, setUnoCalledPlayers] = useState(new Set())
  const [hasCalledUnoThisRound, setHasCalledUnoThisRound] = useState(false)
  const [winner, setWinner] = useState(null)

  const botTimeoutRef = useRef(null)

  const showRules = isRulesOpen !== undefined ? isRulesOpen : internalRulesOpen
  const handleCloseRules = onCloseRules || (() => setInternalRulesOpen(false))

  // Calculate next player index based on turn direction and step count
  const getNextPlayerIndex = useCallback(
    (currentIdx, step = 1, currentPlayers = players, currentDir = direction) => {
      const len = currentPlayers.length
      return (currentIdx + currentDir * step + len * 100) % len
    },
    [players, direction]
  )

  // Draw cards helper with automatic discard pile recycling
  const drawCardsFromPile = useCallback(
    (count, currentDrawPile, currentDiscardPile) => {
      let dPile = [...currentDrawPile]
      let discPile = [...currentDiscardPile]
      const drawnCards = []

      for (let i = 0; i < count; i++) {
        if (dPile.length === 0) {
          // Recycle discard pile
          if (discPile.length <= 1) break // Cannot recycle if empty
          const top = discPile[discPile.length - 1]
          const recycled = discPile.slice(0, -1).map((c) => ({
            ...c,
            // Reset wild card properties if any
            color: c.type === CARD_TYPES.WILD || c.type === CARD_TYPES.WILD_DRAW_FOUR ? CARD_COLORS.WILD : c.color,
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

  // Start a new game session
  const handleStartGame = ({ players: initialPlayers }) => {
    const freshDeck = createUnoDeck()
    const { hands, drawPile: dealtDraw, discardPile: dealtDiscard, initialColor } = dealHands(
      freshDeck,
      initialPlayers.length
    )

    const populatedPlayers = initialPlayers.map((p, idx) => ({
      ...p,
      hand: hands[idx],
    }))

    setPlayers(populatedPlayers)
    setDrawPile(dealtDraw)
    setDiscardPile(dealtDiscard)
    setTopCard(dealtDiscard[dealtDiscard.length - 1])
    setActiveColor(initialColor)
    setCurrentPlayerIndex(0)
    setDirection(1)
    setHasDrawnCardThisTurn(false)
    setActionMessage('Game started! Match color or number.')
    setUnoCalledPlayers(new Set())
    setHasCalledUnoThisRound(false)
    setWinner(null)
    setScreen('playing')
  }

  // Play again with same player configuration
  const handlePlayAgain = () => {
    const resetPlayers = players.map((p) => ({ ...p, hand: [] }))
    handleStartGame({ players: resetPlayers })
  }

  // Execute card placement and resolution
  const executePlayCard = useCallback(
    (playerIndex, card, chosenColor = null) => {
      const player = players[playerIndex]
      const nextHand = player.hand.filter((c) => c.id !== card.id)
      const isWild = card.color === CARD_COLORS.WILD
      const effectiveColor = isWild ? chosenColor : card.color

      // Audio feedback
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

      // Check win condition
      if (nextHand.length === 0) {
        const updatedPlayers = players.map((p, idx) =>
          idx === playerIndex ? { ...p, hand: nextHand } : p
        )
        setPlayers(updatedPlayers)
        setTopCard(card)
        setDiscardPile((prev) => [...prev, card])
        setWinner(player)
        setScreen('gameover')
        return
      }

      // Handle UNO Call check
      if (nextHand.length === 1) {
        if (player.isHuman) {
          if (hasCalledUnoThisRound) {
            playUnoCallSound()
            setUnoCalledPlayers((prev) => new Set(prev).add(player.id))
          } else {
            // Auto penalty if human forgot to click Call UNO!
            setActionMessage('You forgot to call UNO! Penalty +2 cards!')
            // Will receive cards below
          }
        } else {
          // AI bots call UNO with high probability
          playUnoCallSound()
          setUnoCalledPlayers((prev) => new Set(prev).add(player.id))
          setActionMessage(`${player.name} calls UNO! 1 card left!`)
        }
      }

      // Determine turn step & direction changes
      let step = 1
      let newDirection = direction
      let message = `${player.name} played ${card.color !== CARD_COLORS.WILD ? card.color : ''} ${card.label}`

      // Reverse action
      if (card.type === CARD_TYPES.REVERSE) {
        if (players.length === 2) {
          step = 2 // In 2-player mode, Reverse behaves as Skip
          message = `${player.name} played Reverse! Next turn skipped.`
        } else {
          newDirection = direction * -1
          setDirection(newDirection)
          message = `${player.name} reversed play direction!`
        }
      }

      // Skip action
      if (card.type === CARD_TYPES.SKIP) {
        step = 2
        const skippedIdx = getNextPlayerIndex(playerIndex, 1, players, newDirection)
        message = `${player.name} skipped ${players[skippedIdx].name}!`
      }

      // Draw Two (+2) action
      let currentDraw = [...drawPile]
      let currentDiscard = [...discardPile, card]
      let updatedPlayers = players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: nextHand } : p
      )

      if (card.type === CARD_TYPES.DRAW_TWO) {
        step = 2
        const targetIdx = getNextPlayerIndex(playerIndex, 1, players, newDirection)
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
        message = `${player.name} played +2! ${players[targetIdx].name} drew 2 cards and skipped turn!`
      }

      // Wild Draw Four (+4) action
      if (card.type === CARD_TYPES.WILD_DRAW_FOUR) {
        step = 2
        const targetIdx = getNextPlayerIndex(playerIndex, 1, players, newDirection)
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
        message = `${player.name} played Wild +4! Color is now ${effectiveColor}. ${players[targetIdx].name} drew 4 cards!`
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

      // Commit changes to state
      setPlayers(updatedPlayers)
      setDrawPile(currentDraw)
      setDiscardPile(currentDiscard)
      setTopCard(card)
      setActiveColor(effectiveColor)
      setCurrentPlayerIndex(nextPlayerIdx)
      setHasDrawnCardThisTurn(false)
      setHasCalledUnoThisRound(false)
      setActionMessage(message)
    },
    [
      players,
      direction,
      drawPile,
      discardPile,
      hasCalledUnoThisRound,
      getNextPlayerIndex,
      drawCardsFromPile,
    ]
  )

  // Human player clicks a card
  const handleHumanPlayCard = (card) => {
    if (card.color === CARD_COLORS.WILD) {
      setPendingCard(card)
      setColorPickerOpen(true)
    } else {
      executePlayCard(currentPlayerIndex, card, card.color)
    }
  }

  // Human chooses color from modal
  const handleColorSelected = (color) => {
    setColorPickerOpen(false)
    if (pendingCard) {
      executePlayCard(currentPlayerIndex, pendingCard, color)
      setPendingCard(null)
    }
  }

  // Human or Bot draws a card from the deck
  const handleDrawCard = () => {
    if (hasDrawnCardThisTurn) return

    playCardDrawSound()
    const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
      1,
      drawPile,
      discardPile
    )

    if (drawnCards.length === 0) return

    const drawnCard = drawnCards[0]
    const updatedPlayers = players.map((p, idx) =>
      idx === currentPlayerIndex ? { ...p, hand: [...p.hand, drawnCard] } : p
    )

    setPlayers(updatedPlayers)
    setDrawPile(newDrawPile)
    setDiscardPile(newDiscardPile)
    setHasDrawnCardThisTurn(true)

    const activeP = players[currentPlayerIndex]
    setActionMessage(`${activeP.name} drew a card.`)
  }

  // Pass turn (available after drawing a card)
  const handlePassTurn = () => {
    const nextPlayerIdx = getNextPlayerIndex(currentPlayerIndex, 1)
    setCurrentPlayerIndex(nextPlayerIdx)
    setHasDrawnCardThisTurn(false)
    setHasCalledUnoThisRound(false)
    setActionMessage(`${players[currentPlayerIndex].name} passed turn.`)
  }

  // Human clicks "Call UNO!"
  const handleCallUno = () => {
    setHasCalledUnoThisRound(true)
    playUnoCallSound()
    setActionMessage('You shouted UNO!')
  }

  // AI Bot Turn Loop
  useEffect(() => {
    if (screen !== 'playing' || winner) return

    const activePlayer = players[currentPlayerIndex]
    if (!activePlayer || activePlayer.isHuman) {
      return
    }

    botTimeoutRef.current = setTimeout(() => {
      const nextPlayerIdx = getNextPlayerIndex(currentPlayerIndex, 1)
      const nextPlayer = players[nextPlayerIdx]
      const nextPlayerCount = nextPlayer ? nextPlayer.hand.length : 7

      const bestCard = getAiMove(
        activePlayer.hand,
        topCard,
        activeColor,
        nextPlayerCount
      )

      if (bestCard) {
        // AI has a playable card
        const chosenColor =
          bestCard.color === CARD_COLORS.WILD
            ? chooseAiColor(activePlayer.hand)
            : bestCard.color
        executePlayCard(currentPlayerIndex, bestCard, chosenColor)
      } else {
        // AI must draw a card
        playCardDrawSound()
        const { drawnCards, newDrawPile, newDiscardPile } = drawCardsFromPile(
          1,
          drawPile,
          discardPile
        )

        if (drawnCards.length > 0) {
          const drawnCard = drawnCards[0]
          const newHand = [...activePlayer.hand, drawnCard]

          // Check if drawn card can be played immediately
          if (canPlayCard(drawnCard, topCard, activeColor)) {
            const chosenColor =
              drawnCard.color === CARD_COLORS.WILD
                ? chooseAiColor(newHand)
                : drawnCard.color

            // Update hand first then execute play
            const updatedPlayers = players.map((p, idx) =>
              idx === currentPlayerIndex ? { ...p, hand: newHand } : p
            )
            setPlayers(updatedPlayers)
            setDrawPile(newDrawPile)
            setDiscardPile(newDiscardPile)

            setTimeout(() => {
              executePlayCard(currentPlayerIndex, drawnCard, chosenColor)
            }, 600)
            return
          } else {
            // Cannot play drawn card, pass turn
            const updatedPlayers = players.map((p, idx) =>
              idx === currentPlayerIndex ? { ...p, hand: newHand } : p
            )
            setPlayers(updatedPlayers)
            setDrawPile(newDrawPile)
            setDiscardPile(newDiscardPile)
            const nextIdx = getNextPlayerIndex(currentPlayerIndex, 1)
            setCurrentPlayerIndex(nextIdx)
            setHasDrawnCardThisTurn(false)
            setActionMessage(`${activePlayer.name} drew a card and passed.`)
          }
        } else {
          // No cards left to draw, pass
          const nextIdx = getNextPlayerIndex(currentPlayerIndex, 1)
          setCurrentPlayerIndex(nextIdx)
          setHasDrawnCardThisTurn(false)
        }
      }
    }, 1100)

    return () => {
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current)
      }
    }
  }, [
    currentPlayerIndex,
    screen,
    winner,
    players,
    topCard,
    activeColor,
    drawPile,
    discardPile,
    getNextPlayerIndex,
    drawCardsFromPile,
    executePlayCard,
  ])

  const activePlayer = players[currentPlayerIndex]
  const isHumanTurn = Boolean(activePlayer && activePlayer.isHuman)
  const isWaitingForBot =
    screen === 'playing' && !winner && Boolean(activePlayer && !activePlayer.isHuman)

  return (
    <div className="w-full flex-1 flex flex-col justify-center py-1">
      {screen === 'lobby' && (
        <UnoLobby
          onStartGame={handleStartGame}
          onBackToMenu={onBackToMenu}
          onOpenRules={() => setInternalRulesOpen(true)}
        />
      )}

      {screen === 'playing' && (
        <UnoBoard
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          direction={direction}
          topCard={topCard}
          activeColor={activeColor}
          drawPileCount={drawPile.length}
          onPlayCard={handleHumanPlayCard}
          onDrawCard={handleDrawCard}
          onPassTurn={handlePassTurn}
          hasDrawnCardThisTurn={hasDrawnCardThisTurn}
          isHumanTurn={isHumanTurn}
          isWaitingForBot={isWaitingForBot}
          actionMessage={actionMessage}
          unoCalledPlayers={unoCalledPlayers}
          onCallUno={handleCallUno}
          hasCalledUnoThisRound={hasCalledUnoThisRound}
        />
      )}

      {screen === 'gameover' && (
        <UnoGameOverModal
          winner={winner}
          players={players}
          onPlayAgain={handlePlayAgain}
          onResetToLobby={() => setScreen('lobby')}
          onBackToMenu={onBackToMenu}
        />
      )}

      {/* Color Selection for Wild cards */}
      <ColorPickerModal
        isOpen={colorPickerOpen}
        onSelectColor={handleColorSelected}
      />

      {/* Rules Modal */}
      <UnoRulesModal isOpen={showRules} onClose={handleCloseRules} />
    </div>
  )
}

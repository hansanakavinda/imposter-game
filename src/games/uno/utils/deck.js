import { CARD_COLORS, CARD_TYPES, PLAYABLE_COLORS } from '../constants/unoConstants'

let cardIdCounter = 0

/**
 * Generate a unique ID for each card
 */
function createCardId(prefix = 'card') {
  cardIdCounter += 1
  return `${prefix}-${cardIdCounter}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Create a full standard 108-card Uno deck
 */
export function createUnoDeck() {
  const deck = []

  PLAYABLE_COLORS.forEach((color) => {
    // 1x '0' card per color
    deck.push({
      id: createCardId(color),
      color,
      type: CARD_TYPES.NUMBER,
      value: 0,
      label: '0',
    })

    // 2x '1' through '9' cards per color
    for (let val = 1; val <= 9; val++) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: createCardId(color),
          color,
          type: CARD_TYPES.NUMBER,
          value: val,
          label: String(val),
        })
      }
    }

    // 2x Action cards per color
    const actionCards = [
      { type: CARD_TYPES.SKIP, label: '⊘' },
      { type: CARD_TYPES.REVERSE, label: '⇄' },
      { type: CARD_TYPES.DRAW_TWO, label: '+2' },
    ]

    actionCards.forEach((action) => {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          id: createCardId(color),
          color,
          type: action.type,
          value: null,
          label: action.label,
        })
      }
    })
  })

  // 4x Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: createCardId('wild'),
      color: CARD_COLORS.WILD,
      type: CARD_TYPES.WILD,
      value: null,
      label: '★',
    })
  }

  // 4x Wild Draw Four cards
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: createCardId('wild4'),
      color: CARD_COLORS.WILD,
      type: CARD_TYPES.WILD_DRAW_FOUR,
      value: null,
      label: '+4',
    })
  }

  return shuffleDeck(deck)
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Check if a card is legally playable on the current discard pile
 */
export function canPlayCard(card, topCard, activeColor) {
  if (!card || !topCard) return false

  // Wild cards can always be played
  if (card.color === CARD_COLORS.WILD) return true

  // Current active color match (e.g. after a wild card or regular color)
  const targetColor = activeColor || topCard.color
  if (card.color === targetColor) return true

  // Value match for number cards
  if (
    card.type === CARD_TYPES.NUMBER &&
    topCard.type === CARD_TYPES.NUMBER &&
    card.value === topCard.value
  ) {
    return true
  }

  // Type match for action cards (e.g. playing Blue Skip on Red Skip)
  if (
    card.type !== CARD_TYPES.NUMBER &&
    card.type === topCard.type
  ) {
    return true
  }

  return false
}

/**
 * Deal initial cards to players (standard 7 cards each)
 */
export function dealHands(deck, playerCount, handSize = 7) {
  const currentDeck = [...deck]
  const hands = Array.from({ length: playerCount }, () => [])

  for (let round = 0; round < handSize; round++) {
    for (let p = 0; p < playerCount; p++) {
      if (currentDeck.length > 0) {
        hands[p].push(currentDeck.pop())
      }
    }
  }

  // Find a valid starting top card (prefer non-Wild for clean game start)
  let initialTopCardIndex = currentDeck.findIndex(
    (c) => c.color !== CARD_COLORS.WILD && c.type === CARD_TYPES.NUMBER
  )
  if (initialTopCardIndex === -1) {
    initialTopCardIndex = currentDeck.length - 1
  }

  const [topCard] = currentDeck.splice(initialTopCardIndex, 1)

  return {
    hands,
    drawPile: currentDeck,
    discardPile: [topCard],
    initialColor: topCard.color,
  }
}

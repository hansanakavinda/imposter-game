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
 * Supports Card Stacking rule (+2 on +2, +4 on +4)
 */
export function canPlayCard(
  card,
  topCard,
  activeColor,
  pendingDrawCount = 0,
  pendingStackType = null
) {
  if (!card || !topCard) return false

  // If a stack penalty is currently active, only matching stacking cards are legal
  if (pendingDrawCount > 0) {
    if (pendingStackType === CARD_TYPES.DRAW_TWO) {
      return card.type === CARD_TYPES.DRAW_TWO
    }
    if (pendingStackType === CARD_TYPES.WILD_DRAW_FOUR) {
      return card.type === CARD_TYPES.WILD_DRAW_FOUR
    }
    return false
  }

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

/**
 * Canonical color sorting order (Red -> Yellow -> Green -> Blue -> Wild)
 */
const COLOR_SORT_ORDER = {
  [CARD_COLORS.RED]: 1,
  [CARD_COLORS.YELLOW]: 2,
  [CARD_COLORS.GREEN]: 3,
  [CARD_COLORS.BLUE]: 4,
  [CARD_COLORS.WILD]: 5,
}

/**
 * Action and special card rank ordering for sorting (numbers 0-9 use face value)
 */
const ACTION_RANK_ORDER = {
  [CARD_TYPES.SKIP]: 10,
  [CARD_TYPES.REVERSE]: 11,
  [CARD_TYPES.DRAW_TWO]: 12,
  [CARD_TYPES.WILD]: 13,
  [CARD_TYPES.WILD_DRAW_FOUR]: 14,
}

/**
 * Helper to get numeric rank score for a card
 */
function getCardRankScore(card) {
  if (card.type === CARD_TYPES.NUMBER && typeof card.value === 'number') {
    return card.value
  }
  return ACTION_RANK_ORDER[card.type] ?? 99
}

/**
 * Sort a hand of cards primarily by color, secondarily by number/type
 */
export function sortCardsByColor(cards) {
  if (!Array.isArray(cards)) return []
  return [...cards].sort((a, b) => {
    const colorOrderA = COLOR_SORT_ORDER[a.color] ?? 99
    const colorOrderB = COLOR_SORT_ORDER[b.color] ?? 99

    if (colorOrderA !== colorOrderB) {
      return colorOrderA - colorOrderB
    }

    // Within same color, sort by rank/value (0 to 9, then action cards)
    return getCardRankScore(a) - getCardRankScore(b)
  })
}

/**
 * Sort a hand of cards primarily by number/type, secondarily by color
 */
export function sortCardsByNumber(cards) {
  if (!Array.isArray(cards)) return []
  return [...cards].sort((a, b) => {
    const rankA = getCardRankScore(a)
    const rankB = getCardRankScore(b)

    if (rankA !== rankB) {
      return rankA - rankB
    }

    // Within same rank/number, sort by color
    const colorOrderA = COLOR_SORT_ORDER[a.color] ?? 99
    const colorOrderB = COLOR_SORT_ORDER[b.color] ?? 99
    return colorOrderA - colorOrderB
  })
}

/**
 * Advance turn index to the next active player in the current direction,
 * skipping any player who has already finished (e.g. 0 cards remaining / ranked).
 */
export function getNextActivePlayerIndex(
  currentIdx,
  step = 1,
  currentPlayers = [],
  currentDir = 1,
  isFinishedFn = () => false
) {
  const len = currentPlayers.length
  if (len === 0) return 0

  const activeIndices = []
  for (let i = 0; i < len; i++) {
    if (!isFinishedFn(currentPlayers[i])) {
      activeIndices.push(i)
    }
  }

  if (activeIndices.length === 0) return currentIdx
  if (activeIndices.length === 1) return activeIndices[0]

  let idx = currentIdx
  let stepsCounted = 0
  const maxAttempts = len * 3

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    idx = (idx + currentDir * 1 + len * 100) % len
    if (!isFinishedFn(currentPlayers[idx])) {
      stepsCounted++
      if (stepsCounted === step) {
        return idx
      }
    }
  }

  return activeIndices[0]
}



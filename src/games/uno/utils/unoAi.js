import { CARD_COLORS, CARD_TYPES, PLAYABLE_COLORS } from '../constants/unoConstants'
import { canPlayCard } from './deck'

/**
 * Determine the optimal card for an AI bot to play
 */
export function getAiMove(hand, topCard, activeColor, nextPlayerCardCount = 7) {
  const playableCards = hand.filter((card) =>
    canPlayCard(card, topCard, activeColor)
  )

  if (playableCards.length === 0) {
    return null // Must draw
  }

  // 1. If next player is dangerously low (1 or 2 cards), prioritize disruptor cards
  if (nextPlayerCardCount <= 2) {
    const drawFours = playableCards.filter(
      (c) => c.type === CARD_TYPES.WILD_DRAW_FOUR
    )
    if (drawFours.length > 0) return drawFours[0]

    const drawTwos = playableCards.filter(
      (c) => c.type === CARD_TYPES.DRAW_TWO
    )
    if (drawTwos.length > 0) return drawTwos[0]

    const skips = playableCards.filter((c) => c.type === CARD_TYPES.SKIP)
    if (skips.length > 0) return skips[0]

    const reverses = playableCards.filter(
      (c) => c.type === CARD_TYPES.REVERSE
    )
    if (reverses.length > 0) return reverses[0]
  }

  // 2. Play non-wild action cards first to disrupt opponents and clear high-value cards
  const nonWildActions = playableCards.filter(
    (c) =>
      c.color !== CARD_COLORS.WILD &&
      (c.type === CARD_TYPES.DRAW_TWO ||
        c.type === CARD_TYPES.SKIP ||
        c.type === CARD_TYPES.REVERSE)
  )
  if (nonWildActions.length > 0) {
    return nonWildActions[0]
  }

  // 3. Play matching regular number cards
  const numberCards = playableCards.filter(
    (c) => c.type === CARD_TYPES.NUMBER
  )
  if (numberCards.length > 0) {
    // Sort by highest value card to maximize score reduction
    numberCards.sort((a, b) => b.value - a.value)
    return numberCards[0]
  }

  // 4. Save regular Wilds and Wild Draw Fours for when no color card is available
  const regularWilds = playableCards.filter(
    (c) => c.type === CARD_TYPES.WILD
  )
  if (regularWilds.length > 0) {
    return regularWilds[0]
  }

  // 5. Fallback to any remaining playable card (e.g. Wild Draw 4)
  return playableCards[0]
}

/**
 * Pick the best color for AI when playing a Wild card
 * Picks the color the bot holds the most of in hand
 */
export function chooseAiColor(hand) {
  const colorCounts = {
    [CARD_COLORS.RED]: 0,
    [CARD_COLORS.BLUE]: 0,
    [CARD_COLORS.GREEN]: 0,
    [CARD_COLORS.YELLOW]: 0,
  }

  hand.forEach((card) => {
    if (card.color !== CARD_COLORS.WILD && colorCounts[card.color] !== undefined) {
      colorCounts[card.color] += 1
    }
  })

  let bestColor = PLAYABLE_COLORS[0]
  let maxCount = -1

  PLAYABLE_COLORS.forEach((color) => {
    if (colorCounts[color] > maxCount) {
      maxCount = colorCounts[color]
      bestColor = color
    }
  })

  return bestColor
}

/**
 * Pick the card for an AI bot to give when someone misses calling UNO
 * Prioritizes high penalty/point value cards to discard them
 */
export function chooseAiCardToGive(hand) {
  if (!hand || hand.length === 0) return null
  if (hand.length === 1) return hand[0]

  const getCardValue = (card) => {
    if (card.type === CARD_TYPES.WILD_DRAW_FOUR) return 50
    if (card.type === CARD_TYPES.WILD) return 40
    if (card.type === CARD_TYPES.DRAW_TWO) return 30
    if (card.type === CARD_TYPES.SKIP || card.type === CARD_TYPES.REVERSE) return 20
    if (typeof card.value === 'number') return card.value
    return 0
  }

  const sorted = [...hand].sort((a, b) => getCardValue(b) - getCardValue(a))
  return sorted[0]
}


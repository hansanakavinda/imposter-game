import { describe, it, expect } from 'vitest'
import { getAiMove, chooseAiColor, chooseAiCardToGive } from './unoAi'
import { CARD_COLORS, CARD_TYPES } from '../constants/unoConstants'

let seq = 0
const card = (color, type, value = null) => ({
  id: `c${seq++}`,
  color,
  type,
  value,
  label: value === null ? type : String(value),
})

const num = (color, value) => card(color, CARD_TYPES.NUMBER, value)
const wild = () => card(CARD_COLORS.WILD, CARD_TYPES.WILD)
const wild4 = () => card(CARD_COLORS.WILD, CARD_TYPES.WILD_DRAW_FOUR)

const RED_FIVE = num(CARD_COLORS.RED, 5)

describe('getAiMove', () => {
  it('returns null when nothing in hand is legal', () => {
    const hand = [num(CARD_COLORS.BLUE, 1), num(CARD_COLORS.GREEN, 9)]
    expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED)).toBeNull()
  })

  it('returns null for an empty hand', () => {
    expect(getAiMove([], RED_FIVE, CARD_COLORS.RED)).toBeNull()
  })

  it('plays the only legal card', () => {
    const legal = num(CARD_COLORS.RED, 2)
    const move = getAiMove([num(CARD_COLORS.BLUE, 1), legal], RED_FIVE, CARD_COLORS.RED)
    expect(move.id).toBe(legal.id)
  })

  describe('when the next player is close to winning', () => {
    it('leads with a wild +4 above everything else', () => {
      const hand = [num(CARD_COLORS.RED, 2), card(CARD_COLORS.RED, CARD_TYPES.SKIP), wild4()]
      const move = getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 1)
      expect(move.type).toBe(CARD_TYPES.WILD_DRAW_FOUR)
    })

    it('falls back to a +2 when it has no +4', () => {
      const hand = [num(CARD_COLORS.RED, 2), card(CARD_COLORS.RED, CARD_TYPES.DRAW_TWO)]
      expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 2).type).toBe(CARD_TYPES.DRAW_TWO)
    })

    it('falls back to a skip, then a reverse', () => {
      const skipHand = [num(CARD_COLORS.RED, 2), card(CARD_COLORS.RED, CARD_TYPES.SKIP)]
      expect(getAiMove(skipHand, RED_FIVE, CARD_COLORS.RED, 2).type).toBe(CARD_TYPES.SKIP)

      const revHand = [num(CARD_COLORS.RED, 2), card(CARD_COLORS.RED, CARD_TYPES.REVERSE)]
      expect(getAiMove(revHand, RED_FIVE, CARD_COLORS.RED, 2).type).toBe(CARD_TYPES.REVERSE)
    })

    it('treats a 3-card opponent as no longer urgent', () => {
      // with no urgency the plain number card is preferred over hoarding the wild +4
      const hand = [num(CARD_COLORS.RED, 2), wild4()]
      expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 3).type).toBe(CARD_TYPES.NUMBER)
    })
  })

  it('prefers a coloured action card over a plain number when nobody is close', () => {
    const hand = [num(CARD_COLORS.RED, 2), card(CARD_COLORS.RED, CARD_TYPES.SKIP)]
    expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 7).type).toBe(CARD_TYPES.SKIP)
  })

  it('sheds the highest number card when only numbers are legal', () => {
    const hand = [num(CARD_COLORS.RED, 2), num(CARD_COLORS.RED, 9), num(CARD_COLORS.RED, 4)]
    expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 7).value).toBe(9)
  })

  it('holds wilds back while a coloured card is still playable', () => {
    const hand = [num(CARD_COLORS.RED, 3), wild(), wild4()]
    expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 7).type).toBe(CARD_TYPES.NUMBER)
  })

  it('plays a plain wild before a wild +4 when forced', () => {
    const hand = [num(CARD_COLORS.BLUE, 1), wild(), wild4()]
    expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 7).type).toBe(CARD_TYPES.WILD)
  })

  it('plays a wild +4 as the last resort', () => {
    const hand = [num(CARD_COLORS.BLUE, 1), wild4()]
    expect(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, 7).type).toBe(CARD_TYPES.WILD_DRAW_FOUR)
  })

  it('only ever returns a card that is actually in hand', () => {
    const hand = [num(CARD_COLORS.RED, 3), wild(), card(CARD_COLORS.RED, CARD_TYPES.SKIP)]
    const ids = new Set(hand.map((c) => c.id))
    for (const nextCount of [1, 2, 5]) {
      expect(ids.has(getAiMove(hand, RED_FIVE, CARD_COLORS.RED, nextCount).id)).toBe(true)
    }
  })
})

describe('chooseAiColor', () => {
  it('picks the colour the bot holds most of', () => {
    const hand = [
      num(CARD_COLORS.GREEN, 1),
      num(CARD_COLORS.GREEN, 2),
      num(CARD_COLORS.GREEN, 3),
      num(CARD_COLORS.RED, 1),
    ]
    expect(chooseAiColor(hand)).toBe(CARD_COLORS.GREEN)
  })

  it('ignores wild cards when counting', () => {
    const hand = [wild(), wild4(), wild4(), num(CARD_COLORS.BLUE, 1)]
    expect(chooseAiColor(hand)).toBe(CARD_COLORS.BLUE)
  })

  it('returns a playable colour for an all-wild hand', () => {
    const colour = chooseAiColor([wild(), wild4()])
    expect([
      CARD_COLORS.RED,
      CARD_COLORS.BLUE,
      CARD_COLORS.GREEN,
      CARD_COLORS.YELLOW,
    ]).toContain(colour)
  })

  it('never returns wild', () => {
    expect(chooseAiColor([])).not.toBe(CARD_COLORS.WILD)
  })
})

describe('chooseAiCardToGive', () => {
  it('returns null for an empty or missing hand', () => {
    expect(chooseAiCardToGive([])).toBeNull()
    expect(chooseAiCardToGive(null)).toBeNull()
  })

  it('gives its only card when it has one', () => {
    const only = num(CARD_COLORS.RED, 4)
    expect(chooseAiCardToGive([only]).id).toBe(only.id)
  })

  it('sheds the wild +4 first', () => {
    const hand = [num(CARD_COLORS.RED, 9), wild(), wild4()]
    expect(chooseAiCardToGive(hand).type).toBe(CARD_TYPES.WILD_DRAW_FOUR)
  })

  it('prefers action cards over number cards', () => {
    const hand = [num(CARD_COLORS.RED, 9), card(CARD_COLORS.RED, CARD_TYPES.DRAW_TWO)]
    expect(chooseAiCardToGive(hand).type).toBe(CARD_TYPES.DRAW_TWO)
  })

  it('sheds the highest number when only numbers are held', () => {
    const hand = [num(CARD_COLORS.RED, 2), num(CARD_COLORS.BLUE, 8), num(CARD_COLORS.GREEN, 5)]
    expect(chooseAiCardToGive(hand).value).toBe(8)
  })

  it('does not mutate the hand it was given', () => {
    const hand = [num(CARD_COLORS.RED, 2), wild4(), num(CARD_COLORS.BLUE, 8)]
    const before = hand.map((c) => c.id)
    chooseAiCardToGive(hand)
    expect(hand.map((c) => c.id)).toEqual(before)
  })
})

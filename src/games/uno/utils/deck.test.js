import { describe, it, expect } from 'vitest'
import {
  createUnoDeck,
  shuffleDeck,
  canPlayCard,
  dealHands,
  sortCardsByColor,
  sortCardsByNumber,
  getNextActivePlayerIndex,
} from './deck'
import { CARD_COLORS, CARD_TYPES, PLAYABLE_COLORS } from '../constants/unoConstants'

/** Minimal card factory for readable assertions. */
const card = (color, type, value = null, label = 'x') => ({
  id: `${color}-${type}-${value}-${Math.random()}`,
  color,
  type,
  value,
  label,
})

const num = (color, value) => card(color, CARD_TYPES.NUMBER, value, String(value))

describe('createUnoDeck', () => {
  it('builds exactly 108 cards', () => {
    expect(createUnoDeck()).toHaveLength(108)
  })

  it('scales linearly for multi-deck games', () => {
    expect(createUnoDeck(2)).toHaveLength(216)
    expect(createUnoDeck(3)).toHaveLength(324)
  })

  it('treats deckCount below 1 as a single deck', () => {
    expect(createUnoDeck(0)).toHaveLength(108)
    expect(createUnoDeck(-5)).toHaveLength(108)
  })

  it('has the standard per-colour distribution', () => {
    const deck = createUnoDeck()
    for (const color of PLAYABLE_COLORS) {
      const ofColor = deck.filter((c) => c.color === color)
      // 1x zero + 18x (1-9, two each) + 6x action = 25 per colour
      expect(ofColor).toHaveLength(25)
      expect(ofColor.filter((c) => c.type === CARD_TYPES.NUMBER && c.value === 0)).toHaveLength(1)

      for (let v = 1; v <= 9; v++) {
        expect(
          ofColor.filter((c) => c.type === CARD_TYPES.NUMBER && c.value === v)
        ).toHaveLength(2)
      }

      for (const action of [CARD_TYPES.SKIP, CARD_TYPES.REVERSE, CARD_TYPES.DRAW_TWO]) {
        expect(ofColor.filter((c) => c.type === action)).toHaveLength(2)
      }
    }
  })

  it('has 4 wilds and 4 wild draw fours', () => {
    const deck = createUnoDeck()
    expect(deck.filter((c) => c.type === CARD_TYPES.WILD)).toHaveLength(4)
    expect(deck.filter((c) => c.type === CARD_TYPES.WILD_DRAW_FOUR)).toHaveLength(4)
    expect(deck.filter((c) => c.color === CARD_COLORS.WILD)).toHaveLength(8)
  })

  it('gives every card a unique id, even across two decks', () => {
    const ids = new Set(createUnoDeck(2).map((c) => c.id))
    expect(ids.size).toBe(216)
  })
})

describe('shuffleDeck', () => {
  it('does not mutate the input', () => {
    const deck = createUnoDeck()
    const before = deck.map((c) => c.id)
    shuffleDeck(deck)
    expect(deck.map((c) => c.id)).toEqual(before)
  })

  it('preserves every card', () => {
    const deck = createUnoDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(deck.length)
    expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set(deck.map((c) => c.id)))
  })
})

describe('canPlayCard', () => {
  const redFive = num(CARD_COLORS.RED, 5)

  it('rejects missing cards', () => {
    expect(canPlayCard(null, redFive, CARD_COLORS.RED)).toBe(false)
    expect(canPlayCard(redFive, null, CARD_COLORS.RED)).toBe(false)
  })

  it('allows a colour match', () => {
    expect(canPlayCard(num(CARD_COLORS.RED, 9), redFive, CARD_COLORS.RED)).toBe(true)
  })

  it('allows a value match across colours', () => {
    expect(canPlayCard(num(CARD_COLORS.BLUE, 5), redFive, CARD_COLORS.RED)).toBe(true)
  })

  it('compares values as strings so 7 and "7" both match', () => {
    const stringSeven = card(CARD_COLORS.BLUE, CARD_TYPES.NUMBER, '7', '7')
    expect(canPlayCard(stringSeven, num(CARD_COLORS.RED, 7), CARD_COLORS.RED)).toBe(true)
  })

  it('rejects a mismatched colour and value', () => {
    expect(canPlayCard(num(CARD_COLORS.BLUE, 9), redFive, CARD_COLORS.RED)).toBe(false)
  })

  it('allows an action-type match across colours', () => {
    const blueSkip = card(CARD_COLORS.BLUE, CARD_TYPES.SKIP)
    const redSkip = card(CARD_COLORS.RED, CARD_TYPES.SKIP)
    expect(canPlayCard(blueSkip, redSkip, CARD_COLORS.RED)).toBe(true)
  })

  it('does not treat two number cards as an action-type match', () => {
    expect(canPlayCard(num(CARD_COLORS.BLUE, 9), redFive, CARD_COLORS.RED)).toBe(false)
  })

  it('always allows wild cards', () => {
    expect(canPlayCard(card(CARD_COLORS.WILD, CARD_TYPES.WILD), redFive, CARD_COLORS.RED)).toBe(true)
    expect(
      canPlayCard(card(CARD_COLORS.WILD, CARD_TYPES.WILD_DRAW_FOUR), redFive, CARD_COLORS.RED)
    ).toBe(true)
  })

  it('respects activeColor over the top card colour after a wild', () => {
    const wildTop = card(CARD_COLORS.WILD, CARD_TYPES.WILD)
    expect(canPlayCard(num(CARD_COLORS.GREEN, 3), wildTop, CARD_COLORS.GREEN)).toBe(true)
    expect(canPlayCard(num(CARD_COLORS.RED, 3), wildTop, CARD_COLORS.GREEN)).toBe(false)
  })

  it('falls back to allowing any colour on an unresolved wild top card', () => {
    const wildTop = card(CARD_COLORS.WILD, CARD_TYPES.WILD)
    expect(canPlayCard(num(CARD_COLORS.RED, 3), wildTop, null)).toBe(true)
    expect(canPlayCard(num(CARD_COLORS.BLUE, 8), wildTop, CARD_COLORS.WILD)).toBe(true)
  })

  describe('with a pending stack penalty', () => {
    const redDrawTwo = card(CARD_COLORS.RED, CARD_TYPES.DRAW_TWO, null, '+2')

    it('allows only another +2 while a +2 stack is live', () => {
      const args = [redDrawTwo, CARD_COLORS.RED, 2, CARD_TYPES.DRAW_TWO]
      expect(canPlayCard(card(CARD_COLORS.BLUE, CARD_TYPES.DRAW_TWO), ...args)).toBe(true)
      expect(canPlayCard(num(CARD_COLORS.RED, 5), ...args)).toBe(false)
      expect(canPlayCard(card(CARD_COLORS.WILD, CARD_TYPES.WILD), ...args)).toBe(false)
    })

    it('does not let a +4 answer a +2 stack, or vice versa', () => {
      const wild4 = card(CARD_COLORS.WILD, CARD_TYPES.WILD_DRAW_FOUR)
      expect(canPlayCard(wild4, redDrawTwo, CARD_COLORS.RED, 2, CARD_TYPES.DRAW_TWO)).toBe(false)
      expect(
        canPlayCard(redDrawTwo, wild4, CARD_COLORS.RED, 4, CARD_TYPES.WILD_DRAW_FOUR)
      ).toBe(false)
    })

    it('allows only another +4 while a +4 stack is live', () => {
      const wild4 = card(CARD_COLORS.WILD, CARD_TYPES.WILD_DRAW_FOUR)
      expect(
        canPlayCard(
          card(CARD_COLORS.WILD, CARD_TYPES.WILD_DRAW_FOUR),
          wild4,
          CARD_COLORS.RED,
          4,
          CARD_TYPES.WILD_DRAW_FOUR
        )
      ).toBe(true)
    })

    it('ignores the gate once the stack is cleared', () => {
      expect(canPlayCard(num(CARD_COLORS.RED, 5), redDrawTwo, CARD_COLORS.RED, 0, null)).toBe(true)
    })
  })
})

describe('dealHands', () => {
  it('deals the requested hand size to every player', () => {
    const { hands } = dealHands(createUnoDeck(), 4)
    expect(hands).toHaveLength(4)
    for (const hand of hands) expect(hand).toHaveLength(7)
  })

  it('honours a custom hand size', () => {
    const { hands } = dealHands(createUnoDeck(), 3, 5)
    for (const hand of hands) expect(hand).toHaveLength(5)
  })

  it('conserves every card: hands + draw pile + discard pile === deck', () => {
    const deck = createUnoDeck()
    const { hands, drawPile, discardPile } = dealHands(deck, 4)
    const seen = [...hands.flat(), ...drawPile, ...discardPile]
    expect(seen).toHaveLength(108)
    expect(new Set(seen.map((c) => c.id)).size).toBe(108)
  })

  it('does not mutate the deck it was given', () => {
    const deck = createUnoDeck()
    dealHands(deck, 4)
    expect(deck).toHaveLength(108)
  })

  it('starts on a non-wild number card', () => {
    for (let i = 0; i < 25; i++) {
      const { discardPile, initialColor } = dealHands(createUnoDeck(), 4)
      const top = discardPile[discardPile.length - 1]
      expect(top.type).toBe(CARD_TYPES.NUMBER)
      expect(top.color).not.toBe(CARD_COLORS.WILD)
      expect(initialColor).toBe(top.color)
    }
  })
})

describe('sortCardsByColor', () => {
  it('orders red, yellow, green, blue, wild', () => {
    const hand = [
      card(CARD_COLORS.WILD, CARD_TYPES.WILD),
      num(CARD_COLORS.BLUE, 1),
      num(CARD_COLORS.RED, 1),
      num(CARD_COLORS.GREEN, 1),
      num(CARD_COLORS.YELLOW, 1),
    ]
    expect(sortCardsByColor(hand).map((c) => c.color)).toEqual([
      CARD_COLORS.RED,
      CARD_COLORS.YELLOW,
      CARD_COLORS.GREEN,
      CARD_COLORS.BLUE,
      CARD_COLORS.WILD,
    ])
  })

  it('puts numbers before action cards within a colour', () => {
    const hand = [
      card(CARD_COLORS.RED, CARD_TYPES.DRAW_TWO, null, '+2'),
      num(CARD_COLORS.RED, 7),
      card(CARD_COLORS.RED, CARD_TYPES.SKIP),
      num(CARD_COLORS.RED, 2),
    ]
    expect(sortCardsByColor(hand).map((c) => c.label)).toEqual(['2', '7', 'x', '+2'])
  })

  it('does not mutate its input and tolerates non-arrays', () => {
    const hand = [num(CARD_COLORS.BLUE, 1), num(CARD_COLORS.RED, 1)]
    const before = hand.map((c) => c.id)
    sortCardsByColor(hand)
    expect(hand.map((c) => c.id)).toEqual(before)
    expect(sortCardsByColor(null)).toEqual([])
  })
})

describe('sortCardsByNumber', () => {
  it('orders by rank first, colour second', () => {
    const hand = [
      num(CARD_COLORS.BLUE, 3),
      num(CARD_COLORS.RED, 3),
      num(CARD_COLORS.RED, 1),
    ]
    expect(sortCardsByNumber(hand).map((c) => `${c.color}${c.value}`)).toEqual([
      'red1',
      'red3',
      'blue3',
    ])
  })

  it('sorts wild draw four last', () => {
    const hand = [
      card(CARD_COLORS.WILD, CARD_TYPES.WILD_DRAW_FOUR),
      card(CARD_COLORS.WILD, CARD_TYPES.WILD),
      num(CARD_COLORS.RED, 9),
    ]
    expect(sortCardsByNumber(hand).map((c) => c.type)).toEqual([
      CARD_TYPES.NUMBER,
      CARD_TYPES.WILD,
      CARD_TYPES.WILD_DRAW_FOUR,
    ])
  })
})

describe('getNextActivePlayerIndex', () => {
  // `finished` marks a player who has gone out and must be skipped.
  const players = (...flags) => flags.map((finished, id) => ({ id, finished }))
  const isFinished = (p) => Boolean(p.finished)

  it('advances one seat clockwise', () => {
    expect(getNextActivePlayerIndex(0, 1, players(0, 0, 0, 0), 1, isFinished)).toBe(1)
  })

  it('advances one seat counter-clockwise', () => {
    expect(getNextActivePlayerIndex(0, 1, players(0, 0, 0, 0), -1, isFinished)).toBe(3)
  })

  it('wraps around the table', () => {
    expect(getNextActivePlayerIndex(3, 1, players(0, 0, 0, 0), 1, isFinished)).toBe(0)
  })

  it('steps two seats for a skip', () => {
    expect(getNextActivePlayerIndex(0, 2, players(0, 0, 0, 0), 1, isFinished)).toBe(2)
  })

  it('skips finished players without consuming a step', () => {
    // seat 1 has gone out, so one step from seat 0 lands on seat 2
    expect(getNextActivePlayerIndex(0, 1, players(0, 1, 0, 0), 1, isFinished)).toBe(2)
  })

  it('skips finished players while stepping two', () => {
    expect(getNextActivePlayerIndex(0, 2, players(0, 1, 0, 0), 1, isFinished)).toBe(3)
  })

  it('returns the sole survivor regardless of step', () => {
    const table = players(1, 1, 0, 1)
    expect(getNextActivePlayerIndex(0, 1, table, 1, isFinished)).toBe(2)
    expect(getNextActivePlayerIndex(0, 2, table, -1, isFinished)).toBe(2)
  })

  it('holds position when everyone has finished', () => {
    expect(getNextActivePlayerIndex(2, 1, players(1, 1, 1), 1, isFinished)).toBe(2)
  })

  it('returns 0 for an empty table', () => {
    expect(getNextActivePlayerIndex(0, 1, [], 1, isFinished)).toBe(0)
  })

  it('treats every player as active when no predicate is supplied', () => {
    expect(getNextActivePlayerIndex(0, 1, players(0, 0, 0), 1)).toBe(1)
  })

  it('bounces between two players in a heads-up game', () => {
    const table = players(0, 0)
    expect(getNextActivePlayerIndex(0, 1, table, 1, isFinished)).toBe(1)
    expect(getNextActivePlayerIndex(1, 1, table, 1, isFinished)).toBe(0)
    // a skip in heads-up returns the turn to the player who played it
    expect(getNextActivePlayerIndex(0, 2, table, 1, isFinished)).toBe(0)
  })
})

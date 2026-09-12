import { describe, it, expect } from 'vitest'
import { isFinishedPlayer, getActivePlayers, findNextPlayerIndex } from './turnOrder'

const p = (id, cardCount, extra = {}) => ({ id, name: `P${id}`, cardCount, ...extra })

describe('isFinishedPlayer', () => {
  it('is false for a player still holding cards', () => {
    expect(isFinishedPlayer(p(0, 3), [])).toBe(false)
  })

  it('is true once a rank is set', () => {
    expect(isFinishedPlayer(p(0, 0, { rank: 1 }), [])).toBe(true)
  })

  it('is true once the player appears in rankings', () => {
    expect(isFinishedPlayer(p(2, 4), [{ playerId: 2, rank: 1 }])).toBe(true)
  })

  it('an empty hand alone is NOT finished before placements start', () => {
    // Matters at deal time, when every hand is briefly empty.
    expect(isFinishedPlayer(p(0, 0), [])).toBe(false)
  })

  it('an empty hand IS finished once placements have started', () => {
    expect(isFinishedPlayer(p(1, 0), [{ playerId: 9, rank: 1 }])).toBe(true)
  })

  it('reads hand.length when a real hand is present, not cardCount', () => {
    expect(isFinishedPlayer({ id: 0, hand: [] }, [{ playerId: 9, rank: 1 }])).toBe(true)
    expect(isFinishedPlayer({ id: 0, hand: [{}, {}] }, [{ playerId: 9, rank: 1 }])).toBe(false)
  })

  it('tolerates a missing player', () => {
    expect(isFinishedPlayer(null, [])).toBe(false)
  })
})

describe('getActivePlayers', () => {
  it('drops finished players', () => {
    const players = [p(0, 2), p(1, 0, { rank: 1 }), p(2, 5)]
    expect(getActivePlayers(players, []).map((x) => x.id)).toEqual([0, 2])
  })
})

describe('findNextPlayerIndex', () => {
  const four = [p(0, 3), p(1, 3), p(2, 3), p(3, 3)]

  it('steps forward clockwise', () => {
    expect(findNextPlayerIndex(four, 0, 1, [])).toBe(1)
    expect(findNextPlayerIndex(four, 3, 1, [])).toBe(0)
  })

  it('steps backward counter-clockwise without going negative', () => {
    expect(findNextPlayerIndex(four, 0, -1, [])).toBe(3)
    expect(findNextPlayerIndex(four, 2, -1, [])).toBe(1)
  })

  it('skips a finished player', () => {
    const players = [p(0, 3), p(1, 0, { rank: 1 }), p(2, 3), p(3, 3)]
    expect(findNextPlayerIndex(players, 0, 1, [])).toBe(2)
  })

  it('skips several finished players in a row', () => {
    const players = [p(0, 3), p(1, 0, { rank: 1 }), p(2, 0, { rank: 2 }), p(3, 3)]
    expect(findNextPlayerIndex(players, 0, 1, [])).toBe(3)
  })

  it('skips finished players identified only through rankings', () => {
    const ranks = [{ playerId: 1, rank: 1 }]
    expect(findNextPlayerIndex(four, 0, 1, ranks)).toBe(2)
  })

  it('holds still when only one player is left', () => {
    const players = [p(0, 3), p(1, 0, { rank: 1 }), p(2, 0, { rank: 2 })]
    expect(findNextPlayerIndex(players, 0, 1, [])).toBe(0)
  })

  it('returns 0 for an empty roster rather than NaN', () => {
    expect(findNextPlayerIndex([], 0, 1, [])).toBe(0)
  })

  it('always returns a valid index', () => {
    for (const dir of [1, -1]) {
      for (let i = 0; i < four.length; i++) {
        const n = findNextPlayerIndex(four, i, dir, [])
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThan(four.length)
      }
    }
  })
})

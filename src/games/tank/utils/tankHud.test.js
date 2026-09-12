import { describe, it, expect } from 'vitest'
import { getHpTier, HP_TIERS } from './tankHud'

describe('getHpTier', () => {
  it('maps the three tiers', () => {
    expect(getHpTier(1)).toBe(HP_TIERS.CRITICAL)
    expect(getHpTier(2)).toBe(HP_TIERS.LOW)
    expect(getHpTier(3)).toBe(HP_TIERS.OK)
  })

  it('treats a 4 HP Titan at 3 HP as ok - thresholds are absolute, not relative', () => {
    // Preserves existing behaviour: a Titan is not "damaged-coloured" at 3/4.
    expect(getHpTier(4)).toBe(HP_TIERS.OK)
    expect(getHpTier(3)).toBe(HP_TIERS.OK)
  })

  it('treats a destroyed tank as critical rather than falling through', () => {
    expect(getHpTier(0)).toBe(HP_TIERS.CRITICAL)
    expect(getHpTier(-1)).toBe(HP_TIERS.CRITICAL)
  })
})

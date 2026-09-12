/**
 * Health tiers, shared by the two places that show HP: the nameplate bar the
 * canvas draws, and the pips in the HUD bar. They had independently written
 * copies of the same thresholds.
 *
 * Only the TIER is shared. Each caller maps it to its own colour space -- the
 * canvas needs hex strings, the HUD needs Tailwind classes -- so unifying that
 * too would mean one of them carrying the other's vocabulary.
 *
 * The thresholds are ABSOLUTE, not relative to maxHp. A 4-HP Titan at 3 HP
 * reads 'ok', the same as a full-health Striker. That is existing behaviour and
 * is preserved deliberately; making it relative would be a balance change
 * dressed up as a refactor.
 */
export const HP_TIERS = {
  OK: 'ok',
  LOW: 'low',
  CRITICAL: 'critical',
}

export function getHpTier(hp) {
  if (hp <= 1) return HP_TIERS.CRITICAL
  if (hp === 2) return HP_TIERS.LOW
  return HP_TIERS.OK
}

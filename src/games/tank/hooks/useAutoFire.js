import { useCallback, useEffect, useRef } from 'react'
import { MIN_AUTOFIRE_INTERVAL_MS } from '../constants/tankConstants'

/**
 * Hold-to-fire cadence for the aim stick.
 *
 * This is client convenience only -- the host's fireFromTank() enforces the
 * real cooldown from its own tank record, so a wrong value here cannot let
 * anyone shoot faster than their class allows.
 *
 * cooldownMs must be the rate the simulation will actually honour (the tank
 * class, or the crate weapon while one is held). Reading the STANDARD shell's
 * rate instead is what used to throttle Specter to 500ms.
 */
export default function useAutoFire({ cooldownMs, onFire }) {
  const timerRef = useRef(null)
  const onFireRef = useRef(onFire)
  const cooldownRef = useRef(cooldownMs)

  useEffect(() => {
    onFireRef.current = onFire
  }, [onFire])

  const start = useCallback((immediate = true) => {
    if (timerRef.current) return
    if (immediate) onFireRef.current?.()
    timerRef.current = setInterval(() => {
      onFireRef.current?.()
    }, Math.max(MIN_AUTOFIRE_INTERVAL_MS, cooldownRef.current))
  }, [])

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Picking up a crate weapon mid-hold changes the rate; re-arm so the new
  // cadence takes effect without the player having to lift their thumb.
  useEffect(() => {
    cooldownRef.current = cooldownMs
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
      start(false)
    }
  }, [cooldownMs, start])

  useEffect(() => stop, [stop])

  return { start, stop }
}

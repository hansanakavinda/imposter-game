import { useCallback, useEffect, useRef, useState } from 'react'

const FEEDBACK_DURATION_MS = 2000

/**
 * "Copied!" feedback that resets itself.
 *
 * Both game lobbies had their own copy of this, and neither cleared the
 * timeout on unmount -- leaving a room while the confirmation was showing set
 * state on an unmounted component.
 *
 * Hub-level rather than per-game: it is generic UI plumbing with no game
 * knowledge, and two games use it.
 */
export default function useCopyFeedback(durationMs = FEEDBACK_DURATION_MS) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const copy = useCallback(
    (text) => {
      if (!text) return
      try {
        navigator.clipboard.writeText(text)
      } catch {
        // ignore -- clipboard is unavailable on insecure origins
      }
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setCopied(false)
        timerRef.current = null
      }, durationMs)
    },
    [durationMs]
  )

  return { copied, copy }
}

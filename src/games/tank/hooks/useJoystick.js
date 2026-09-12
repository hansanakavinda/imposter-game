import { useRef, useState } from 'react'
import { resolveJoystick } from '../utils/joystickMath'

const EMPTY_VISUAL = { active: false, x: 0, y: 0, knobX: 0, knobY: 0, angle: 0 }

/**
 * One floating joystick: press anywhere in the zone to place it, drag to steer.
 *
 * Both sticks ran their own copy of this. They differ only in their deadzone
 * and in what they do with the result, which is what the callbacks are for:
 *
 *   onStart()              pointer down, stick placed
 *   onMove(resolved)       dragged past the deadzone
 *   onDeadzone()           dragged, but inside the deadzone
 *   onEnd({elapsedMs, totalDist})  released -- the aim stick uses this for
 *                          its flick-fire rule
 */
export default function useJoystick({ enabled = true, deadzone, isPortrait = false, onStart, onMove, onDeadzone, onEnd }) {
  const pointerIdRef = useRef(null)
  const originRef = useRef({ x: 0, y: 0, time: 0 })
  const [visual, setVisual] = useState(EMPTY_VISUAL)

  const onPointerDown = (e) => {
    if (!enabled || pointerIdRef.current !== null) return
    e.preventDefault()
    e.stopPropagation()

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    pointerIdRef.current = e.pointerId

    const rect = target.getBoundingClientRect()
    originRef.current = { x: e.clientX, y: e.clientY, time: e.timeStamp || 0 }

    setVisual({
      active: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      knobX: 0,
      knobY: 0,
      angle: 0,
    })

    onStart?.()
  }

  const onPointerMove = (e) => {
    if (e.pointerId !== pointerIdRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const resolved = resolveJoystick({
      dx: e.clientX - originRef.current.x,
      dy: e.clientY - originRef.current.y,
      deadzone,
      isPortrait,
    })

    if (resolved.inDeadzone) {
      setVisual((prev) => ({ ...prev, knobX: 0, knobY: 0 }))
      onDeadzone?.()
      return
    }

    setVisual((prev) => ({
      ...prev,
      knobX: resolved.knobX,
      knobY: resolved.knobY,
      angle: resolved.screenAngle,
    }))
    onMove?.(resolved)
  }

  const onPointerUp = (e) => {
    if (e.pointerId !== pointerIdRef.current) return
    e.preventDefault()
    e.stopPropagation()

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    const elapsedMs = (e.timeStamp || 0) - originRef.current.time
    const totalDist = Math.hypot(
      e.clientX - originRef.current.x,
      e.clientY - originRef.current.y
    )

    pointerIdRef.current = null
    setVisual((prev) => ({ ...prev, active: false, knobX: 0, knobY: 0 }))

    onEnd?.({ elapsedMs, totalDist })
  }

  return {
    visual,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}

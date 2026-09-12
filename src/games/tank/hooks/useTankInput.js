import { useCallback, useEffect, useRef } from 'react'

/** Neutral controls: what the tank does when nothing is pressed. */
const IDLE_INPUT = {
  forward: false,
  reverse: false,
  steerLeft: false,
  steerRight: false,
  isMoving: false,
  moveAngle: 0,
  moveMagnitude: 0,
  turretAngle: 0,
  aimCoord: { x: 500, y: 325 },
}

/** Which control each key drives. WASD and the arrow keys are interchangeable. */
const DRIVE_KEYS = {
  w: 'forward',
  arrowup: 'forward',
  s: 'reverse',
  arrowdown: 'reverse',
  a: 'steerLeft',
  arrowleft: 'steerLeft',
  d: 'steerRight',
  arrowright: 'steerRight',
}

/**
 * The local player's controls.
 *
 * Input lives in a ref, not state: the 31Hz simulation reads it every tick and a
 * re-render per keypress would be pure waste. The host consumes the ref directly;
 * a client sends it on every change, since the host cannot see its keyboard.
 *
 * @param active        only listen while a battle is in progress
 * @param onFire        space, or a tap on the aim stick
 * @param onPing        `e`, the 2v2 team marker
 * @param sendInput     publish the current input to the host (no-op for the host)
 * @param resolveMyTank returns the local tank, for turning a click into an aim angle
 */
export function useTankInput({ active, onFire, onPing, sendInput, resolveMyTank }) {
  const inputRef = useRef({ ...IDLE_INPUT })

  // Callbacks are re-created every render; the key listeners are bound once. Route
  // through refs so the listeners always reach the current versions.
  const onFireRef = useRef(onFire)
  const onPingRef = useRef(onPing)
  const sendInputRef = useRef(sendInput)
  const resolveMyTankRef = useRef(resolveMyTank)

  useEffect(() => {
    onFireRef.current = onFire
    onPingRef.current = onPing
    sendInputRef.current = sendInput
    resolveMyTankRef.current = resolveMyTank
  })

  const publish = useCallback(() => {
    sendInputRef.current?.(inputRef.current)
  }, [])

  /** Merge a partial update in, e.g. from the touch joysticks. */
  const updateInput = useCallback(
    (delta) => {
      inputRef.current = { ...inputRef.current, ...delta }
      publish()
    },
    [publish]
  )

  /** Point the turret along a world-space angle. */
  const setTurretAngle = useCallback(
    (angle) => {
      inputRef.current.turretAngle = angle
      publish()
    },
    [publish]
  )

  /** Aim at a world-space point, e.g. the mouse over the canvas. */
  const aimAt = useCallback(
    (coords) => {
      const myTank = resolveMyTankRef.current?.()
      if (!myTank) return

      inputRef.current.turretAngle = Math.atan2(coords.y - myTank.y, coords.x - myTank.x)
      inputRef.current.aimCoord = coords
      publish()
    },
    [publish]
  )

  /** Drop the controls back to neutral, so a tank does not coast on after a round. */
  const resetInput = useCallback(() => {
    inputRef.current = { ...IDLE_INPUT }
  }, [])

  useEffect(() => {
    if (!active) return

    const setDriveKey = (e, pressed) => {
      const control = DRIVE_KEYS[e.key.toLowerCase()]
      if (!control) return false
      inputRef.current[control] = pressed
      return true
    }

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()

      if (key === ' ') {
        e.preventDefault()
        onFireRef.current?.()
        return
      }
      if (key === 'e') {
        e.preventDefault()
        onPingRef.current?.()
        return
      }
      if (setDriveKey(e, true)) publish()
    }

    const handleKeyUp = (e) => {
      if (setDriveKey(e, false)) publish()
    }

    // Losing focus mid-press would otherwise leave the tank driving forever.
    const handleBlur = () => {
      resetInput()
      publish()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      resetInput()
    }
  }, [active, publish, resetInput])

  return { inputRef, updateInput, setTurretAngle, aimAt, resetInput }
}

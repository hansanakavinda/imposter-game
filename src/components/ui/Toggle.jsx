import React from 'react'
import { FOCUS, cx } from './tokens'

/**
 * An on/off switch. The knob is a lit object that slides across a well, so it
 * obeys the same light as everything else rather than being a floating pill.
 */
export default function Toggle({ checked, onChange, label, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cx(
        'relative w-12 h-7 rounded-full border transition cursor-pointer shrink-0',
        checked ? 'bg-ok/25 border-ok/60' : 'bg-well border-edge shadow-sink',
        FOCUS,
        className
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform shadow-lift-1',
          checked ? 'translate-x-5 bg-ok' : 'translate-x-0 bg-felt-high'
        )}
      />
    </button>
  )
}

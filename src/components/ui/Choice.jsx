import React from 'react'
import { FOCUS, RADIUS, TONE_FILL, cx } from './tokens'

/**
 * One option in a set: a category chip, a timer length, a game mode, a tank.
 *
 * Selected means lit. Imposter expressed this as an inverted white chip and
 * Tank as a tinted glass panel; on a table there is only one answer, which is
 * that the chosen object is the one the lamp is on.
 */
export default function Choice({
  selected = false,
  tone = 'lamp',
  radius = 'well',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 px-3 py-2 border transition cursor-pointer',
        'text-mini font-semibold active:scale-[0.98]',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        selected
          ? cx(TONE_FILL[tone] ?? TONE_FILL.lamp, 'border-transparent shadow-lift-1')
          : 'bg-felt border-edge text-ink-muted hover:text-ink hover:border-edge-lit',
        RADIUS[radius],
        FOCUS,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

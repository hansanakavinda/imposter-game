import React from 'react'
import { FOCUS, PRESS, RADIUS, TONE_FILL, cx } from './tokens'

const SIZE = {
  sm: 'px-3 py-1.5 text-mini',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3.5 text-sm',
}

const VARIANT = {
  /* The brightest object on the table. Replaces both the white button and the
     three different gradient buttons the three games each had. */
  primary: (tone) => cx(TONE_FILL[tone] ?? TONE_FILL.lamp, 'font-bold shadow-lift-2 hover:brightness-105'),
  secondary: () => 'bg-felt-high border border-edge-lit text-ink font-semibold shadow-lift-1 hover:bg-felt-high hover:border-edge-lit hover:brightness-110',
  ghost: () => 'text-ink-muted font-semibold hover:text-ink hover:bg-felt-high',
  danger: () => cx(TONE_FILL.danger, 'font-bold shadow-lift-2 hover:brightness-105'),
}

/**
 * Absorbs the 21 distinct full-width button class strings the three games had
 * between them. Per-game colour arrives as `tone`, never as a literal.
 */
export default function Button({
  variant = 'primary',
  tone = 'lamp',
  size = 'lg',
  radius = 'object',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 transition cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        fullWidth && 'w-full',
        SIZE[size],
        RADIUS[radius],
        VARIANT[variant](tone),
        PRESS,
        FOCUS,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

import React from 'react'
import { FOCUS, RADIUS, cx } from './tokens'

const SIZE = {
  sm: 'p-1.5',
  md: 'p-2',
}

/** The five spellings of "an icon you can press", reduced to one. */
export default function IconButton({
  label,
  size = 'md',
  radius = 'well',
  active = false,
  className = '',
  onClick,
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cx(
        'inline-flex items-center justify-center transition cursor-pointer active:scale-95',
        active ? 'text-ink bg-felt-high' : 'text-ink-faint hover:text-ink hover:bg-felt-high',
        SIZE[size],
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

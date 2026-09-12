import React from 'react'
import { FOCUS, cx } from './tokens'

/**
 * A well pressed into the table. Six spellings with three different focus
 * colours collapse into this; the focus ring is the lamp everywhere.
 */
export default function TextInput({ className = '', ...rest }) {
  return (
    <input
      className={cx(
        'w-full px-3.5 py-3 rounded-well bg-well border border-edge shadow-sink',
        'text-ink placeholder:text-ink-faint text-sm font-medium',
        'focus:border-edge-lit outline-none transition',
        FOCUS,
        className
      )}
      {...rest}
    />
  )
}

/**
 * The room code field. Both lobbies had one, with different padding, radius,
 * size and accent. It is the thing you read aloud to someone across a table,
 * so it is set in the numeric face at the largest size on the screen.
 */
export function CodeInput({ className = '', maxLength = 4, ...rest }) {
  return (
    <input
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
      maxLength={maxLength}
      className={cx(
        'w-full px-4 py-3 rounded-well bg-well border border-edge shadow-sink',
        'font-mono text-2xl font-medium text-center uppercase tracking-[0.35em] indent-[0.35em]',
        'text-ink placeholder:text-ink-faint placeholder:tracking-[0.35em]',
        'focus:border-edge-lit outline-none transition',
        FOCUS,
        className
      )}
      {...rest}
    />
  )
}

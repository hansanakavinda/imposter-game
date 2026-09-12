import React from 'react'
import { TONE_WASH, cx } from './tokens'

/**
 * The eyebrow / status chip. There were four spellings of this with the same
 * anatomy and different colours; the colour is now the only thing that varies.
 */
export default function Pill({ tone = 'neutral', className = '', children, ...rest }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
        'text-micro font-bold uppercase',
        TONE_WASH[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

import React from 'react'
import { TONE_FILL, TONE_TEXT, TONE_WASH, cx } from './tokens'

const AVATAR_SIZE = {
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-xl',
}

/** An emoji or initial on a lit disc. */
export function Avatar({ children, tone, size = 'md', className = '' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded-full shrink-0 shadow-lift-1',
        tone ? TONE_FILL[tone] : 'bg-felt-high border border-edge-lit',
        AVATAR_SIZE[size],
        className
      )}
    >
      {children}
    </span>
  )
}

/** A small status tag next to a name -- "You", "Host", "Ready". */
export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-well border',
        'text-nano font-bold uppercase',
        TONE_WASH[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** A small filled dot -- ready / connected / turn. */
export function Dot({ tone = 'neutral', className = '' }) {
  return <span className={cx('w-2 h-2 rounded-full bg-current shrink-0', TONE_TEXT[tone], className)} />
}

/**
 * One person in a lobby. All three games grew their own version of this, with
 * their own avatar, "You" badge and ready dot.
 */
export default function PlayerRow({ avatar, name, badges, trailing, tone, className = '' }) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 px-3 py-2.5 rounded-object',
        'bg-felt border border-edge shadow-lift-1',
        className
      )}
    >
      {avatar !== undefined && <Avatar tone={tone}>{avatar}</Avatar>}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="truncate text-sm font-semibold text-ink">{name}</span>
        {badges}
      </div>
      {trailing}
    </div>
  )
}

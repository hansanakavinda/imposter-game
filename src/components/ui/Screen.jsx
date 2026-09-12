import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { FOCUS, WIDTH, cx } from './tokens'

/**
 * The page shell. Ten screens across three games each had their own copy of
 * this, drifting on max-width, padding and min-height.
 *
 * Screens sit under the lamp, at the top, like the hub. `fill` is for screens
 * with a footer-pinned primary action; `center` is for the few whose subject is
 * one object in the middle of the table. The old `min-h-[80vh] justify-between`
 * default is what produced the large empty bands above and below every screen.
 */
export default function Screen({ width = 'md', fill = false, center = false, className = '', children }) {
  return (
    <div
      className={cx(
        'relative z-10 w-full mx-auto px-5 py-5 flex flex-col select-none animate-fadeIn',
        WIDTH[width],
        fill && 'flex-1 justify-between',
        center && 'my-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

/** Eyebrow + title + one line of support. */
export function ScreenHeader({ eyebrow, title, subtitle, className = '' }) {
  return (
    <header className={cx('text-center space-y-2', className)}>
      {eyebrow && <div className="flex justify-center">{eyebrow}</div>}
      <h1 className="font-display text-3xl text-ink leading-none">{title}</h1>
      {subtitle && <p className="text-mini text-ink-muted">{subtitle}</p>}
    </header>
  )
}

/**
 * A step back inside a game. Going back to the hub is the navbar's job -- the
 * two used to be shown at the same time, which is why screens had both an
 * arrow in the header and a "Games" link of their own.
 */
export function BackLink({ onClick, children = 'Back', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1 text-mini font-semibold rounded-well px-1.5 py-1',
        'text-ink-faint hover:text-ink transition cursor-pointer',
        FOCUS,
        className
      )}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {children}
    </button>
  )
}

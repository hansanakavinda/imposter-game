import React from 'react'
import { CARD_TYPES } from '../../constants/unoConstants'

/**
 * The action-card marks, drawn rather than typed.
 *
 * deck.js gives every card a `label` -- '⊘', '⇄', '+2', '★', '+4' -- and that
 * stays exactly as it is: it is engine data behind 43 tests, and
 * UnoGiveCardModal prints it inside a sentence. But a glyph borrowed from the
 * text stream is at the mercy of whatever the device substitutes, and '⊘' and
 * '⇄' in particular render at wildly different weights across phones. These
 * two are SVG, so a Skip looks like a Skip everywhere and scales to any card
 * size. Everything else types its own label.
 *
 * currentColor throughout, so a mark picks up the card's own colour in the
 * oval and the face colour in a corner index.
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Skip({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" {...STROKE} />
      <line x1="6.1" y1="17.9" x2="17.9" y2="6.1" {...STROKE} />
    </svg>
  )
}

function Reverse({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7.5 7.5 4 11l3.5 3.5" {...STROKE} />
      <path d="M4 11h10.5a4 4 0 0 1 0 8H12" {...STROKE} />
      <path d="M16.5 16.5 20 13l-3.5-3.5" {...STROKE} />
      <path d="M20 13H9.5a4 4 0 0 1 0-8H12" {...STROKE} />
    </svg>
  )
}

/**
 * Only the two marks whose text glyphs are unreliable. '+2' and '+4' are plain
 * ASCII -- drawing them was decoration, and at card size two little rectangles
 * read as two blank rectangles rather than as "take two".
 */
const GLYPHS = {
  [CARD_TYPES.SKIP]: Skip,
  [CARD_TYPES.REVERSE]: Reverse,
}

/**
 * The mark for a card, drawn when we have one and typed from the card's own
 * label when we don't -- every number, and a plain Wild whose face is the
 * colour wheel. Keeping the fallback in here means callers never branch, and
 * the file exports one component, which is what fast refresh wants.
 */
export default function CardGlyph({ type, label, glyphClassName, labelClassName }) {
  const Glyph = GLYPHS[type]
  if (Glyph) return <Glyph className={glyphClassName} />
  return <span className={labelClassName}>{label}</span>
}

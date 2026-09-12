import React from 'react'
import { CARD_COLORS, CARD_TYPES, COLOR_CONFIG } from '../constants/unoConstants'
import CardGlyph from './board/glyphs'
import { FOCUS, cx } from '../../../components/ui/tokens'

/**
 * One UNO card.
 *
 * The face is the game's whole visual identity, so it is built the way a real
 * card is: a flat field of one colour, a white frame printed inside the edge,
 * the tilted oval, and the value repeated small in two opposite corners so it
 * still reads when the hand is shingled and only the left edge shows.
 *
 * Everything that used to be spent on filters is gone -- there was a blur-xl
 * shine and three drop-shadows on *every card in hand*, which is what made a
 * large hand expensive to paint on a phone. Depth now comes from the same
 * lamp rule as the rest of the app: a warm highlight on the top edge, a shadow
 * below, and the card pressing into the table when you touch it.
 */

/**
 * The oval is deliberately wider than it is tall -- a card is 2:3, so equal
 * percentages of width and height give you a circle, which is what this used
 * to draw. The numeral fills it rather than floating in it.
 */
const SIZES = {
  sm: { box: 'w-11 h-16 rounded-well', index: 'text-nano', value: 'text-sm', glyph: 'w-3.5 h-3.5' },
  md: { box: 'w-16 h-24 rounded-well', index: 'text-micro', value: 'text-2xl', glyph: 'w-6 h-6' },
  lg: { box: 'w-20 h-30 rounded-object', index: 'text-mini', value: 'text-3xl', glyph: 'w-7 h-7' },
  xl: { box: 'w-24 h-36 rounded-object', index: 'text-sm', value: 'text-4xl', glyph: 'w-9 h-9' },
}

/** The wheel on a wild: the four colours, in play order, as one object. */
function ColourWheel({ className }) {
  return (
    <span
      className={cx(
        'grid grid-cols-2 grid-rows-2 overflow-hidden rounded-full',
        'border-2 border-card-face/80',
        className
      )}
    >
      <span className="bg-card-red" />
      <span className="bg-card-blue" />
      <span className="bg-card-yellow" />
      <span className="bg-card-green" />
    </span>
  )
}

function UnoCard({
  card,
  isBack = false,
  isPlayable = true,
  onClick,
  size = 'md',
  className = '',
  style = {},
  activeColor = null,
}) {
  const s = SIZES[size] || SIZES.md

  // The back: the draw pile, an opponent's card, a card mid-flight.
  if (isBack) {
    return (
      <div
        className={cx(
          'relative select-none shrink-0 flex items-center justify-center overflow-hidden',
          'bg-felt border border-edge-lit shadow-lift-1',
          s.box,
          className
        )}
        style={style}
        onClick={onClick}
      >
        <span className="absolute inset-1 rounded-[inherit] border border-lamp/10" />
        <span className="w-[84%] h-[34%] -rotate-[22deg] rounded-[50%] bg-card-red border-2 border-card-yellow flex items-center justify-center">
          <span className="font-display italic tracking-tight text-card-yellow text-micro">
            UNO
          </span>
        </span>
      </div>
    )
  }

  if (!card) return null

  const config = COLOR_CONFIG[card.color] || COLOR_CONFIG[CARD_COLORS.WILD]
  const isWild = card.color === CARD_COLORS.WILD
  // A wild that has had a colour named still shows its own face; the declared
  // colour is a band across the foot, not a repaint, so you can still tell a
  // wild from a real card of that colour.
  const declared =
    isWild && activeColor && activeColor !== CARD_COLORS.WILD ? COLOR_CONFIG[activeColor] : null
  const live = Boolean(isPlayable && onClick)

  const index = (
    <CardGlyph
      type={card.type}
      label={card.label}
      glyphClassName={cx('w-3.5 h-3.5', isWild ? 'text-card-face' : 'text-card-face')}
      labelClassName={cx('font-display leading-none text-card-face', s.index)}
    />
  )

  return (
    <button
      type="button"
      onClick={(e) => {
        if (!live) return
        e.stopPropagation()
        // The card hands itself back, so a caller can pass one stable handler
        // for the whole hand instead of a fresh arrow per card -- which is
        // what makes the memo below worth having.
        onClick(card)
      }}
      aria-disabled={!isPlayable}
      aria-label={`${config.name} ${card.label}`}
      tabIndex={live ? 0 : -1}
      style={style}
      className={cx(
        'relative select-none shrink-0 overflow-hidden text-left touch-pan-x',
        'flex flex-col justify-between p-1.5',
        'border border-black/25 shadow-lift-1 transition-transform duration-150',
        config.bg,
        s.box,
        live
          ? 'cursor-pointer hover:-translate-y-1.5 active:scale-[0.97] active:shadow-lift-0'
          : 'cursor-default',
        FOCUS,
        className
      )}
    >
      {/* The printed frame. Real cards have one, and it is what stops a flat
          colour field from reading as a coloured rectangle. */}
      <span className="absolute inset-[3px] rounded-[inherit] border border-card-face/70 pointer-events-none" />

      <span className="relative z-10 leading-none">{index}</span>

      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isWild ? (
          // The wheel sizes off the card's height, not off this wrapper --
          // a percentage width inside an auto-width flex child resolves to
          // nothing, which is how it came out invisible.
          <span className="relative h-[44%] aspect-square flex items-center justify-center">
            <ColourWheel className="w-full h-full -rotate-[18deg]" />
            {card.type === CARD_TYPES.WILD_DRAW_FOUR && (
              <span
                className={cx(
                  'absolute font-display text-card-face',
                  'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.6)]',
                  s.value
                )}
              >
                +4
              </span>
            )}
          </span>
        ) : (
          <span className="w-[80%] h-[42%] -rotate-[18deg] rounded-[50%] bg-card-face flex items-center justify-center">
            <CardGlyph
              type={card.type}
              label={card.label}
              glyphClassName={cx(s.glyph, config.text, 'rotate-[18deg]')}
              labelClassName={cx('font-display leading-none tracking-tight', s.value, config.text)}
            />
          </span>
        )}
      </span>

      <span className="relative z-10 flex justify-end leading-none rotate-180">{index}</span>

      {declared && (
        <span
          className={cx(
            'absolute bottom-0 inset-x-0 z-20 py-0.5 text-center',
            'text-nano font-bold uppercase text-table',
            declared.bg
          )}
        >
          {declared.name}
        </span>
      )}
    </button>
  )
}

// The hand re-rendered in full every time any opponent's count changed. It is
// the most-instanced component in the app, so this is the memo that matters.
export default React.memo(UnoCard)

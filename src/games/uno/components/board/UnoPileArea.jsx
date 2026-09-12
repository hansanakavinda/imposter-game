import React from 'react'
import UnoCard from '../UnoCard'
import Label from '../../../../components/ui/Label'
import { FOCUS, cx } from '../../../../components/ui/tokens'

/**
 * The middle of the table: what you can take, and what you have to match.
 *
 * The blurred halo that used to sit under the discard is gone. It was a
 * blur-xl plus a 35px-spread box-shadow with transition-all on it, mounted the
 * whole time -- the most expensive element on the board, spent on saying
 * something the table light now says better and for free.
 */
function UnoPileArea({
  drawPileRef,
  drawPileCount,
  canDrawCard,
  onDrawCard,
  hasDrawnCardThisTurn,
  pendingDrawCount,
  topCard,
  activeColor,
  activeColorConfig,
}) {
  const owed = pendingDrawCount > 0

  const drawLabel = owed
    ? `Take ${pendingDrawCount}`
    : hasDrawnCardThisTurn
    ? 'Drawn'
    : 'Draw'

  return (
    <div className="relative z-10 flex items-start justify-center gap-7 sm:gap-10">
      {/* Draw */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          ref={drawPileRef}
          onClick={canDrawCard ? onDrawCard : undefined}
          disabled={!canDrawCard}
          aria-label={owed ? `Take ${pendingDrawCount} cards` : 'Draw a card'}
          className={cx(
            'relative rounded-object transition-transform duration-150',
            canDrawCard
              ? 'cursor-pointer hover:-translate-y-1 active:scale-[0.97]'
              : 'cursor-not-allowed opacity-60',
            FOCUS
          )}
        >
          {/* The pile has depth: two backs peeking out under the top one. */}
          <span className="absolute inset-0 translate-x-1 translate-y-1 rounded-well bg-felt border border-edge" />
          <span className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-well bg-felt border border-edge" />
          <UnoCard
            isBack
            size="xl"
            className={cx('relative', owed && 'ring-2 ring-danger')}
          />
        </button>

        <span className="flex flex-col items-center gap-0.5">
          <Label className={owed ? 'text-danger' : undefined}>{drawLabel}</Label>
          {!owed && (
            <span className="font-mono text-mini text-ink-faint leading-none">{drawPileCount}</span>
          )}
        </span>
      </div>

      {/* Discard */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <span className="absolute inset-0 rotate-[7deg] rounded-object bg-felt border border-edge" />
          <span className="absolute inset-0 -rotate-3 rounded-object bg-felt border border-edge" />
          {topCard && (
            <UnoCard
              card={topCard}
              size="xl"
              isPlayable={false}
              activeColor={activeColor}
              className="relative rotate-2 shadow-lift-2"
            />
          )}
        </div>

        {/* The live colour, in words. The table light carries it as ambience;
            this is what makes it legible without relying on colour at all. */}
        <span className="flex items-center gap-1.5">
          <span
            className={cx('w-2 h-2 rounded-full', activeColorConfig.bg)}
            aria-hidden="true"
          />
          <Label className={activeColorConfig.text}>{activeColorConfig.name} in play</Label>
        </span>
      </div>
    </div>
  )
}

export default React.memo(UnoPileArea)

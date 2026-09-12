import React from 'react'
import UnoCard from '../UnoCard'
import { canPlayCard } from '../../utils/deck'

/** The player's hand, scrolled horizontally. */
export default function UnoHandTray({
  handTrayRef,
  displayedHandCards,
  isCurrentTurnForMe,
  topCard,
  activeColor,
  pendingDrawCount,
  pendingStackType,
  newlyDrawnCardIds,
  flyingCards,
  onPlayCard,
  onWheel,
}) {
  return (
    <div
      ref={handTrayRef}
      onWheel={onWheel}
      className="w-full overflow-x-auto pb-2 pt-4 touch-pan-x overscroll-x-contain select-none scroll-smooth"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 px-1 min-w-max">
        {displayedHandCards.map((card) => {
          const isPlayable =
            isCurrentTurnForMe &&
            canPlayCard(card, topCard, activeColor, pendingDrawCount, pendingStackType)
          const isNewlyDrawn = newlyDrawnCardIds.has(card.id)
          const isFlying = flyingCards.some((fc) => fc.card.id === card.id)

          return (
            <div
              key={card.id}
              className={`relative transition-all duration-300 flex-shrink-0 touch-pan-x ${
                isFlying ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
              }`}
            >
              {/* Bouncing "NEW" pill badge above freshly drawn cards */}
              {isNewlyDrawn && !isFlying && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black text-[8px] sm:text-[9px] uppercase tracking-wider shadow-lg border border-amber-300 flex items-center gap-0.5 animate-bounce pointer-events-none whitespace-nowrap">
                  <span>✨</span>
                  <span>NEW</span>
                </div>
              )}

              <UnoCard
                card={card}
                size="md"
                isPlayable={isPlayable}
                onClick={isPlayable ? () => onPlayCard(card) : undefined}
                className={
                  isNewlyDrawn && !isFlying
                    ? 'ring-3 ring-amber-400 shadow-xl shadow-amber-500/40 -translate-y-1'
                    : isPlayable
                    ? 'ring-2 ring-white/90 shadow-xl -translate-y-1 sm:-translate-y-2'
                    : isCurrentTurnForMe
                    ? 'opacity-40 grayscale-[25%]'
                    : 'opacity-95 shadow-md'
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

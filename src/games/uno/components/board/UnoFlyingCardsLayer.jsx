import React from 'react'
import UnoCard from '../UnoCard'

/**
 * The cards in flight between the draw pile and the hand. A fixed overlay, so
 * it sits outside the board layout entirely.
 *
 * The card turns face-up as it travels. `rotate-y-0` used to be paired with
 * `rotate-y-180` here, but only the second is defined -- the first was one of
 * the undefined class names CLAUDE.md warns about, so the flip only ever ran
 * in one direction. Both states are real transforms now.
 */
export default function UnoFlyingCardsLayer({ flyingCards }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden perspective-1000">
      {flyingCards.map((fc) => {
        const isFlying = fc.phase === 'flying'
        return (
          <div
            key={fc.animId}
            className="absolute transition-transform ease-out duration-500 will-change-transform"
            style={{
              left: 0,
              top: 0,
              transform: isFlying
                ? `translate3d(${fc.targetX}px, ${fc.targetY}px, 0) scale(1)`
                : `translate3d(${fc.startX}px, ${fc.startY}px, 0) scale(0.7) rotate(-10deg)`,
            }}
          >
            <div
              className="transition-transform duration-300 preserve-3d"
              style={{ transform: isFlying ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
            >
              <UnoCard card={fc.card} isBack={!isFlying} size="md" isPlayable={false} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

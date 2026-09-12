import React from 'react'
import UnoCard from '../UnoCard'

/**
 * The cards in flight between the draw pile and the hand. A fixed overlay, so
 * it sits outside the board's layout entirely.
 */
export default function UnoFlyingCardsLayer({ flyingCards }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {flyingCards.map((fc) => {
        const isFlying = fc.phase === 'flying'
        return (
          <div
            key={fc.animId}
            className="absolute transition-all ease-out duration-500 will-change-transform"
            style={{
              left: 0,
              top: 0,
              transform: isFlying
                ? `translate3d(${fc.targetX}px, ${fc.targetY}px, 0) scale(1) rotate(0deg)`
                : `translate3d(${fc.startX}px, ${fc.startY}px, 0) scale(0.65) rotate(-12deg)`,
              opacity: isFlying ? 1 : 0.9,
            }}
          >
            <div
              className={`transition-transform duration-300 ${
                isFlying ? 'rotate-y-0' : 'rotate-y-180'
              }`}
              style={{ perspective: 600 }}
            >
              <div className="relative shadow-2xl rounded-xl ring-4 ring-amber-400/90 shadow-amber-500/40">
                <UnoCard
                  card={fc.card}
                  isBack={!isFlying}
                  size="md"
                  isPlayable={false}
                />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-zinc-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-0.5 whitespace-nowrap animate-bounce">
                  <span>✨ DRAW</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

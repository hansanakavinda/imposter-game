import React from 'react'
import UnoCard from '../UnoCard'
import { CARD_COLORS } from '../../constants/unoConstants'

/** The table centre: draw pile and discard pile. */
export default function UnoPileArea({
  drawPileRef,
  drawPileCount,
  canDrawCard,
  onDrawCard,
  isCurrentTurnForMe,
  hasDrawnCardThisTurn,
  pendingDrawCount,
  topCard,
  activeColor,
  activeColorConfig,
}) {
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10">
      {/* Draw Pile */}
      <div ref={drawPileRef} className="flex flex-col items-center">
        <div className="relative group">
          {/* Stack effect */}
          <div className="absolute inset-0 bg-felt rounded-xl translate-x-1.5 translate-y-1.5 border border-edge pointer-events-none" />
          <div className="absolute inset-0 bg-well rounded-xl translate-x-0.5 translate-y-0.5 border border-edge pointer-events-none" />

          <UnoCard
            isBack
            size="md"
            onClick={canDrawCard ? onDrawCard : undefined}
            className={
              canDrawCard
                ? pendingDrawCount > 0
                  ? 'cursor-pointer ring-4 ring-red-500 hover:scale-105 active:scale-95 shadow-2xl shadow-red-600/50 animate-pulse'
                  : 'cursor-pointer ring-2 ring-amber-400/80 hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/10'
                : 'cursor-not-allowed opacity-75'
            }
          />
        </div>
        <span
          className={`text-micro font-semibold mt-2 ${
            pendingDrawCount > 0 && isCurrentTurnForMe
              ? 'text-red-400 font-bold animate-pulse'
              : hasDrawnCardThisTurn && isCurrentTurnForMe
              ? 'text-amber-400 font-medium'
              : 'text-ink-muted'
          }`}
        >
          {pendingDrawCount > 0
            ? `Draw +${pendingDrawCount} Penalty`
            : hasDrawnCardThisTurn && isCurrentTurnForMe
            ? 'Card Drawn (Play or Pass)'
            : `Draw Pile (${drawPileCount})`}
        </span>
      </div>

      {/* Discard Pile */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Vibrant active color halo glow */}
          <div
            className="absolute -inset-3 rounded-2xl blur-xl opacity-75 transition-all duration-500 pointer-events-none"
            style={{
              backgroundColor: activeColorConfig.hex || '#ef4444',
              boxShadow: `0 0 35px 8px ${activeColorConfig.hex || '#ef4444'}50`,
            }}
          />

          {/* Stack effect representing underneath cards */}
          <div className="absolute inset-0 bg-felt-high rounded-xl rotate-6 translate-x-1.5 translate-y-1 border border-white/20 shadow-md pointer-events-none" />
          <div className="absolute inset-0 bg-felt-high rounded-xl -rotate-4 -translate-x-1 translate-y-0.5 border border-white/20 shadow-md pointer-events-none" />

          {/* Floating Active Color Badge when top card is Wild */}
          {topCard?.color === CARD_COLORS.WILD && (
            <div
              className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 px-2.5 py-0.5 rounded-full text-nano font-bold uppercase tracking-wider text-white shadow-lg border flex items-center gap-1 whitespace-nowrap ${activeColorConfig.bg} ${activeColorConfig.border}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>Declared: {activeColorConfig.name}</span>
            </div>
          )}

          <UnoCard
            card={topCard}
            size="md"
            isPlayable={false}
            activeColor={activeColor}
            style={{ transform: 'rotate(-2deg)' }}
            className="relative z-10 shadow-2xl border-white ring-3 ring-white/90 brightness-105"
          />
        </div>

        {/* Discard Pile label with active color */}
        <div className="flex items-center gap-1.5 mt-2 text-micro font-semibold text-ink-muted">
          <span>Discard Pile</span>
          <span className="text-ink-faint">•</span>
          <span
            className="font-bold flex items-center gap-1"
            style={{ color: activeColorConfig.hex || '#ef4444' }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shadow-sm"
              style={{ backgroundColor: activeColorConfig.hex || '#ef4444' }}
            />
            {activeColorConfig.name}
          </span>
        </div>
      </div>
    </div>
  )
}

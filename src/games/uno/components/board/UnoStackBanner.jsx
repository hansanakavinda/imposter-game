import React from 'react'
import { Flame } from 'lucide-react'

/** The running +2/+4 stack a player must counter or swallow. */
export default function UnoStackBanner({
  pendingDrawCount,
  pendingStackType,
  isCurrentTurnForMe,
  myCanStack,
  activePlayer,
}) {
  return (
    <div className="mb-4 px-4 py-2 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white shadow-xl shadow-red-950/70 border-2 border-amber-300 flex items-center gap-2.5 animate-bounce max-w-sm mx-auto">
      <Flame className="w-5 h-5 text-amber-200 fill-amber-300 animate-pulse flex-shrink-0" />
      <div className="text-left">
        <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          <span>Stack Penalty Active!</span>
          <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-300 font-extrabold text-xs">
            +{pendingDrawCount} CARDS
          </span>
        </div>
        <p className="text-[10px] text-amber-100 font-bold leading-tight">
          {isCurrentTurnForMe
            ? myCanStack
              ? `Play a ${pendingStackType === 'draw2' ? '+2' : '+4'} to counter, or click Draw Pile to take +${pendingDrawCount} cards!`
              : `No counter in hand! Click the Draw Pile to draw +${pendingDrawCount} cards.`
            : `Waiting for ${activePlayer?.name} to counter or draw +${pendingDrawCount}...`}
        </p>
      </div>
    </div>
  )
}

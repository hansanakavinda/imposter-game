import React from 'react'

/** Announces a skipped turn, with a louder variant when it was yours. */
export default function UnoSkipAlert({ skippedInfo, isMyTurnSkipped, activePlayer }) {
  return (
    <div className="mt-2 px-1">
      {isMyTurnSkipped ? (
        <div className="w-full max-w-lg mx-auto p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-red-950/95 via-red-900/90 to-red-950/95 border-2 border-red-500 shadow-xl shadow-red-950/60 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-xl flex-shrink-0 shadow-md border border-red-400">
            🚫
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-red-200 font-black text-xs uppercase tracking-wider">
                Turn Skipped!
              </span>
              {skippedInfo.cardsDrawn > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-red-500 text-white font-black text-[10px]">
                  +{skippedInfo.cardsDrawn} CARDS
                </span>
              )}
            </div>
            <p className="text-xs text-white font-semibold leading-tight mt-0.5">
              <strong className="text-amber-300">{skippedInfo.playedByName}</strong> played{' '}
              {skippedInfo.cardType === 'draw2'
                ? 'a +2'
                : skippedInfo.cardType === 'wild4'
                ? 'a Wild +4'
                : skippedInfo.cardType === 'reverse'
                ? 'a Reverse'
                : 'a Skip'} card!{' '}
              {skippedInfo.cardsDrawn > 0
                ? `You drew ${skippedInfo.cardsDrawn} cards and your turn was skipped.`
                : 'Your turn was skipped and passed to the next player.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto px-3 py-1.5 rounded-xl bg-zinc-900/95 border border-red-500/50 text-xs font-semibold text-zinc-200 shadow-md flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs flex-shrink-0">
            🚫
          </span>
          <span className="truncate">
            <strong className="text-white">{skippedInfo.playedByName}</strong> skipped{' '}
            <strong className="text-red-400">{skippedInfo.playerName}</strong>
            {skippedInfo.cardsDrawn > 0 ? ` (+${skippedInfo.cardsDrawn} cards)` : ''}!
            Turn passed to <strong className="text-blue-300">{activePlayer?.name}</strong>.
          </span>
        </div>
      )}
    </div>
  )
}

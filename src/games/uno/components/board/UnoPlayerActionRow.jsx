import React from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { playClickSound } from '../../../../utils/sound'

/** Hand count, the UNO shout, and Pass Turn. */
export default function UnoPlayerActionRow({
  myPlayer,
  handCards,
  isCurrentTurnForMe,
  hasDrawnCardThisTurn,
  hasCalledUnoThisRound,
  unoCalledPlayers,
  showUnoButton,
  pendingDrawCount,
  onCallUno,
  onPassTurn,
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <span className="text-xl">{myPlayer.avatar || '😎'}</span>
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white block leading-tight">
                {myPlayer.name} (You)
              </span>
              {handCards.length === 1 && (hasCalledUnoThisRound || unoCalledPlayers?.has(myPlayer?.id)) && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[8px] font-black tracking-wider shadow-sm">
                  UNO!
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400">
              {handCards.length} card{handCards.length !== 1 ? 's' : ''} left
            </span>
          </div>
        </div>
      </div>

      {/* Player Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Uno Button */}
        {showUnoButton && (
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onCallUno()
            }}
            disabled={hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id))}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider border flex items-center gap-1.5 transition select-none ${
              (hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id)))
                ? 'bg-zinc-800/90 border-emerald-500/40 text-emerald-300 opacity-90 cursor-default'
                : 'bg-red-700 hover:bg-red-600 active:scale-95 text-white border-red-500/50 shadow-sm cursor-pointer'
            }`}
            title={
              (hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id)))
                ? 'UNO already called!'
                : 'Call UNO!'
            }
          >
            {(hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id))) ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>UNO Called</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Call UNO!</span>
              </>
            )}
          </button>
        )}

        {/* Pass Turn Button (after drawing a card) */}
        {isCurrentTurnForMe && hasDrawnCardThisTurn && pendingDrawCount === 0 && (
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onPassTurn()
            }}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 flex items-center gap-1 cursor-pointer transition active:scale-95"
          >
            <span>Pass Turn</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

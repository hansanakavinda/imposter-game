import React from 'react'
import { Eye } from 'lucide-react'
import { getRankBadge } from '../../constants/unoConstants'

/** Shown once you have gone out: your placement, and who is still playing. */
export default function UnoSpectatorPanel({ myPlayerRank, activePlayer, activePlayers, nextPlayer }) {
  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-5 rounded-3xl bg-well border border-edge text-center space-y-3 shadow-2xl animate-fadeIn my-1">
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
        <span className="text-base">{getRankBadge(myPlayerRank).medal}</span>
        <span>You Finished {getRankBadge(myPlayerRank).label}!</span>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Spectator Mode Active</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </h4>
        <p className="text-xs text-ink max-w-xs mx-auto leading-relaxed">
          {activePlayers.length > 1
            ? `You cleared all your cards! Sit back and spectate while the remaining ${activePlayers.length} players battle for the finish.`
            : 'The remaining players are finishing up the match!'}
        </p>
      </div>

      <div className="pt-2 border-t border-edge flex items-center justify-center gap-4 text-micro text-ink-muted">
        <div>
          Active Turn: <strong className="text-amber-300 font-bold">{activePlayer?.name || '...'}</strong>
        </div>
        <span>•</span>
        <div>
          Next: <strong className="text-blue-300 font-bold">{nextPlayer?.name || '...'}</strong>
        </div>
      </div>
    </div>
  )
}

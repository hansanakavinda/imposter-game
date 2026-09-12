import React from 'react'
import { Eye } from 'lucide-react'
import { getRankBadge } from '../../constants/unoConstants'
import Label from '../../../../components/ui/Label'
import Surface from '../../../../components/ui/Surface'

/** Shown once you have gone out: your placement, and who is still playing. */
function UnoSpectatorPanel({ myPlayerRank, activePlayer, activePlayers, nextPlayer }) {
  const rank = getRankBadge(myPlayerRank)

  return (
    <Surface inset radius="object" className="w-full p-4 text-center space-y-2.5 my-1">
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-uno/12 border border-uno/35 text-uno text-mini font-bold">
        <span className="text-base leading-none">{rank.medal}</span>
        You finished {rank.label}
      </span>

      <p className="flex items-center justify-center gap-2 text-mini text-ink-muted">
        <Eye className="w-3.5 h-3.5 shrink-0" />
        {activePlayers.length > 1
          ? `Watching ${activePlayers.length} players go for the rest of the places.`
          : 'The last two are finishing up.'}
      </p>

      <div className="pt-2 border-t border-edge flex items-center justify-center gap-5">
        <span className="flex items-center gap-1.5">
          <Label>Playing</Label>
          <span className="text-mini font-bold text-ink">{activePlayer?.name || '—'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Label>Next</Label>
          <span className="text-mini text-ink-muted">{nextPlayer?.name || '—'}</span>
        </span>
      </div>
    </Surface>
  )
}

export default React.memo(UnoSpectatorPanel)

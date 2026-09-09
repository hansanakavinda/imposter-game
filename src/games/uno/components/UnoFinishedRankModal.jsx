import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Eye, Sparkles } from 'lucide-react'
import { getRankBadge } from '../constants/unoConstants'
import { playVictorySound, playClickSound } from '../../../utils/sound'

export default function UnoFinishedRankModal({
  isOpen,
  rank,
  playerName = 'You',
  activeRemaining = 2,
  onClose,
}) {
  const rankInfo = getRankBadge(rank || 1)

  useEffect(() => {
    if (isOpen) {
      playVictorySound()
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      } catch {
        // ignore
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSpectate = () => {
    playClickSound()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-scaleUp">
        {/* Glow & Medal Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-4xl shadow-lg">
            {rankInfo.medal}
          </div>
        </div>

        {/* Heading & Rank Info */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hand Cleared!</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {playerName === 'You' ? 'Congratulations!' : `${playerName} Finished!`}
          </h2>

          <div className="text-lg font-black text-amber-400 pt-0.5">
            {rankInfo.medal} {rankInfo.label}
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto pt-1">
            {rank === 1
              ? 'Incredible job! You emptied all your cards first and secured 1st Place!'
              : `Awesome game! You cleared your hand and earned ${rankInfo.label}!`}
          </p>
        </div>

        {/* Ongoing Match Notice */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 text-left space-y-1">
          <div className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Spectator Mode Activated</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {activeRemaining > 1
              ? `${activeRemaining} players are still competing for remaining places. You can spectate the match live!`
              : 'The final 2 players are finishing up now!'}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleSpectate}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
          >
            <Eye className="w-4 h-4 text-zinc-950" />
            <span>Spectate Game</span>
          </button>
        </div>
      </div>
    </div>
  )
}

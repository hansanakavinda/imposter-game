import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react'
import { playVictorySound, playClickSound } from '../../../utils/sound'

export default function UnoGameOverModal({
  winner,
  players,
  onPlayAgain,
  onResetToLobby,
  onBackToMenu,
}) {
  const isHumanWinner = winner && winner.isHuman

  useEffect(() => {
    if (isHumanWinner) {
      playVictorySound()
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        })
      } catch {
        // ignore
      }
    }
  }, [isHumanWinner])

  if (!winner) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center space-y-6 animate-scaleUp">
        {/* Trophy icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <Trophy className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Game Over
          </span>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {isHumanWinner ? '🎉 You Won!' : `${winner.name} Won!`}
          </h2>
          <p className="text-xs text-zinc-400">
            {isHumanWinner
              ? 'Congratulations! You emptied your hand first!'
              : 'Better luck next round! AI took the victory.'}
          </p>
        </div>

        {/* Players Standings */}
        <div className="space-y-2 text-left bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block px-1">
            Remaining Cards
          </span>
          {players.map((p) => {
            const isThisWinner = p.id === winner.id
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold ${
                  isThisWinner
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{p.avatar || '👤'}</span>
                  <span>{p.name}</span>
                  {p.isHuman && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      You
                    </span>
                  )}
                </div>
                <span className="font-mono">
                  {isThisWinner ? '0 cards (Winner)' : `${p.hand.length} cards`}
                </span>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              playClickSound()
              onPlayAgain()
            }}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white hover:bg-zinc-200 text-zinc-950 transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Play Again</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              playClickSound()
              onResetToLobby()
            }}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Change Settings</span>
          </button>

          {onBackToMenu && (
            <button
              onClick={() => {
                playClickSound()
                onBackToMenu()
              }}
              className="w-full py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Game Menu</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

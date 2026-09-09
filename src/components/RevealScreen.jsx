import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { playVictorySound, playClickSound } from '../utils/sound'

export default function RevealScreen({
  players,
  gameData,
  onPlayAgain,
  onNewSetup,
  onBackToMenu,
}) {
  const imposters = players.filter((p) => p.isImposter)

  useEffect(() => {
    playVictorySound()
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      })
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="w-full max-w-sm mx-auto px-5 py-6 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn text-center">
      {/* Top Tag */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
          <span>{gameData.categoryIcon}</span>
          <span>{gameData.categoryName}</span>
        </div>
      </div>

      {/* Main Results */}
      <div className="my-auto py-8 space-y-8">
        {/* Secret Word */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
            Secret Word
          </span>
          <h2 className="text-4xl font-black text-white tracking-tight">
            {gameData.word}
          </h2>
        </div>

        {/* Imposter(s) */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 block">
            {imposters.length > 1 ? 'Imposters' : 'Imposter'}
          </span>

          <div className="space-y-2">
            {imposters.map((imp) => (
              <div
                key={imp.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${imp.theme.dot}`} />
                  <span className="font-bold text-white text-base">{imp.name}</span>
                </div>
                <span className="text-xs font-medium text-zinc-400">
                  Hint: <strong className="text-zinc-200">{gameData.hint}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-6">
        <button
          onClick={() => {
            playClickSound()
            onPlayAgain()
          }}
          className="w-full py-4 rounded-2xl font-bold text-sm text-zinc-950 bg-white hover:bg-zinc-200 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Play Again <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            playClickSound()
            onNewSetup()
          }}
          className="w-full py-3 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New Setup
        </button>

        {onBackToMenu && (
          <button
            onClick={() => {
              playClickSound()
              onBackToMenu()
            }}
            className="w-full py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            ← Back to Game Menu
          </button>
        )}
      </div>
    </div>
  )
}

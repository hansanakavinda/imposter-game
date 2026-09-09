import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { RotateCcw, Settings, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import { playVictorySound, playClickSound } from '../utils/sound'

export default function RevealScreen({
  players,
  gameData,
  selectedSuspectId,
  onPlayAgain,
  onNewSetup,
}) {
  const imposters = players.filter((p) => p.isImposter)
  const suspectedPlayer = players.find((p) => p.id === selectedSuspectId)

  const isImposterCaught = suspectedPlayer && suspectedPlayer.isImposter

  useEffect(() => {
    playVictorySound()

    // Confetti effect
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col space-y-4 animate-fadeIn select-none">
      {/* Game Outcome Header */}
      <div className="text-center space-y-2 py-2">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 p-[2px] mx-auto shadow-xl shadow-rose-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-3xl">
            {isImposterCaught ? '🏆' : '🕵️'}
          </div>
        </div>

        <div>
          {suspectedPlayer ? (
            isImposterCaught ? (
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Imposter Caught!
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Citizens Win!
                </h2>
                <p className="text-xs text-slate-400">
                  The group correctly identified {suspectedPlayer.name}!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                  <XCircle className="w-3.5 h-3.5" /> Imposter Escaped!
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Imposter Wins!
                </h2>
                <p className="text-xs text-slate-400">
                  {suspectedPlayer.name} was an innocent citizen!
                </p>
              </div>
            )
          ) : (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Round Completed
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                The Truth Revealed!
              </h2>
            </div>
          )}
        </div>
      </div>

      {/* Secret Word Card */}
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        {/* Category & Word */}
        <div className="text-center space-y-1 border-b border-slate-800 pb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {gameData.categoryIcon} Category: {gameData.categoryName}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            {gameData.word}
          </div>
          <span className="text-[11px] text-slate-500">The Secret Word</span>
        </div>

        {/* Imposter Hint */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">
            The Imposter's Hint Was:
          </span>
          <p className="text-xs text-slate-300 italic font-medium">
            "{gameData.hint}"
          </p>
        </div>

        {/* Imposter Identity Card */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            {imposters.length > 1 ? 'The Imposters Were:' : 'The Imposter Was:'}
          </span>

          <div className="grid grid-cols-1 gap-2">
            {imposters.map((imp) => {
              const theme = imp.theme
              return (
                <div
                  key={imp.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg ${theme.cardBg} ${theme.border}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center text-xl">
                      🕵️
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{imp.name}</div>
                      <div className="text-[10px] text-white/70 font-semibold">
                        Secret Imposter
                      </div>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${theme.badge}`}>
                    {theme.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* All Players List Breakdown */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          All Players Roles
        </h4>
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {players.map((p) => (
            <div
              key={p.id}
              className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                p.isImposter
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-slate-950/40 border-slate-800/60 text-slate-300'
              }`}
            >
              <span className="font-semibold truncate pr-1">{p.name}</span>
              <span className="text-[10px] font-bold uppercase opacity-80 flex-shrink-0">
                {p.isImposter ? 'Imposter' : 'Citizen'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={() => {
            playClickSound()
            onPlayAgain()
          }}
          className="w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 shadow-xl shadow-indigo-600/30 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          PLAY AGAIN (NEW WORD)
        </button>

        <button
          onClick={() => {
            playClickSound()
            onNewSetup()
          }}
          className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Change Game Settings
        </button>
      </div>
    </div>
  )
}

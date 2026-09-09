import React, { useState } from 'react'
import { Eye, EyeOff, Shield, ArrowRight, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react'
import { playCardFlipSound, playRevealSound, playClickSound } from '../utils/sound'

export default function PassCardScreen({
  players,
  gameData,
  currentPlayerIndex,
  onNextPlayer,
  onFinishPass,
}) {
  const [isHandedOver, setIsHandedOver] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [hasViewed, setHasViewed] = useState(false)

  const currentPlayer = players[currentPlayerIndex]
  const isLastPlayer = currentPlayerIndex === players.length - 1
  const theme = currentPlayer.theme

  // Trigger reveal
  const handleReveal = () => {
    if (!isRevealed) {
      playCardFlipSound()
      playRevealSound(currentPlayer.isImposter)
      setIsRevealed(true)
      setHasViewed(true)
    }
  }

  // Trigger hide
  const handleHide = () => {
    if (isRevealed) {
      playCardFlipSound()
      setIsRevealed(false)
    }
  }

  // Next player transition
  const handleProceed = () => {
    playClickSound()
    setIsHandedOver(false)
    setIsRevealed(false)
    setHasViewed(false)

    if (isLastPlayer) {
      onFinishPass()
    } else {
      onNextPlayer()
    }
  }

  // STEP 1: Handover screen (Ensures previous player doesn't see next player's secret)
  if (!isHandedOver) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[75vh] animate-fadeIn text-center select-none">
        {/* Progress Tracker */}
        <div className="mb-6 flex items-center gap-1.5 justify-center">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentPlayerIndex
                  ? 'w-8 bg-indigo-500'
                  : idx < currentPlayerIndex
                  ? 'w-3 bg-emerald-500'
                  : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Handover Card */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-inner">
            <Smartphone className="w-10 h-10 text-indigo-400 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Player {currentPlayerIndex + 1} of {players.length}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Pass Phone to
            </h2>
            <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 py-1">
              {currentPlayer.name}
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto pt-1">
              Make sure nobody else is looking at the screen before proceeding!
            </p>
          </div>

          <button
            onClick={() => {
              playClickSound()
              setIsHandedOver(true)
            }}
            className="w-full py-4 rounded-2xl font-bold text-base text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-xl shadow-indigo-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            I am {currentPlayer.name} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // STEP 2: Secret Card Viewing Screen
  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col items-center justify-center min-h-[80vh] animate-fadeIn select-none">
      {/* Top Banner */}
      <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400 px-1">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          {currentPlayer.name}'s Secret Card
        </span>
        <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
          {currentPlayerIndex + 1} / {players.length}
        </span>
      </div>

      {/* The Secret Card Container */}
      <div className="w-full perspective-1000 my-2">
        <div
          className={`relative w-full min-h-[380px] sm:min-h-[420px] rounded-3xl p-6 flex flex-col justify-between transition-all duration-500 border-2 shadow-2xl ${
            theme.border
          } ${theme.glow} ${
            isRevealed ? theme.cardBg : 'bg-slate-900 border-slate-700/80'
          }`}
        >
          {/* CARD COVER (When NOT revealed) */}
          {!isRevealed && (
            <div className="h-full flex flex-col items-center justify-between py-6 space-y-6 text-center">
              {/* Card Header */}
              <div className="space-y-1">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${theme.badge}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Private Secret Card
                </div>
                <h3 className="text-xl font-black text-white pt-2">
                  {currentPlayer.name}
                </h3>
              </div>

              {/* Graphic in Center */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-inner border bg-slate-800/80 border-slate-700`}>
                  🕵️
                </div>
                <p className="text-xs text-slate-400 max-w-[220px]">
                  Keep your screen tilted away from your friends!
                </p>
              </div>

              {/* Action Buttons to View */}
              <div className="w-full space-y-2.5">
                {/* Hold to Peek button */}
                <button
                  type="button"
                  onMouseDown={handleReveal}
                  onMouseUp={handleHide}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    handleReveal()
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    handleHide()
                  }}
                  className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide uppercase transition active:scale-95 shadow-lg flex items-center justify-center gap-2 ${theme.btnBg}`}
                >
                  <Eye className="w-5 h-5" />
                  HOLD TO PEEK SECRET
                </button>

                {/* Or simple click to flip */}
                <button
                  type="button"
                  onClick={handleReveal}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 transition"
                >
                  Or tap to reveal & lock
                </button>
              </div>
            </div>
          )}

          {/* CARD CONTENT (When Revealed) */}
          {isRevealed && (
            <div className="h-full flex flex-col justify-between py-2 space-y-4 text-center animate-fadeIn">
              {/* Category & Player badge */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${theme.badge}`}>
                  {gameData.categoryIcon} {gameData.categoryName}
                </span>
                <span className="text-xs font-bold text-white/80">
                  {currentPlayer.name}
                </span>
              </div>

              {/* ROLE & WORD SECTION */}
              <div className="my-auto py-4 space-y-4">
                {currentPlayer.isImposter ? (
                  /* Imposter Card: Note that background and styling use the same random theme! */
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-black uppercase tracking-wider">
                      <span>🕵️</span> YOU ARE THE IMPOSTER
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                        Your Secret Hint (1 Word):
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-white px-4 py-3 rounded-2xl bg-black/40 border border-white/15 tracking-wide">
                        {gameData.hint}
                      </div>
                    </div>

                    <p className="text-xs text-white/80 max-w-xs mx-auto leading-relaxed bg-black/20 p-2.5 rounded-xl">
                      You don't know the exact word! Pretend you know it, listen to other players' clues, and blend in!
                    </p>
                  </div>
                ) : (
                  /* Citizen Card */
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5" /> YOU ARE A CITIZEN
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                        The Secret Word Is:
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-white px-4 py-3 rounded-2xl bg-black/40 border border-white/15 tracking-wide">
                        {gameData.word}
                      </div>
                    </div>

                    <p className="text-xs text-white/80 max-w-xs mx-auto leading-relaxed bg-black/20 p-2.5 rounded-xl">
                      Give clever clues that citizens understand, but don't make it too obvious for the imposter!
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Actions when revealed */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleHide}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-black/40 hover:bg-black/60 text-white border border-white/20 transition flex items-center justify-center gap-2"
                >
                  <EyeOff className="w-4 h-4" />
                  Hide Word
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Player / Finish Button (Available after player has viewed) */}
      <div className="w-full mt-4">
        <button
          onClick={handleProceed}
          disabled={!hasViewed}
          className={`w-full py-4 rounded-2xl font-extrabold text-sm sm:text-base tracking-wide uppercase transition shadow-xl flex items-center justify-center gap-2 ${
            hasViewed
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 active:scale-[0.98]'
              : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
          }`}
        >
          {isLastPlayer ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              All Players Ready — Start Discussion
            </>
          ) : (
            <>
              Pass to Next Player ({players[currentPlayerIndex + 1]?.name})
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        {!hasViewed && (
          <p className="text-[11px] text-center text-slate-500 mt-2">
            Peek at your card first before passing to the next player
          </p>
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
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

  const currentPlayer = players[currentPlayerIndex]
  const isLastPlayer = currentPlayerIndex === players.length - 1
  const theme = currentPlayer.theme

  const toggleReveal = () => {
    if (!isRevealed) {
      playCardFlipSound()
      playRevealSound(currentPlayer.isImposter)
      setIsRevealed(true)
    } else {
      playCardFlipSound()
      setIsRevealed(false)
    }
  }

  const handleNext = () => {
    playClickSound()
    setIsHandedOver(false)
    setIsRevealed(false)

    if (isLastPlayer) {
      onFinishPass()
    } else {
      onNextPlayer()
    }
  }

  // STEP 1: Handover screen
  if (!isHandedOver) {
    return (
      <div className="w-full max-w-sm mx-auto px-5 py-8 flex flex-col justify-between min-h-[75vh] text-center select-none animate-fadeIn">
        <div className="text-xs font-mono text-zinc-500 pt-4">
          {currentPlayerIndex + 1} of {players.length}
        </div>

        <div className="space-y-3 py-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Hand Phone To
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">
            {currentPlayer.name}
          </h2>
        </div>

        <div>
          <button
            onClick={() => {
              playClickSound()
              setIsHandedOver(true)
            }}
            className="w-full py-4 rounded-2xl font-bold text-sm text-zinc-950 bg-white hover:bg-zinc-200 transition shadow-lg active:scale-[0.98]"
          >
            I am {currentPlayer.name}
          </button>
        </div>
      </div>
    )
  }

  // STEP 2: Secret Card Screen
  return (
    <div className="w-full max-w-sm mx-auto px-5 py-6 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn">
      {/* Top Meta */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
          <span className="font-semibold text-zinc-300">{currentPlayer.name}</span>
        </div>
        <span className="font-mono">
          {currentPlayerIndex + 1} / {players.length}
        </span>
      </div>

      {/* The Minimalist Card */}
      <div
        onClick={toggleReveal}
        className={`w-full min-h-[340px] rounded-3xl p-6 flex flex-col justify-between cursor-pointer border transition-all duration-300 active:scale-[0.99] ${
          theme.cardBg
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            {gameData.categoryIcon} {gameData.categoryName}
          </span>
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isRevealed ? 'Hide' : 'Reveal'}
          </span>
        </div>

        {/* Card Center (Hidden vs Revealed) */}
        <div className="my-auto text-center py-8">
          {!isRevealed ? (
            <div className="space-y-2">
              <span className="text-3xl">🔒</span>
              <p className="text-xs font-medium text-zinc-400">
                Tap anywhere to reveal
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {currentPlayer.isImposter ? (
                <>
                  <div>
                    <span className="text-[11px] font-semibold tracking-wider text-rose-400 uppercase">
                      Role
                    </span>
                    <h3 className="text-3xl font-black text-white tracking-tight mt-0.5">
                      Imposter
                    </h3>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                      Hint
                    </span>
                    <div className="text-xl font-bold text-zinc-200 mt-0.5">
                      {gameData.hint}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                      Secret Word
                    </span>
                    <h3 className="text-3xl font-black text-white tracking-tight mt-0.5">
                      {gameData.word}
                    </h3>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                      Role
                    </span>
                    <div className="text-sm font-medium text-zinc-300 mt-0.5">
                      Citizen
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="text-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            {isRevealed ? 'Tap card to hide' : 'Private'}
          </span>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pt-4">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-bold text-sm text-zinc-950 bg-white hover:bg-zinc-200 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isLastPlayer ? 'Start Discussion' : 'Next Player'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

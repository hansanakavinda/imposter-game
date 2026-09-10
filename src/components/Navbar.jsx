import React from 'react'
import { Volume2, VolumeX, RotateCcw, HelpCircle, ArrowLeft, Gamepad2 } from 'lucide-react'
import { playClickSound } from '../utils/sound'

export default function Navbar({
  soundOn,
  onToggleSound,
  onOpenRules,
  onResetGame,
  inGame,
  activeGame,
  onBackToMenu,
}) {
  const getGameLabel = () => {
    if (activeGame === 'imposter') {
      return { emoji: '🕵️', title: 'Imposter' }
    }
    if (activeGame === 'uno') {
      return { emoji: '🃏', title: 'UNO' }
    }
    if (activeGame === 'tank') {
      return { emoji: '🚜', title: 'Tank Arena' }
    }
    return { emoji: '🎮', title: 'Arcade Hub' }
  }

  const { emoji, title } = getGameLabel()

  return (
    <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between select-none">
      {/* Brand / Navigation */}
      <div className="flex items-center gap-2">
        {activeGame ? (
          <button
            onClick={() => {
              playClickSound()
              if (inGame) {
                if (window.confirm('Return to game menu? Progress will be lost.')) {
                  onBackToMenu()
                }
              } else {
                onBackToMenu()
              }
            }}
            className="flex items-center gap-2 text-left group px-2.5 py-1.5 rounded-xl hover:bg-zinc-800/60 transition cursor-pointer"
            title="Back to All Games"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
            <span className="text-xl">{emoji}</span>
            <span className="font-bold text-base tracking-tight text-white group-hover:text-zinc-300 transition">
              {title}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-amber-400 shadow-inner">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              Party Arcade
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {activeGame && inGame && onResetGame && (
          <button
            onClick={() => {
              playClickSound()
              if (window.confirm('Restart game?')) {
                onResetGame()
              }
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95 cursor-pointer"
            title="Restart"
            aria-label="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {activeGame && onOpenRules && (
          <button
            onClick={() => {
              playClickSound()
              onOpenRules()
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95 cursor-pointer"
            title="How to play"
            aria-label="How to play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onToggleSound}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95 cursor-pointer"
          title={soundOn ? 'Mute' : 'Unmute'}
          aria-label="Sound toggle"
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
        </button>
      </div>
    </header>
  )
}

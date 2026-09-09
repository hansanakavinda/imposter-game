import React from 'react'
import { Volume2, VolumeX, RotateCcw, HelpCircle } from 'lucide-react'
import { playClickSound } from '../utils/sound'

export default function Navbar({
  soundOn,
  onToggleSound,
  onOpenRules,
  onResetGame,
  inGame,
}) {
  return (
    <header className="w-full max-w-md mx-auto px-5 py-4 flex items-center justify-between select-none">
      {/* Brand */}
      <button
        onClick={() => {
          playClickSound()
          if (inGame && window.confirm('Exit to setup?')) {
            onResetGame()
          }
        }}
        className="flex items-center gap-2 text-left group"
      >
        <span className="text-xl">🕵️</span>
        <span className="font-bold text-base tracking-tight text-white group-hover:text-zinc-300 transition">
          imposter
        </span>
      </button>

      {/* Subtle Actions */}
      <div className="flex items-center gap-1">
        {inGame && (
          <button
            onClick={() => {
              playClickSound()
              if (window.confirm('Restart game?')) {
                onResetGame()
              }
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95"
            title="Restart"
            aria-label="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => {
            playClickSound()
            onOpenRules()
          }}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95"
          title="How to play"
          aria-label="How to play"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleSound}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95"
          title={soundOn ? 'Mute' : 'Unmute'}
          aria-label="Sound toggle"
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
        </button>
      </div>
    </header>
  )
}

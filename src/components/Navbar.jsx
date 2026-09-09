import React from 'react'
import { Volume2, VolumeX, HelpCircle, Wifi, RotateCcw } from 'lucide-react'
import { playClickSound } from '../utils/sound'

export default function Navbar({
  soundOn,
  onToggleSound,
  onOpenRules,
  onOpenNetwork,
  onResetGame,
  inGame,
}) {
  return (
    <header className="w-full max-w-xl mx-auto px-4 py-3 flex items-center justify-between z-30 select-none">
      {/* Logo & Brand */}
      <div 
        onClick={() => {
          playClickSound()
          if (inGame) {
            if (window.confirm('Leave current game and return to setup?')) {
              onResetGame()
            }
          }
        }}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition transform">
          <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center text-lg">
            🕵️
          </div>
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase font-heading flex items-center gap-1.5 leading-none">
            IMPOSTER
            <span className="text-[10px] tracking-normal font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              LOCAL
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">Party Deduction Game</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        {inGame && (
          <button
            onClick={() => {
              playClickSound()
              if (window.confirm('Restart and return to setup?')) {
                onResetGame()
              }
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 border border-slate-700/50"
            title="Return to Setup"
            aria-label="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => {
            playClickSound()
            onOpenNetwork()
          }}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 border border-slate-700/50"
          title="Wi-Fi Mobile Info"
          aria-label="Wi-Fi Info"
        >
          <Wifi className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={() => {
            playClickSound()
            onOpenRules()
          }}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 border border-slate-700/50"
          title="Game Rules"
          aria-label="Rules"
        >
          <HelpCircle className="w-4 h-4 text-indigo-400" />
        </button>

        <button
          onClick={() => {
            onToggleSound()
          }}
          className={`p-2 rounded-xl border transition active:scale-95 ${
            soundOn
              ? 'bg-slate-800/80 text-emerald-400 border-slate-700/50 hover:bg-slate-700'
              : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:text-slate-400'
          }`}
          title={soundOn ? 'Sound is On' : 'Sound is Muted'}
          aria-label="Toggle Sound"
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}

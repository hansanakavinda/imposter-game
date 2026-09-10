import React from 'react'
import { Sparkles } from 'lucide-react'
import { GAMES } from '../data/games'
import { playClickSound } from '../utils/sound'

export default function GameHub({ onSelectGame }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-12 flex flex-col items-center justify-center my-auto select-none">
      {/* Hero Banner */}
      <div className="text-center mb-6 md:mb-10 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-semibold text-zinc-300 backdrop-blur-md shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Party Arcade</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight text-white">
          Choose Your Game
        </h1>
      </div>

      {/* Simplified Square Game Tiles (Game Name + Icon Only) */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 w-full max-w-xs sm:max-w-2xl mx-auto">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => {
              playClickSound()
              onSelectGame(game.id)
            }}
            className={`group relative w-[calc(50%-0.6rem)] sm:w-48 aspect-square rounded-3xl bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700/80 p-4 sm:p-6 flex flex-col items-center justify-center gap-2.5 sm:gap-4 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 active:scale-95 shadow-xl hover:shadow-2xl select-none cursor-pointer ${game.borderGlow}`}
            aria-label={game.title}
          >
            {/* Ambient background glow accent */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-40 group-hover:opacity-80 group-active:opacity-90 transition-opacity duration-300 pointer-events-none`}
            />

            {/* Icon */}
            <span className="relative text-5xl sm:text-6xl md:text-7xl filter drop-shadow-md group-hover:scale-110 group-active:scale-110 transition-transform duration-300">
              {game.emoji}
            </span>

            {/* Game Name */}
            <span className="relative text-base sm:text-lg md:text-2xl font-extrabold text-white tracking-tight group-hover:text-zinc-100 transition-colors">
              {game.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

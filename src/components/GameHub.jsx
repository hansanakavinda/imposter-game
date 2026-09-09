import React from 'react'
import { Users, Clock, Sparkles, Play, BookOpen, ShieldAlert, Layers } from 'lucide-react'
import { GAMES } from '../data/games'
import { playClickSound } from '../utils/sound'

export default function GameHub({ onSelectGame, onOpenRulesForGame }) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10 flex flex-col items-center">
      {/* Hero Banner */}
      <div className="text-center mb-8 md:mb-12 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-xs font-semibold text-zinc-300 backdrop-blur-md shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Party Arcade</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
          Choose Your Game
        </h1>
        <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto">
          Pass-and-play party deduction or fast-paced card battles against smart bots.
        </p>
      </div>

      {/* Game Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {GAMES.map((game) => {
          return (
            <div
              key={game.id}
              className={`group relative rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-6 flex flex-col justify-between overflow-hidden backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${game.borderGlow}`}
            >
              {/* Radial gradient background accent */}
              <div
                className={`absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br ${game.gradient} blur-3xl opacity-60 group-hover:opacity-100 transition duration-500 pointer-events-none`}
              />

              <div>
                {/* Header: Badge & Status */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl select-none filter drop-shadow-md group-hover:scale-110 transition-transform duration-200">
                    {game.emoji}
                  </span>
                  <div className="flex items-center gap-2">
                    {game.isNew && (
                      <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        New
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {game.badge}
                    </span>
                  </div>
                </div>

                {/* Title & Tagline */}
                <h2 className="text-2xl font-bold text-white mb-1 tracking-tight group-hover:text-zinc-100 flex items-center gap-2">
                  {game.title}
                </h2>
                <p className="text-xs font-semibold text-zinc-400 mb-3">
                  {game.tagline}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                  {game.description}
                </p>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-400 mb-5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-zinc-500" />
                    <span>{game.playerCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span>{game.duration}</span>
                  </div>
                </div>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-800 text-[11px] text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    playClickSound()
                    onSelectGame(game.id)
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition duration-200 active:scale-95 cursor-pointer ${game.buttonColor}`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play {game.title}</span>
                </button>

                {onOpenRulesForGame && (
                  <button
                    onClick={() => {
                      playClickSound()
                      onOpenRulesForGame(game.id)
                    }}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 transition active:scale-95 cursor-pointer"
                    title="How to play"
                    aria-label={`Rules for ${game.title}`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Arcade Info Strip */}
      <div className="mt-10 flex items-center justify-center gap-6 text-xs text-zinc-400 select-none">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>No accounts or signups needed</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Offline ready in your browser</span>
        </div>
      </div>
    </div>
  )
}

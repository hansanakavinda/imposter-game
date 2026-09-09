import React from 'react'
import { Bot, Users, Sparkles, ArrowLeft, BookOpen, ShieldCheck } from 'lucide-react'
import { playClickSound } from '../../../utils/sound'

export default function UnoModeSelect({
  onSelectMode, // 'ai' | 'multiplayer'
  onBackToMenu,
  onOpenRules,
}) {
  return (
    <div className="w-full max-w-md mx-auto px-5 py-4 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn">
      {/* Header */}
      <div className="pt-2 pb-6 text-center relative">
        <button
          type="button"
          onClick={() => {
            playClickSound()
            onBackToMenu()
          }}
          className="absolute left-0 top-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Games</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Game Mode</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          UNO
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Select how you want to play
        </p>
      </div>

      {/* Modes Grid */}
      <div className="space-y-4 my-auto">
        {/* Mode 1: Online Multiplayer with Friends */}
        <div
          onClick={() => {
            playClickSound()
            onSelectMode('multiplayer')
          }}
          className="group relative p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-red-500/60 hover:shadow-xl hover:shadow-red-950/20 transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.98]"
        >
          <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-red-600/20 blur-2xl pointer-events-none group-hover:scale-125 transition" />

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition">
                  Play with Friends
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/40">
                  Online
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Create a private room with a 4-digit code. Friends join on their own phones or computers.
              </p>
            </div>
          </div>
        </div>

        {/* Mode 2: Play vs AI Bots */}
        <div
          onClick={() => {
            playClickSound()
            onSelectMode('ai')
          }}
          className="group relative p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-950/20 transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.98]"
        >
          <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-blue-600/20 blur-2xl pointer-events-none group-hover:scale-125 transition" />

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Bot className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base text-white group-hover:text-blue-300 transition">
                  Solo vs AI Bots
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/40">
                  Offline
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Practice and play against 1 to 3 smart bots. Fast-paced, no waiting.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info & Rules */}
      <div className="pt-6 space-y-3">
        <button
          type="button"
          onClick={() => {
            playClickSound()
            onOpenRules()
          }}
          className="w-full py-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>How to Play UNO Rules</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Peer-to-peer encrypted • No accounts needed</span>
        </div>
      </div>
    </div>
  )
}

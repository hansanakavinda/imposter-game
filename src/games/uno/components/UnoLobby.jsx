import React, { useState } from 'react'
import { ArrowLeft, Play, Users, Bot, Sparkles } from 'lucide-react'
import { playClickSound } from '../../../utils/sound'

const BOT_PRESETS = [
  { name: 'Gizmo', avatar: '🤖', color: 'border-blue-500/50 bg-blue-500/10' },
  { name: 'Blaze', avatar: '🦊', color: 'border-amber-500/50 bg-amber-500/10' },
  { name: 'Echo', avatar: '🐼', color: 'border-emerald-500/50 bg-emerald-500/10' },
]

export default function UnoLobby({ onStartGame, onBackToMenu, onOpenRules }) {
  const [playerName, setPlayerName] = useState('Player 1')
  const [botCount, setBotCount] = useState(3) // 3 bots = 4 total players (standard Uno)

  const handleStart = (e) => {
    e.preventDefault()
    playClickSound()

    const humanPlayer = {
      id: 0,
      name: playerName.trim() || 'Player 1',
      isHuman: true,
      avatar: '😎',
      hand: [],
    }

    const botPlayers = Array.from({ length: botCount }, (_, i) => ({
      id: i + 1,
      name: BOT_PRESETS[i].name,
      avatar: BOT_PRESETS[i].avatar,
      isHuman: false,
      hand: [],
    }))

    onStartGame({
      players: [humanPlayer, ...botPlayers],
    })
  }

  return (
    <div className="w-full max-w-md mx-auto px-5 py-4 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn">
      {/* Header */}
      <div className="pt-2 pb-4 text-center relative">
        {onBackToMenu && (
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
        )}

        {/* Uno Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Card Arena</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          UNO Battle
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Challenge smart bots in the classic card game
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleStart} className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          {/* Your Name */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-red-500 transition"
              placeholder="Enter your name"
            />
          </div>

          {/* Opponent Bots Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                Opponents
              </label>
              <span className="text-xs text-zinc-400">
                {botCount + 1} Players Total
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((count) => {
                const isSelected = botCount === count
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setBotCount(count)
                    }}
                    className={`py-3.5 px-2 rounded-2xl border flex flex-col items-center gap-1 transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-red-600/20 border-red-500 text-white shadow-lg shadow-red-950/40'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Bot className="w-4 h-4" />
                      <span className="text-sm font-bold">{count} Bot{count > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {count === 1 ? '1v1 Duel' : count === 2 ? '3-Player' : 'Full Table'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>Table Lineup</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-2.5">
                <span className="text-lg">😎</span>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">
                    {playerName || 'You'}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">Human</span>
                </div>
              </div>

              {BOT_PRESETS.slice(0, botCount).map((bot) => (
                <div
                  key={bot.name}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${bot.color}`}
                >
                  <span className="text-lg">{bot.avatar}</span>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">
                      {bot.name}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium">AI Bot</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 hover:brightness-110 active:brightness-95 text-white shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Deal & Start Game</span>
          </button>

          {onOpenRules && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onOpenRules()
              }}
              className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              📖 View Uno Rules
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

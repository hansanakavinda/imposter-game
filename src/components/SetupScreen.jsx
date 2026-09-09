import React, { useState } from 'react'
import { Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react'
import { CATEGORIES } from '../data/words'
import { playClickSound } from '../utils/sound'

export default function SetupScreen({ onStartGame, onBackToMenu }) {
  const [playerCount, setPlayerCount] = useState(4)
  const [imposterCount, setImposterCount] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('any')
  const [timerDuration, setTimerDuration] = useState(0) // Default to Off

  // Custom word state
  const [customWord, setCustomWord] = useState('')
  const [customHint, setCustomHint] = useState('')
  const [customError, setCustomError] = useState('')

  const handlePlayerChange = (delta) => {
    playClickSound()
    const next = Math.max(3, Math.min(20, playerCount + delta))
    setPlayerCount(next)
    if (next < 5 && imposterCount > 1) {
      setImposterCount(1)
    }
  }

  const handleStart = (e) => {
    e.preventDefault()
    playClickSound()

    if (selectedCategory === 'custom') {
      if (!customWord.trim()) {
        setCustomError('Enter a secret word')
        return
      }
      if (!customHint.trim()) {
        setCustomError('Enter a single-word hint')
        return
      }
    }

    const defaultNames = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`)

    onStartGame({
      playerCount,
      imposterCount,
      category: selectedCategory,
      timerDuration,
      playerNames: defaultNames,
      customWord: {
        word: customWord.trim(),
        hint: customHint.trim().split(/\s+/)[0], // strictly single word
        categoryName: 'Custom',
        categoryIcon: '✏️',
      },
    })
  }

  return (
    <div className="w-full max-w-sm mx-auto px-5 py-4 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn">
      {/* Top Header */}
      <div className="pt-2 pb-6 text-center relative">
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
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          New Game
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Pass & play on one device
        </p>
      </div>

      <form onSubmit={handleStart} className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          {/* 1. Players Stepper */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Players
            </label>
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl p-2">
              <button
                type="button"
                onClick={() => handlePlayerChange(-1)}
                disabled={playerCount <= 3}
                className="w-12 h-12 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-30 disabled:hover:bg-zinc-800/80 text-white flex items-center justify-center transition active:scale-95"
                aria-label="Decrease players"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="text-center">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {playerCount}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handlePlayerChange(1)}
                disabled={playerCount >= 20}
                className="w-12 h-12 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-30 disabled:hover:bg-zinc-800/80 text-white flex items-center justify-center transition active:scale-95"
                aria-label="Increase players"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. Imposter Count */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Imposters
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  setImposterCount(1)
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold transition ${
                  imposterCount === 1
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                1 Imposter
              </button>

              <button
                type="button"
                disabled={playerCount < 5}
                onClick={() => {
                  playClickSound()
                  if (playerCount >= 5) setImposterCount(2)
                }}
                className={`py-2.5 rounded-xl text-xs font-semibold transition ${
                  playerCount < 5
                    ? 'opacity-30 cursor-not-allowed text-zinc-500'
                    : imposterCount === 2
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                2 Imposters {playerCount < 5 && '(5+)'}
              </button>
            </div>
          </div>

          {/* 3. Category */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  setSelectedCategory('any')
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  selectedCategory === 'any'
                    ? 'bg-white text-zinc-950 border-white font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                🎲 Mixed
              </button>

              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setSelectedCategory(cat.id)
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    selectedCategory === cat.id
                      ? 'bg-white text-zinc-950 border-white font-semibold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {cat.icon} {cat.name.split(' ')[0]}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  setSelectedCategory('custom')
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                  selectedCategory === 'custom'
                    ? 'bg-white text-zinc-950 border-white font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                ✏️ Custom
              </button>
            </div>

            {/* Minimal Custom Word Form */}
            {selectedCategory === 'custom' && (
              <div className="mt-2 space-y-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl animate-fadeIn">
                <input
                  type="text"
                  placeholder="Secret Word (e.g. Pizza)"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <input
                  type="text"
                  placeholder="Single-Word Hint (e.g. Italian)"
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                {customError && (
                  <span className="text-[11px] text-rose-400 block">{customError}</span>
                )}
              </div>
            )}
          </div>

          {/* 4. Timer Option */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Timer
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Off', val: 0 },
                { label: '1m', val: 60 },
                { label: '2m', val: 120 },
                { label: '3m', val: 180 },
              ].map((t) => (
                <button
                  key={t.val}
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setTimerDuration(t.val)
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    timerDuration === t.val
                      ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Start Button */}
        <div className="pt-6">
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-bold text-sm text-zinc-950 bg-white hover:bg-zinc-200 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Start Game <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

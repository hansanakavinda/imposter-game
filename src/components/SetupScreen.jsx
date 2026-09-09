import React, { useState } from 'react'
import { Users, UserX, Sparkles, Clock, Play, Edit3, ChevronDown, ChevronUp, Shuffle } from 'lucide-react'
import { CATEGORIES } from '../data/words'
import { playClickSound } from '../utils/sound'

export default function SetupScreen({ onStartGame }) {
  const [playerCount, setPlayerCount] = useState(4)
  const [imposterCount, setImposterCount] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('any')
  const [timerDuration, setTimerDuration] = useState(120) // 120s = 2 min default
  const [showPlayerNames, setShowPlayerNames] = useState(false)
  
  // Player custom names list
  const [playerNames, setPlayerNames] = useState([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ])

  // Custom word state
  const [customWord, setCustomWord] = useState('')
  const [customHint, setCustomHint] = useState('')
  const [customCategoryName, setCustomCategoryName] = useState('Custom Category')
  const [customError, setCustomError] = useState('')

  // Handle player count change
  const handlePlayerCountChange = (newCount) => {
    playClickSound()
    const clamped = Math.max(3, Math.min(20, newCount))
    setPlayerCount(clamped)

    // Adjust imposter count if player count drops below 5
    if (clamped < 5 && imposterCount > 1) {
      setImposterCount(1)
    }

    // Sync names array
    setPlayerNames((prev) => {
      const updated = [...prev]
      if (clamped > updated.length) {
        for (let i = updated.length; i < clamped; i++) {
          updated.push(`Player ${i + 1}`)
        }
      } else {
        updated.splice(clamped)
      }
      return updated
    })
  }

  const handleNameChange = (index, value) => {
    const updated = [...playerNames]
    updated[index] = value
    setPlayerNames(updated)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    playClickSound()

    // Validate custom word if chosen
    if (selectedCategory === 'custom') {
      if (!customWord.trim()) {
        setCustomError('Please enter a secret word!')
        return
      }
      if (!customHint.trim()) {
        setCustomError('Please enter a hint for the imposter!')
        return
      }
      setCustomError('')
    }

    // Clean player names (fallback to Player i if empty)
    const cleanedNames = playerNames.slice(0, playerCount).map((name, idx) => {
      const trimmed = name.trim()
      return trimmed || `Player ${idx + 1}`
    })

    onStartGame({
      playerCount,
      imposterCount,
      category: selectedCategory,
      timerDuration,
      playerNames: cleanedNames,
      customWord: {
        word: customWord.trim(),
        hint: customHint.trim(),
        categoryName: customCategoryName.trim() || 'Custom',
        categoryIcon: '✏️',
      },
    })
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-2 pb-12 flex flex-col space-y-5 animate-fadeIn">
      {/* Hero Title */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Pass & Play Mobile Game
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Find The <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-400 to-indigo-400">Imposter</span>
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          One phone, lots of bluffing. Who is pretending to know the secret word?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Number of Players Card */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Number of Players
            </label>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              3 - 20 players
            </span>
          </div>

          {/* Stepper with big numbers */}
          <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => handlePlayerCountChange(playerCount - 1)}
              disabled={playerCount <= 3}
              className="w-12 h-12 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-black text-2xl flex items-center justify-center transition active:scale-95 touch-manipulation"
              aria-label="Decrease players"
            >
              -
            </button>

            <div className="text-center">
              <span className="text-3xl font-black text-white tracking-tight">
                {playerCount}
              </span>
              <span className="block text-[11px] font-medium text-slate-400">Players</span>
            </div>

            <button
              type="button"
              onClick={() => handlePlayerCountChange(playerCount + 1)}
              disabled={playerCount >= 20}
              className="w-12 h-12 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-black text-2xl flex items-center justify-center transition active:scale-95 touch-manipulation"
              aria-label="Increase players"
            >
              +
            </button>
          </div>

          {/* Quick selection chips */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            {[3, 4, 5, 6, 8, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePlayerCountChange(num)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  playerCount === num
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Custom Player Names Toggle */}
          <div className="pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => {
                playClickSound()
                setShowPlayerNames(!showPlayerNames)
              }}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition py-1"
            >
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                Customize Player Names {showPlayerNames ? '(Hide)' : '(Optional)'}
              </span>
              {showPlayerNames ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showPlayerNames && (
              <div className="mt-3 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 animate-fadeIn">
                {Array.from({ length: playerCount }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      maxLength={15}
                      value={playerNames[idx] || ''}
                      onChange={(e) => handleNameChange(idx, e.target.value)}
                      placeholder={`Player ${idx + 1}`}
                      className="w-full text-xs bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Number of Imposters Card */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-400" />
              Imposters in Game
            </label>
            <span className="text-[11px] text-slate-400">
              {imposterCount === 1 ? '1 secret imposter' : '2 secret imposters'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                playClickSound()
                setImposterCount(1)
              }}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                imposterCount === 1
                  ? 'bg-rose-500/20 border-rose-500/50 text-white shadow-lg shadow-rose-500/10'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">🕵️</span>
              <span className="text-xs font-bold">1 Imposter</span>
              <span className="text-[10px] text-slate-400 font-medium">Standard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound()
                if (playerCount >= 5) {
                  setImposterCount(2)
                }
              }}
              disabled={playerCount < 5}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                playerCount < 5
                  ? 'opacity-40 cursor-not-allowed bg-slate-800/20 border-slate-800/40 text-slate-500'
                  : imposterCount === 2
                  ? 'bg-rose-500/20 border-rose-500/50 text-white shadow-lg shadow-rose-500/10'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-lg">🕵️🕵️</span>
              <span className="text-xs font-bold">2 Imposters</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {playerCount < 5 ? 'Needs 5+ players' : 'Chaos mode'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Category Selection Card */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-emerald-400" />
              Word Category
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              {selectedCategory === 'any'
                ? 'Mixed Pack'
                : selectedCategory === 'custom'
                ? 'Custom Words'
                : CATEGORIES.find((c) => c.id === selectedCategory)?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Any / Mixed */}
            <button
              type="button"
              onClick={() => {
                playClickSound()
                setSelectedCategory('any')
              }}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                selectedCategory === 'any'
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-md shadow-emerald-500/10'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xl">🎲</span>
              <div className="leading-tight">
                <span className="block text-xs font-bold">Mixed</span>
                <span className="text-[10px] text-slate-400">All topics</span>
              </div>
            </button>

            {/* Built-in Categories */}
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  playClickSound()
                  setSelectedCategory(cat.id)
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <div className="leading-tight truncate">
                  <span className="block text-xs font-bold truncate">{cat.name.split(' ')[0]}</span>
                  <span className="text-[10px] text-slate-400 truncate">{cat.words.length} words</span>
                </div>
              </button>
            ))}

            {/* Custom Mode */}
            <button
              type="button"
              onClick={() => {
                playClickSound()
                setSelectedCategory('custom')
              }}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                selectedCategory === 'custom'
                  ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xl">✏️</span>
              <div className="leading-tight">
                <span className="block text-xs font-bold">Custom</span>
                <span className="text-[10px] text-slate-400">Host enters</span>
              </div>
            </button>
          </div>

          {/* Custom Word Form */}
          {selectedCategory === 'custom' && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2.5 animate-fadeIn">
              <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <span>✏️</span> Enter Your Own Secret Word & Imposter Hint:
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Secret Word (shown to Citizens):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pineapple Pizza, Elon Musk, Paris"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Imposter Hint (Single Word):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Italian, Ocean, Flights, Superhero"
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Keep it a single word so the imposter doesn't guess the secret immediately.
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Category Tag (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Food, Famous Person, Inside Joke"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {customError && (
                <div className="text-xs text-rose-400 font-medium">
                  ⚠️ {customError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Timer Setting Card */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Discussion Timer
            </label>
            <span className="text-[11px] text-slate-400">
              {timerDuration === 0 ? 'No timer' : `${Math.floor(timerDuration / 60)} minutes`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Off', val: 0 },
              { label: '1 min', val: 60 },
              { label: '2 min', val: 120 },
              { label: '3 min', val: 180 },
            ].map((t) => (
              <button
                key={t.val}
                type="button"
                onClick={() => {
                  playClickSound()
                  setTimerDuration(t.val)
                }}
                className={`py-2 rounded-xl border text-xs font-bold transition ${
                  timerDuration === t.val
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fair Card Colors Notice */}
        <div className="px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <span className="text-base">🎨</span>
          <span>
            Every player gets a randomized vibrant card color. The Imposter card also gets a random color so no one can guess by glancing at the phone!
          </span>
        </div>

        {/* 5. Start Game Button */}
        <button
          type="submit"
          className="w-full py-4 rounded-2xl font-black text-lg tracking-wide uppercase text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:from-indigo-500 hover:via-purple-500 hover:to-rose-500 shadow-xl shadow-indigo-600/30 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          START GAME
        </button>
      </form>
    </div>
  )
}

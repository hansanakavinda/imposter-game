import React, { useState, useEffect, useRef } from 'react'
import { Clock, Play, Pause, RotateCcw, Plus, Sparkles, Check, ChevronRight, Tag } from 'lucide-react'
import { playClickSound, playTickSound } from '../utils/sound'

export default function DiscussionScreen({
  players,
  gameData,
  timerDuration,
  startingPlayerIndex,
  onRevealImposters,
}) {
  const [timeLeft, setTimeLeft] = useState(timerDuration)
  const [isRunning, setIsRunning] = useState(timerDuration > 0)
  const [selectedSuspectId, setSelectedSuspectId] = useState(null)
  const [confirmReveal, setConfirmReveal] = useState(false)

  const timerRef = useRef(null)

  // Timer effect
  useEffect(() => {
    if (timerDuration === 0) return

    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            setIsRunning(false)
            playTickSound(true)
            return 0
          }
          if (prev <= 10) {
            playTickSound(true)
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(timerRef.current)
  }, [isRunning, timeLeft, timerDuration])

  // Format seconds mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => {
    playClickSound()
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    playClickSound()
    setIsRunning(false)
    setTimeLeft(timerDuration)
  }

  const addTime = (secs = 30) => {
    playClickSound()
    setTimeLeft((prev) => prev + secs)
  }

  const handlePlayerSelect = (playerId) => {
    playClickSound()
    setSelectedSuspectId(selectedSuspectId === playerId ? null : playerId)
  }

  const handleRevealClick = () => {
    playClickSound()
    setConfirmReveal(true)
  }

  const handleConfirmReveal = () => {
    playClickSound()
    onRevealImposters(selectedSuspectId)
  }

  const startingPlayer = players[startingPlayerIndex] || players[0]

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 flex flex-col space-y-4 animate-fadeIn select-none">
      {/* Starting Player Announcement Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 rounded-2xl p-4 border border-indigo-500/30 shadow-lg text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" /> First Speaker
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700">
            <Tag className="w-3 h-3 text-emerald-400" /> {gameData.categoryIcon} {gameData.categoryName}
          </span>
        </div>
        <h3 className="text-xl font-black text-white">
          🎙️ {startingPlayer.name} speaks first!
        </h3>
        <p className="text-xs text-slate-300">
          Give a one-word clue or describe the word. Then take turns around the circle!
        </p>
      </div>

      {/* Timer Card (If timer is enabled) */}
      {timerDuration > 0 && (
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col items-center space-y-3">
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Clock className="w-4 h-4 text-cyan-400" /> Discussion Timer
            </span>
            <span className={timeLeft <= 10 && timeLeft > 0 ? 'text-rose-400 font-bold animate-pulse' : ''}>
              {timeLeft === 0 ? 'Time is up! Vote now!' : isRunning ? 'Timer active' : 'Paused'}
            </span>
          </div>

          <div
            className={`text-5xl font-black tracking-tight font-mono transition-colors ${
              timeLeft === 0
                ? 'text-rose-500 animate-pulse'
                : timeLeft <= 15
                ? 'text-amber-400'
                : 'text-white'
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={toggleTimer}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isRunning
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                  : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isRunning ? 'Pause' : 'Start'}
            </button>

            <button
              onClick={() => addTime(30)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> 30s
            </button>

            <button
              onClick={resetTimer}
              className="p-2 rounded-xl text-slate-400 bg-slate-800 border border-slate-700/60 hover:bg-slate-700 hover:text-white transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Group Voting Section */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🗳️</span> Accuse Suspect (Optional)
          </h4>
          <span className="text-[11px] text-slate-500">Tap to vote</span>
        </div>

        <p className="text-xs text-slate-400">
          Discuss together. Once your group agrees on a suspect, tap their name:
        </p>

        {/* Players Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-0.5">
          {players.map((player) => {
            const isSelected = selectedSuspectId === player.id
            const theme = player.theme

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => handlePlayerSelect(player.id)}
                className={`p-3 rounded-xl border text-left transition relative flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-rose-500/20 border-rose-400 text-white shadow-lg shadow-rose-500/20 ring-2 ring-rose-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                {/* Theme indicator dot */}
                <div
                  className={`w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0 ${theme.btnBg.split(' ')[0]}`}
                />
                <span className="text-xs font-bold truncate flex-1">{player.name}</span>
                {isSelected && <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reveal Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleRevealClick}
          className="w-full py-4 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase text-white bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-xl shadow-rose-600/30 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>🕵️</span>
          REVEAL IMPOSTER NOW
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-3xl">
              🕵️
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">Reveal the Imposter?</h3>
              <p className="text-xs text-slate-300">
                {selectedSuspectId ? (
                  <>
                    Your group suspects{' '}
                    <strong className="text-rose-400">
                      {players.find((p) => p.id === selectedSuspectId)?.name}
                    </strong>
                    . Ready to find out if they were guilty?
                  </>
                ) : (
                  'Are you ready to reveal the secret word and who the imposter was?'
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmReveal(false)}
                className="py-3 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Keep Discussing
              </button>
              <button
                type="button"
                onClick={handleConfirmReveal}
                className="py-3 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/30"
              >
                Yes, Reveal!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

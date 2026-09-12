import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { playClickSound, playTickSound } from '../../../utils/sound'

export default function DiscussionScreen({
  players,
  gameData,
  timerDuration,
  startingPlayerIndex,
  onRevealImposters,
}) {
  const [timeLeft, setTimeLeft] = useState(timerDuration)
  const [isRunning, setIsRunning] = useState(timerDuration > 0)
  const [confirmReveal, setConfirmReveal] = useState(false)

  const timerRef = useRef(null)

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

  const startingPlayer = players[startingPlayerIndex] || players[0]

  return (
    <div className="w-full max-w-sm mx-auto px-5 py-6 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn text-center">
      {/* Starting Speaker Banner */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
          <span>{gameData.categoryIcon}</span>
          <span>{gameData.categoryName}</span>
        </div>

        <div className="mt-8 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
            First Speaker
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {startingPlayer.name}
          </h2>
          <p className="text-xs text-zinc-400 pt-1">
            Give one clue, then take turns
          </p>
        </div>
      </div>

      {/* Timer Section (If enabled) */}
      {timerDuration > 0 && (
        <div className="my-auto py-8 space-y-4">
          <div
            onClick={toggleTimer}
            className={`text-6xl font-black font-mono tracking-tight cursor-pointer transition ${
              timeLeft === 0 ? 'text-rose-500' : 'text-white'
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleTimer}
              className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition active:scale-95"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={resetTimer}
              className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Action */}
      <div className="pt-6">
        <button
          onClick={() => {
            playClickSound()
            setConfirmReveal(true)
          }}
          className="w-full py-4 rounded-2xl font-bold text-sm text-zinc-950 bg-white hover:bg-zinc-200 transition shadow-lg active:scale-[0.98]"
        >
          Reveal Imposter
        </button>
      </div>

      {/* Minimal Confirm Dialog */}
      {confirmReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xs w-full p-6 space-y-4 text-center">
            <h3 className="text-lg font-bold text-white">Reveal Results?</h3>
            <p className="text-xs text-zinc-400">
              Make sure everyone has voted on who they think the imposter is.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setConfirmReveal(false)}
                className="py-2.5 rounded-xl text-xs font-semibold text-zinc-400 bg-zinc-800 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  playClickSound()
                  onRevealImposters(null)
                }}
                className="py-2.5 rounded-xl text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition"
              >
                Reveal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

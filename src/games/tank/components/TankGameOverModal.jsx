import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, RotateCcw, ArrowLeft } from 'lucide-react'
import { TEAMS } from '../constants/tankConstants'
import { playVictorySound, playClickSound } from '../../../utils/sound'

export default function TankGameOverModal({
  winner, // 'blue' or 'red'
  score,
  isHost,
  onRematch,
  onBackToLobby,
}) {
  const winningTeam = TEAMS[winner] || TEAMS.blue

  useEffect(() => {
    playVictorySound()
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [winningTeam.color, '#fbbf24', '#ffffff'],
      })
    } catch {
      // ignore
    }
    // winningTeam is derived from winner via the TEAMS constant, so it is stable and
    // listing winner as well would be redundant.
  }, [winningTeam])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl space-y-5">
        {/* Trophy Icon */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-xl"
          style={{ backgroundColor: `${winningTeam.color}25`, border: `1.5px solid ${winningTeam.color}60` }}
        >
          <Trophy className="w-8 h-8" style={{ color: winningTeam.color }} />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
            MATCH VICTORY
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white" style={{ color: winningTeam.color }}>
            {winningTeam.name.toUpperCase()} WINS!
          </h2>
        </div>

        {/* Final Score */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl py-3 px-6 flex items-center justify-around">
          <div className="text-center">
            <span className="text-[10px] font-bold text-cyan-400 block uppercase">Team Blue</span>
            <span className="text-2xl font-black text-cyan-400">{score.blue}</span>
          </div>
          <span className="text-zinc-600 font-bold text-sm">VS</span>
          <div className="text-center">
            <span className="text-[10px] font-bold text-rose-400 block uppercase">Team Red</span>
            <span className="text-2xl font-black text-rose-400">{score.red}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {isHost ? (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onRematch()
              }}
              className="w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-98 text-white shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY REMATCH</span>
            </button>
          ) : (
            <p className="text-xs text-zinc-400">Waiting for host to start rematch...</p>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound()
              onBackToLobby()
            }}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Lobby</span>
          </button>
        </div>
      </div>
    </div>
  )
}

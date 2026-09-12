import React from 'react'
import { Users, Swords, Play, ArrowLeft, Sparkles } from 'lucide-react'
import { DEFAULT_TANK_TYPE } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'
import TankSelector from './TankSelector'

// The pre-room screen: call-sign, tank class, battle mode, and create/join.
// Was an early return in the middle of TankLobby.jsx.
export default function TankLobbyLanding({
  mode,
  onSelectMode,
  inputCode,
  onChangeInputCode,
  playerName,
  onChangePlayerName,
  selectedTank = DEFAULT_TANK_TYPE,
  onSelectTank,
  onCreateRoom,
  onJoinRoom,
  onBackToMenu,
  error,
}) {
  return (
      <div className="w-full max-w-xl mx-auto px-4 py-4 flex flex-col items-center justify-center my-auto select-none animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>2D Tactical Battlefield</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>🚜</span> Tank Arena
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Top-down tactical tank combat across separate devices. No bots, pure human tactics!
          </p>
        </div>

        {/* Player Name Input */}
        <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-xl space-y-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Your Call-Sign (Name)
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => onChangePlayerName(e.target.value.slice(0, 14))}
            placeholder="Enter Commander Name"
            maxLength={14}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white font-semibold text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
        </div>

        {/* Tank Selector on Landing */}
        <TankSelector selectedTank={selectedTank} onSelectTank={onSelectTank} />

        {/* Mode Selector */}
        <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-xl space-y-3">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Select Battle Mode
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onSelectMode('1v1')
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                mode === '1v1'
                  ? 'bg-cyan-500/15 border-cyan-500/80 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Swords className={`w-5 h-5 ${mode === '1v1' ? 'text-cyan-400' : 'text-zinc-500'}`} />
              <span className="font-extrabold text-sm">1 v 1 Duel</span>
              <span className="text-[10px] text-zinc-400">2 Players Total</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound()
                onSelectMode('2v2')
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                mode === '2v2'
                  ? 'bg-rose-500/15 border-rose-500/80 text-white shadow-lg shadow-rose-500/10'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Users className={`w-5 h-5 ${mode === '2v2' ? 'text-rose-400' : 'text-zinc-500'}`} />
              <span className="font-extrabold text-sm">2 v 2 Squad</span>
              <span className="text-[10px] text-zinc-400">4 Players (Teams)</span>
            </button>
          </div>
        </div>

        {/* Action: Host or Join */}
        <div className="w-full space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound()
              onCreateRoom()
            }}
            className="w-full py-3.5 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-98 text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>CREATE BATTLE ROOM</span>
          </button>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-black px-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              OR JOIN FRIEND
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => onChangeInputCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="ROOM CODE (e.g. 7X9A)"
              maxLength={4}
              className="flex-1 px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono font-bold text-center tracking-widest text-sm focus:outline-none focus:border-rose-500 transition"
            />
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onJoinRoom()
              }}
              disabled={inputCode.length < 3}
              className="px-5 py-3 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white transition cursor-pointer"
            >
              JOIN
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound()
              onBackToMenu()
            }}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Arcade Hub</span>
          </button>
        </div>
      </div>
  )
}

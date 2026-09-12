import React, { useState } from 'react'
import { Copy, Check, Play, ArrowLeft, Share2 } from 'lucide-react'
import { MODES, TEAMS, TANK_TYPES, DEFAULT_TANK_TYPE } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'
import TankSelector from './TankSelector'

// The in-room screen: roster, readiness and launch. Was the second half of
// TankLobby.jsx, reached past an early return.
export default function TankLobbyRoom({
  mode,
  roomCode,
  isHost,
  players,
  mySlotId,
  myPeerId,
  selectedTank = DEFAULT_TANK_TYPE,
  onSelectTank,
  onSelectSlot,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) {
  const [copied, setCopied] = useState(false)
  const currentModeConfig = MODES[mode] || MODES['1v1']

  const handleCopyCode = () => {
    playClickSound()
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareLink = () => {
    playClickSound()
    const url = `${window.location.origin}${window.location.pathname}?game=tank&room=${roomCode}`
    if (navigator.share) {
      navigator.share({
        title: 'Join my Tank Arena Battle!',
        text: `Join my ${mode.toUpperCase()} Tank Arena game with code: ${roomCode}`,
        url,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Inside Room Lobby
  const myPlayer = players.find(
    (p) => (myPeerId && p.peerId === myPeerId) || p.slotId === mySlotId
  )
  const isMyReady = myPlayer ? !!myPlayer.isReady : false

  const blueSlots = currentModeConfig.slots.filter((s) => s.team === 'blue')
  const redSlots = currentModeConfig.slots.filter((s) => s.team === 'red')

  const totalRequired = currentModeConfig.maxPlayers
  const filledCount = players.length
  const blueCount = players.filter((p) => p.team === 'blue').length
  const redCount = players.filter((p) => p.team === 'red').length
  const hasBothTeams = blueCount >= 1 && redCount >= 1
  const readyCount = players.filter((p) => p.isReady).length
  const allReady = filledCount >= 2 && hasBothTeams && readyCount === filledCount

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 flex flex-col items-center justify-center select-none animate-fadeIn">
      {/* Room Header Card */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚜</span>
              <h2 className="text-lg font-black text-white tracking-tight">
                {currentModeConfig.label} Lobby
              </h2>
            </div>
            <p className="text-[11px] text-zinc-400">
              {filledCount} of {totalRequired} Commanders Connected
            </p>
          </div>

          {/* Room Code Badge */}
          <div className="flex items-center gap-1.5">
            <div className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[9px] block text-zinc-500 uppercase font-bold tracking-wider">
                ROOM CODE
              </span>
              <span className="font-mono font-black text-base tracking-widest text-cyan-400">
                {roomCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Copy Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleShareLink}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Share Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tank Selector Inside Room */}
      <TankSelector selectedTank={selectedTank} onSelectTank={onSelectTank} />

      {/* Team Roster Layout */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Team Blue Column */}
        <div className="bg-zinc-900/80 border border-cyan-500/30 rounded-2xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="font-extrabold text-xs text-cyan-400 uppercase tracking-wider">
                {TEAMS.blue.name}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">West Base</span>
          </div>

          <div className="space-y-2">
            {blueSlots.map((slot) => {
              const occupant = players.find((p) => p.slotId === slot.id)
              const tankCfg = occupant ? (TANK_TYPES[occupant.tankType] || TANK_TYPES[DEFAULT_TANK_TYPE]) : null
              const isMe =
                occupant &&
                ((myPeerId && occupant.peerId === myPeerId) || occupant.slotId === mySlotId)

              return (
                <div
                  key={slot.id}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between ${
                    occupant
                      ? isMe
                        ? 'bg-cyan-950/40 border-cyan-500/60'
                        : 'bg-zinc-950/70 border-zinc-800'
                      : 'bg-zinc-950/30 border-dashed border-zinc-800/80 hover:border-cyan-500/40 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!occupant) {
                      playClickSound()
                      onSelectSlot(slot.id)
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm ${
                        occupant
                          ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {occupant && tankCfg ? tankCfg.icon : '🚜'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{occupant ? occupant.name : 'Open Slot'}</span>
                        {isMe && (
                          <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-semibold">
                            YOU
                          </span>
                        )}
                        {occupant?.isHost && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-semibold">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-zinc-500">{slot.label}</span>
                        {occupant && tankCfg && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black border uppercase ${tankCfg.badgeColor}`}>
                            {tankCfg.icon} {tankCfg.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {occupant ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        occupant.isReady
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {occupant.isReady ? 'READY' : 'WAITING'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound()
                        onSelectSlot(slot.id)
                      }}
                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 transition cursor-pointer"
                    >
                      Join Blue
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Team Red Column */}
        <div className="bg-zinc-900/80 border border-rose-500/30 rounded-2xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-rose-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <span className="font-extrabold text-xs text-rose-400 uppercase tracking-wider">
                {TEAMS.red.name}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">East Base</span>
          </div>

          <div className="space-y-2">
            {redSlots.map((slot) => {
              const occupant = players.find((p) => p.slotId === slot.id)
              const tankCfg = occupant ? (TANK_TYPES[occupant.tankType] || TANK_TYPES[DEFAULT_TANK_TYPE]) : null
              const isMe =
                occupant &&
                ((myPeerId && occupant.peerId === myPeerId) || occupant.slotId === mySlotId)

              return (
                <div
                  key={slot.id}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between ${
                    occupant
                      ? isMe
                        ? 'bg-rose-950/40 border-rose-500/60'
                        : 'bg-zinc-950/70 border-zinc-800'
                      : 'bg-zinc-950/30 border-dashed border-zinc-800/80 hover:border-rose-500/40 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!occupant) {
                      playClickSound()
                      onSelectSlot(slot.id)
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm ${
                        occupant
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {occupant && tankCfg ? tankCfg.icon : '🚜'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{occupant ? occupant.name : 'Open Slot'}</span>
                        {isMe && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-semibold">
                            YOU
                          </span>
                        )}
                        {occupant?.isHost && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-semibold">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-zinc-500 block">{slot.label}</span>
                        {occupant && tankCfg && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black border uppercase ${tankCfg.badgeColor}`}>
                            {tankCfg.icon} {tankCfg.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {occupant ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        occupant.isReady
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {occupant.isReady ? 'READY' : 'WAITING'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound()
                        onSelectSlot(slot.id)
                      }}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      Join Red
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Status & Match Launch Controls */}
      <div className="w-full space-y-2.5">
        {/* Waiting Status Helper */}
        {(!hasBothTeams || filledCount < 2) && (
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center space-y-1">
            <p className="text-xs text-amber-400 font-bold">
              {!hasBothTeams && filledCount >= 2
                ? 'Both Blue and Red bases require at least 1 commander to start battle!'
                : `Waiting for commander${totalRequired - filledCount > 1 ? 's' : ''} to join...`}
            </p>
            <p className="text-[11px] text-zinc-400">
              Share room code <strong className="font-mono text-cyan-400 font-bold">{roomCode}</strong> or click Share Link above to invite!
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Ready Toggle */}
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onToggleReady()
            }}
            className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              isMyReady
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{isMyReady ? 'Ready for Battle!' : 'Set as Ready'}</span>
          </button>

          {/* Host Action Buttons / Client Status */}
          {isHost ? (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onStartGame()
              }}
              disabled={!allReady}
              className={`flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                allReady
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white shadow-lg shadow-emerald-900/40 cursor-pointer animate-pulse'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {allReady
                  ? 'START BATTLE!'
                  : filledCount < 2
                  ? `WAITING FOR PLAYERS (${filledCount}/2)`
                  : !hasBothTeams
                  ? 'NEED BOTH BLUE & RED PLAYERS'
                  : `WAITING FOR READY (${readyCount}/${filledCount})`}
              </span>
            </button>
          ) : (
            <div className="flex-1 py-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-center flex items-center justify-center">
              <span className="text-xs font-semibold text-zinc-400">
                {allReady
                  ? 'Host is ready to start battle...'
                  : `Waiting for commanders to ready up (${readyCount}/${filledCount})...`}
              </span>
            </div>
          )}
        </div>

        {/* Leave Room Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound()
            onLeaveRoom()
          }}
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  )
}

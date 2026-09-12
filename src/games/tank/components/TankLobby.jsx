import React, { useState } from 'react'
import {
  Users,
  Swords,
  Copy,
  Check,
  Play,
  ArrowLeft,
  Share2,
  Sparkles,
} from 'lucide-react'
import { MODES, TEAMS, TANK_TYPES, DEFAULT_TANK_TYPE } from '../constants/tankConstants'
import { playClickSound } from '../../../utils/sound'

export default function TankLobby({
  mode,
  onSelectMode,
  roomCode,
  inputCode,
  onChangeInputCode,
  playerName,
  onChangePlayerName,
  isHost,
  connectionStatus,
  players, // array of { id, name, peerId, slotId, team, isReady, isHost, tankType }
  mySlotId,
  myPeerId,
  selectedTank = DEFAULT_TANK_TYPE,
  onSelectTank,
  onSelectSlot,
  onToggleReady,
  onStartGame,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onBackToMenu,
  error,
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

  const renderTankSelector = () => (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
            <span className="text-base">🚜</span>
            <span>Choose Your Battle Tank</span>
          </label>
          <span className="text-[11px] text-zinc-400">
            All commanders can select any tank class. Same-tank squads are allowed!
          </span>
        </div>
        {selectedTank && TANK_TYPES[selectedTank] && (
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${TANK_TYPES[selectedTank].badgeColor}`}>
            {TANK_TYPES[selectedTank].icon} {TANK_TYPES[selectedTank].name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {Object.values(TANK_TYPES).map((tank) => {
          const isSelected = selectedTank === tank.id
          return (
            <button
              key={tank.id}
              type="button"
              onClick={() => {
                playClickSound()
                onSelectTank?.(tank.id)
              }}
              className={`p-3 rounded-xl border flex flex-col text-left transition relative cursor-pointer ${
                isSelected
                  ? `bg-zinc-800/90 ${tank.borderColor} ring-2 ring-cyan-500/70 shadow-lg shadow-cyan-500/10`
                  : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xl">{tank.icon}</span>
                <div>
                  <span className={`font-black text-sm block leading-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                    {tank.name}
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase font-semibold">
                    {tank.role}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-zinc-400 leading-tight mb-2.5 line-clamp-2">
                {tank.description}
              </p>

              {/* Quick Stat Bars */}
              <div className="space-y-1 mt-auto pt-2 border-t border-zinc-800/60 text-[9px] font-bold">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Armor ({tank.maxHp} HP):</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-1.5 rounded-xs ${
                          i < tank.stats.hp
                            ? tank.stats.hp === 4
                              ? 'bg-orange-400'
                              : tank.stats.hp === 2
                              ? 'bg-rose-400'
                              : 'bg-amber-400'
                            : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>Speed:</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-1.5 rounded-xs ${
                          i < tank.stats.speed ? 'bg-cyan-400' : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>Fire Rate:</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-1.5 rounded-xs ${
                          i < tank.stats.fireRate ? 'bg-emerald-400' : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>Velocity:</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-1.5 rounded-xs ${
                          i < tank.stats.range ? 'bg-purple-400' : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // Not yet in a room (Landing / Setup screen)
  if (!roomCode || connectionStatus === 'disconnected' || connectionStatus === 'idle') {
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
        {renderTankSelector()}

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
      {renderTankSelector()}

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

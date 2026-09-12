import React, { useState } from 'react'
import { Users, ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react'
import { playClickSound } from '../../../../utils/sound'

const AVATARS = [
  '😎', '🦊', '🐼', '🐯', '🚀', '⚡', '🌟', '🦄',
  '👑', '🔥', '👾', '🐱', '🐶', '🍕', '🦁', '⭐'
]

/**
 * Before a room exists: pick a name and avatar, then host or join.
 *
 * Owns its own form state -- name, avatar, room code, tab, capacity and the
 * stacking house rule are all read by this screen alone.
 */
export default function UnoJoinCreate({
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  onBackToMenu,
  onBackToModeSelect,
  roomState,
}) {
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uno_player_name') || 'Player 1'
    }
    return 'Player 1'
  })
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uno_player_avatar') || AVATARS[0]
    }
    return AVATARS[0]
  })
  const [inputRoomCode, setInputRoomCode] = useState(() => {
    if (initialRoomCode) return initialRoomCode
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('uno_last_room') || ''
    }
    return ''
  })
  const [tab, setTab] = useState(() => {
    if (initialRoomCode || (typeof window !== 'undefined' && sessionStorage.getItem('uno_last_room'))) {
      return 'join'
    }
    return 'create'
  })
  const [enableStacking, setEnableStacking] = useState(true)

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    playClickSound()
    const name = playerName.trim() || 'Host'
    try {
      localStorage.setItem('uno_player_name', name)
      localStorage.setItem('uno_player_avatar', selectedAvatar)
    } catch {
      // ignore
    }
    onCreateRoom({ name, avatar: selectedAvatar, maxPlayers, enableStacking })
  }

  const handleJoinSubmit = (e) => {
    e.preventDefault()
    const code = inputRoomCode.trim().toUpperCase()
    if (!code) return
    const name = playerName.trim()
    if (!name) return
    playClickSound()
    try {
      localStorage.setItem('uno_player_name', name)
      localStorage.setItem('uno_player_avatar', selectedAvatar)
      sessionStorage.setItem('uno_last_room', code)
    } catch {
      // ignore
    }
    onJoinRoom({ name, avatar: selectedAvatar, roomCode: code })
  }

  return (
    <div className="w-full max-w-md mx-auto px-5 py-4 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn">
      {/* Header */}
      <div className="pt-2 pb-4 text-center relative">
        <button
          type="button"
          onClick={() => {
            playClickSound()
            onBackToModeSelect()
          }}
          className="absolute left-0 top-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Modes</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Online Party</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          UNO Multiplayer
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Play live with friends on their own devices
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl mb-5">
        <button
          type="button"
          onClick={() => {
            playClickSound()
            setTab('create')
          }}
          className={`py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
            tab === 'create'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Create Room
        </button>
        <button
          type="button"
          onClick={() => {
            playClickSound()
            setTab('join')
          }}
          className={`py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
            tab === 'join'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Join Room
        </button>
      </div>

      {/* Error alert */}
      {roomState?.error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{roomState.error}</span>
        </div>
      )}

      {/* Form Formats */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Player Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={12}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-red-500 transition"
              placeholder="Enter your name"
            />
          </div>

          {/* Avatar Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Choose Avatar
            </label>
            <div className="flex items-center justify-between gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setSelectedAvatar(av)
                  }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition active:scale-95 cursor-pointer ${
                    selectedAvatar === av
                      ? 'bg-red-600/30 border border-red-500 scale-110 shadow-sm'
                      : 'hover:bg-zinc-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Join Room Code Input */}
          {tab === 'join' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                4-Digit Room Code
              </label>
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white text-center font-mono text-2xl font-bold tracking-widest uppercase focus:outline-none focus:border-red-500 transition"
                placeholder="e.g. 7X49"
              />
            </div>
          )}

          {tab === 'create' && (
            <>
              {/* Player Capacity Selector */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Max Players</span>
                  </div>
                  <span className="text-xs font-black text-amber-400 font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                    {maxPlayers} Players
                  </span>
                </div>

                {/* Number of players pills (2 to 10) */}
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-1 sm:gap-1.5 pt-0.5">
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setMaxPlayers(num)
                      }}
                      className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                        maxPlayers === num
                          ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 scale-105'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-0.5">
                  <span>Standard Party: 2 to 10</span>
                  {maxPlayers >= 6 && (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <span>🃏</span>
                      <span>216-Card Double Deck</span>
                    </span>
                  )}
                </div>
              </div>

              {/* House Rules: Card Stacking Toggle */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-sm">
                    🔥
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">
                      Card Stacking (+2 / +4)
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Counter a +2 with another +2, or +4 with +4
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setEnableStacking(!enableStacking)
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enableStacking ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 left-0.5 ${
                      enableStacking ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400 space-y-1">
                <span className="font-bold text-white block">Host Privileges:</span>
                <p>
                  A unique 4-character room code and direct invite link will be generated for you to share with your friends.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="space-y-2 pt-6">
          {tab === 'create' ? (
            <button
              onClick={handleCreateSubmit}
              disabled={roomState?.isConnecting}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 hover:brightness-110 active:brightness-95 text-white shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{roomState?.isConnecting ? 'Creating Room...' : 'Create Room & Get Code'}</span>
            </button>
          ) : (
            <button
              onClick={handleJoinSubmit}
              disabled={!inputRoomCode.trim() || !playerName.trim() || roomState?.isConnecting}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-white hover:bg-zinc-200 text-zinc-950 shadow-lg active:scale-95 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Users className="w-4 h-4" />
              <span>{roomState?.isConnecting ? 'Connecting to Room...' : 'Join Game Room'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound()
              onBackToMenu()
            }}
            className="w-full py-2 text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
          >
            ← Back to All Games
          </button>
        </div>
      </div>
    </div>
  )
}

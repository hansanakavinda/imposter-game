import React, { useState } from 'react'
import {
  Users,
  Copy,
  Check,
  Play,
  ArrowLeft,
  Share2,
  Crown,
  Wifi,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { playClickSound } from '../../../utils/sound'

const AVATARS = [
  '😎', '🦊', '🐼', '🐯', '🚀', '⚡', '🌟', '🦄',
  '👑', '🔥', '👾', '🐱', '🐶', '🍕', '🦁', '⭐'
]

export default function UnoMultiplayerLobby({
  initialRoomCode = '',
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
  onBackToMenu,
  onBackToModeSelect,
  roomState, // { isInRoom, isHost, roomCode, players, maxPlayers, isConnecting, error }
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
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyCode = () => {
    if (!roomState?.roomCode) return
    navigator.clipboard.writeText(roomState.roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLink = () => {
    if (!roomState?.roomCode) return
    const url = `${window.location.origin}${window.location.pathname}?game=uno&room=${roomState.roomCode}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

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
    onCreateRoom({
      name,
      avatar: selectedAvatar,
      maxPlayers,
      enableStacking,
    })
  }

  const handleJoinSubmit = (e) => {
    e.preventDefault()
    const code = inputRoomCode.trim().toUpperCase()
    if (!code) return
    playClickSound()
    const name = playerName.trim() || 'Player'
    try {
      localStorage.setItem('uno_player_name', name)
      localStorage.setItem('uno_player_avatar', selectedAvatar)
      sessionStorage.setItem('uno_last_room', code)
    } catch {
      // ignore
    }
    onJoinRoom({
      name,
      avatar: selectedAvatar,
      roomCode: code,
    })
  }

  // Waiting room view when already connected to a room
  if (roomState?.isInRoom) {
    const isHost = roomState.isHost
    const players = roomState.players || []
    const canStart = isHost && players.length >= 2

    return (
      <div className="w-full max-w-md mx-auto px-5 py-4 flex flex-col justify-between min-h-[80vh] select-none animate-fadeIn">
        {/* Header */}
        <div className="pt-2 pb-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 mb-2">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>Room Lobby</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Waiting for Players
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Share the code or link with friends to join
          </p>
        </div>

        {/* Room Code Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 text-center space-y-4 shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Room Code
            </span>
            <div className="text-4xl font-black tracking-widest text-amber-400 font-mono select-all">
              {roomState.roomCode}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleCopyCode}
              type="button"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Code</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyLink}
              type="button"
              className="px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
          </div>

          {/* Room Rule Pill */}
          <div className="flex items-center justify-center pt-1">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                roomState.stackingEnabled !== false
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              <span>{roomState.stackingEnabled !== false ? '🔥' : '🚫'}</span>
              <span>
                {roomState.stackingEnabled !== false
                  ? 'Card Stacking (+2 / +4) ON'
                  : 'Card Stacking OFF'}
              </span>
            </span>
          </div>
        </div>

        {/* Joined Players List */}
        <div className="space-y-3 my-3">
          <div className="flex items-center justify-between px-1 text-xs font-semibold text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>Joined Players ({players.length}/{roomState.maxPlayers || 4})</span>
            </div>
            {players.length < 2 && (
              <span className="text-amber-400/90 text-[11px]">
                Need ≥ 2 to play
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-56 sm:max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {players.map((p, idx) => (
              <div
                key={p.id || idx}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.avatar || '😎'}</span>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.isHost && (
                        <Crown className="w-3.5 h-3.5 text-amber-400" title="Host" />
                      )}
                      {p.isYou && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready
                    </span>
                  </div>
                </div>

                <span className="text-xs text-zinc-400 font-medium">
                  {p.isHost ? 'Host' : 'Player'}
                </span>
              </div>
            ))}

            {/* Empty slots placeholders */}
            {(() => {
              const maxCap = roomState.maxPlayers || 4
              const emptySlots = Math.max(0, maxCap - players.length)
              if (emptySlots === 0) return null
              if (emptySlots <= 3) {
                return Array.from({ length: emptySlots }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border border-dashed border-zinc-800/80 rounded-2xl p-2.5 flex items-center justify-center text-xs text-zinc-500"
                  >
                    <span>Waiting for friend to join...</span>
                  </div>
                ))
              }
              return (
                <div className="border border-dashed border-zinc-800/80 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Waiting for up to {emptySlots} more players to join...</span>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-2">
          {isHost ? (
            <button
              onClick={() => {
                playClickSound()
                onStartGame()
              }}
              disabled={!canStart}
              className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition ${
                canStart
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 hover:brightness-110 active:scale-95 text-white cursor-pointer shadow-red-950/40'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{canStart ? 'Start Game' : 'Waiting for more players...'}</span>
            </button>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Waiting for host to start the game...</span>
            </div>
          )}

          <button
            onClick={() => {
              playClickSound()
              onLeaveRoom()
            }}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </div>
    )
  }

  // Setup view (Create Room or Join Room)
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
              disabled={!inputRoomCode.trim() || roomState?.isConnecting}
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

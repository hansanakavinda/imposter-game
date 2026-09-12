import React from 'react'
import { Users, Copy, Check, Play, Share2, Crown, Wifi } from 'lucide-react'
import { playClickSound } from '../../../../utils/sound'
import useCopyFeedback from '../../../../hooks/useCopyFeedback'
import { buildRoomLink } from '../../../../services/peerConfig'

/** The waiting room, once you are connected and before the host deals. */
export default function UnoRoomWaiting({ roomState, onStartGame, onLeaveRoom }) {
  const isHost = roomState.isHost
  const players = roomState.players || []
  const canStart = isHost && players.length >= 2

  const { copied, copy: copyCode } = useCopyFeedback()
  const { copied: copiedLink, copy: copyLink } = useCopyFeedback()

  const handleCopyCode = () => copyCode(roomState?.roomCode)
  const handleCopyLink = () => {
    if (!roomState?.roomCode) return
    copyLink(buildRoomLink('uno', roomState.roomCode))
  }

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

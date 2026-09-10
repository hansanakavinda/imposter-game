import React, { useState } from 'react'
import {
  X,
  Settings,
  RotateCw,
  BookOpen,
  Users,
  LogOut,
  Play,
  Copy,
  Check,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { playClickSound } from '../../../utils/sound'

export default function UnoSettingsModal({
  isOpen,
  onClose,
  isMultiplayer = false,
  isHost = false,
  roomCode = '',
  onSyncState,
  onOpenRules,
  onReturnToLobby,
  onLeaveGame,
  connectionStatus = 'connected',
  onReconnect,
}) {
  const [confirmAction, setConfirmAction] = useState(null) // null | 'lobby' | 'exit'
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    playClickSound()
    setConfirmAction(null)
    setSyncFeedback('')
    onClose()
  }

  const handleCopyRoomCode = () => {
    if (!roomCode) return
    navigator.clipboard.writeText(roomCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleTriggerSync = () => {
    playClickSound()
    if (!onSyncState || isSyncing) return
    setIsSyncing(true)
    setSyncFeedback('Syncing with host...')
    onSyncState()
    setTimeout(() => {
      setIsSyncing(false)
      setSyncFeedback('✓ Game state synchronized!')
      setTimeout(() => setSyncFeedback(''), 2500)
    }, 600)
  }

  const handleConfirmLobby = () => {
    playClickSound()
    setConfirmAction(null)
    onReturnToLobby()
    onClose()
  }

  const handleConfirmExit = () => {
    playClickSound()
    setConfirmAction(null)
    onLeaveGame()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Game Menu</h3>
              <p className="text-[10px] text-zinc-400">Manage match, sync, or exit</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmation Screen for Leaving or Returning to Lobby */}
        {confirmAction ? (
          <div className="py-2 space-y-4 animate-fadeIn">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-white text-xs">
                  {confirmAction === 'lobby'
                    ? isHost && isMultiplayer
                      ? 'Return All Players to Room Lobby?'
                      : 'Return to Lobby?'
                    : 'Leave Match Entirely?'}
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {confirmAction === 'lobby'
                    ? isHost && isMultiplayer
                      ? 'This will end the active game and return all players to the room lobby with the same code.'
                      : 'You will leave the current match and return to the waiting lobby.'
                    : isHost && isMultiplayer
                    ? 'Leaving as host will close the room and disconnect all players.'
                    : 'Your match progress will be lost and you will exit back to the main menu.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmAction === 'lobby' ? handleConfirmLobby : handleConfirmExit}
                className={`py-2.5 rounded-xl text-white text-xs font-bold transition cursor-pointer shadow-lg ${
                  confirmAction === 'lobby'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                }`}
              >
                {confirmAction === 'lobby' ? 'Yes, To Lobby' : 'Yes, Leave'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Match Status Card */}
            {isMultiplayer ? (
              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Room Code
                  </span>
                  <div className="text-lg font-black tracking-wider text-amber-400 font-mono">
                    {roomCode || '----'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                      isHost || connectionStatus === 'connected'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : connectionStatus === 'reconnecting'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {isHost ? (
                      <>
                        <Wifi className="w-3 h-3 text-emerald-400" />
                        <span>Hosting Room</span>
                      </>
                    ) : connectionStatus === 'connected' ? (
                      <>
                        <Wifi className="w-3 h-3 text-emerald-400" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-rose-400" />
                        <span>{connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
                    title="Copy Room Code"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-white block">Solo vs AI</span>
                  <span className="text-[10px] text-zinc-400">Playing with Bots</span>
                </div>
                <span className="text-xl">🤖</span>
              </div>
            )}

            {/* Reconnect Option if disconnected (Clients only) */}
            {isMultiplayer && !isHost && connectionStatus === 'disconnected' && onReconnect && (
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  onReconnect()
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/50 text-red-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reconnect to Host Now</span>
              </button>
            )}

            {/* Actions Menu */}
            <div className="space-y-1.5 pt-1">
              {/* 1. Sync State (Multiplayer only) */}
              {isMultiplayer && (
                <div>
                  <button
                    type="button"
                    onClick={handleTriggerSync}
                    disabled={isSyncing}
                    className="w-full p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                        <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                          Refresh & Sync State
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Resynchronize turn, top card, and hand with host
                        </div>
                      </div>
                    </div>
                  </button>
                  {syncFeedback && (
                    <div className="text-[10px] font-bold text-emerald-400 text-center pt-1 animate-fadeIn">
                      {syncFeedback}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Official Rules */}
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  onClose()
                  if (onOpenRules) onOpenRules()
                }}
                className="w-full p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-left flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                      UNO Rules & Actions
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      View card powers, penalties & stacking mechanics
                    </div>
                  </div>
                </div>
              </button>

              {/* 3. Return to Lobby */}
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  setConfirmAction('lobby')
                }}
                className="w-full p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-left flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                      {isMultiplayer && isHost ? 'Return All to Room Lobby' : 'Return to Lobby'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {isMultiplayer
                        ? 'Keep room code and re-configure lobby'
                        : 'Return to bot player setup'}
                    </div>
                  </div>
                </div>
              </button>

              {/* 4. Exit to Main Menu */}
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  setConfirmAction('exit')
                }}
                className="w-full p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 text-left flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 transition">
                      Exit Match
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Leave game and return to mode select
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Resume Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Resume Game</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

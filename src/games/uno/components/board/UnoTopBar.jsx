import React from 'react'
import { RotateCw, RotateCcw, Settings } from 'lucide-react'
import { playClickSound } from '../../../../utils/sound'

/** Room and mode info, the turn-direction pill, and the sync/menu actions. */
export default function UnoTopBar({
  isMultiplayer,
  isHost,
  roomCode,
  connectionStatus,
  direction,
  onSyncState,
  isSyncing,
  onSync,
  onOpenMenu,
}) {
  return (
    <div className="flex items-center justify-between px-1 mb-2 max-w-lg mx-auto text-xs">
      {/* Room / Mode Info */}
      <div className="flex items-center gap-2">
        {isMultiplayer && roomCode ? (
          <span className="px-2.5 py-1 rounded-xl bg-felt border border-edge text-micro font-mono font-bold text-amber-400 flex items-center gap-1.5 shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isHost || connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span>Room {roomCode}</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-xl bg-felt border border-edge text-micro font-bold text-ink-muted flex items-center gap-1 shadow-sm">
            <span>🤖</span>
            <span>Solo vs Bots</span>
          </span>
        )}
      </div>

      {/* Central Turn Direction Pill (Single Source of Truth) */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-bold border shadow-sm transition-colors ${
          direction === 1
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        }`}
        title={`Direction: ${direction === 1 ? 'Clockwise' : 'Counter-Clockwise'}`}
      >
        {direction === 1 ? (
          <>
            <RotateCw className="w-3 h-3 text-blue-400 animate-spin-slow" />
            <span>Clockwise</span>
          </>
        ) : (
          <>
            <RotateCcw className="w-3 h-3 text-purple-400 animate-spin-slow" />
            <span>Counter-Clockwise</span>
          </>
        )}
      </div>

      {/* Top Actions: Quick State Sync & Settings Menu */}
      <div className="flex items-center gap-1.5">
        {isMultiplayer && onSyncState && (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            title="Sync game state with host"
            className="px-2.5 py-1 rounded-xl bg-felt hover:bg-felt-high border border-edge text-ink hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${
                isSyncing ? 'animate-spin text-amber-400' : 'text-blue-400'
              }`}
            />
            <span className="hidden sm:inline">Sync</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            playClickSound()
            onOpenMenu()
          }}
          title="Game settings, rules, and exit options"
          className="px-2.5 py-1 rounded-xl bg-felt hover:bg-felt-high border border-edge text-ink hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
        >
          <Settings className="w-3.5 h-3.5 text-ink-muted" />
          <span>Menu</span>
        </button>
      </div>
    </div>
  )
}

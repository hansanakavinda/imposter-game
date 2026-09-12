import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { playClickSound } from '../../../../utils/sound'

/** Shown to a client whose connection dropped mid-match. */
export default function UnoDisconnectBanner({ onReconnect, onOpenMenu }) {
  return (
    <div className="mb-2.5 p-2.5 rounded-2xl bg-red-950/90 border border-red-500/60 text-red-200 text-xs flex items-center justify-between shadow-lg shadow-red-950/60 max-w-lg mx-auto animate-pulse">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <div>
          <div className="font-bold text-white text-xs leading-tight">Connection Lost</div>
          <div className="text-[10px] text-red-300">Your hand and seat are preserved</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {onReconnect && (
          <button
            type="button"
            onClick={() => {
              playClickSound()
              onReconnect()
            }}
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-sm"
          >
            Reconnect
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            playClickSound()
            onOpenMenu()
          }}
          className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition cursor-pointer"
        >
          Menu
        </button>
      </div>
    </div>
  )
}

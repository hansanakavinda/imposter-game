import React from 'react'
import { RotateCcw, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { playClickSound } from '../../../../utils/sound'

/** Sort controls and the scroll arrows above the hand. */
export default function UnoHandToolbar({ handCards, handSortMode, setHandSortMode, scrollTray }) {
  return (
    <div className="flex items-center justify-between px-1 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
          <ArrowUpDown className="w-3 h-3 text-zinc-400" />
          <span className="hidden sm:inline">Sort:</span>
        </span>

        <div className="inline-flex p-0.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => {
              playClickSound()
              setHandSortMode((prev) => (prev === 'color' ? 'none' : 'color'))
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              handSortMode === 'color'
                ? 'bg-gradient-to-r from-red-600/30 via-amber-500/20 to-blue-600/30 text-white border border-white/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Group cards by Color (Red, Yellow, Green, Blue, Wild)"
          >
            <span>🎨</span>
            <span>By Color</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound()
              setHandSortMode((prev) => (prev === 'number' ? 'none' : 'number'))
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              handSortMode === 'number'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Group cards by Number / Face Value (0-9, Actions, Wilds)"
          >
            <span>🔢</span>
            <span>By Number</span>
          </button>

          {handSortMode !== 'none' && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                setHandSortMode('none')
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer flex items-center gap-0.5"
              title="Reset to default draw order"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick scroll arrows for wide hand */}
      {handCards.length > 4 && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-400 hidden sm:inline">Scroll:</span>
          <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => scrollTray(-180)}
              aria-label="Scroll cards left"
              title="Scroll left"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded active:scale-90 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollTray(180)}
              aria-label="Scroll cards right"
              title="Scroll right"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded active:scale-90 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { COLOR_CONFIG, PLAYABLE_COLORS } from '../constants/unoConstants'
import { playClickSound } from '../../../utils/sound'

export default function ColorPickerModal({ isOpen, onSelectColor }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xs bg-zinc-900 border border-zinc-700/80 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-scaleUp">
        <div className="space-y-1">
          <span className="text-2xl select-none">🎨</span>
          <h3 className="text-xl font-black tracking-tight text-white">
            Choose Color
          </h3>
          <p className="text-xs text-zinc-400">
            Pick the color for the next round of play
          </p>
        </div>

        {/* 2x2 Grid of Uno Colors */}
        <div className="grid grid-cols-2 gap-3">
          {PLAYABLE_COLORS.map((color) => {
            const config = COLOR_CONFIG[color]
            return (
              <button
                key={color}
                type="button"
                onClick={() => {
                  playClickSound()
                  onSelectColor(color)
                }}
                className={`py-6 rounded-2xl font-black text-white text-lg shadow-lg border-2 border-white/20 transition duration-200 transform hover:scale-105 active:scale-95 cursor-pointer ${config.bg} hover:border-white/80`}
              >
                {config.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

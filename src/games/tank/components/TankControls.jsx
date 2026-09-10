import React from 'react'
import {
  Crosshair,
  Radio,
  Shield,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { playClickSound } from '../../../utils/sound'
import { WEAPON_TYPES } from '../constants/tankConstants'

export default function TankControls({
  onInputChange,
  onFire,
  onPing,
  activeWeapon = 'STANDARD',
  hasShield = false,
  isAlive = true,
  is2v2 = false,
}) {
  const currentWeapon = WEAPON_TYPES[activeWeapon] || WEAPON_TYPES.STANDARD

  // Touch handlers for mobile D-pad / Drive buttons
  const handleTouchStart = (key) => {
    onInputChange({ [key]: true })
  }

  const handleTouchEnd = (key) => {
    onInputChange({ [key]: false })
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-3 px-2 flex flex-col gap-2 select-none">
      {/* Weapon & State Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-zinc-400">Weapon:</span>
            <span
              className="px-2 py-0.5 rounded-md font-extrabold uppercase text-[11px]"
              style={{ backgroundColor: `${currentWeapon.color}25`, color: currentWeapon.color }}
            >
              {currentWeapon.name}
            </span>
          </div>

          {hasShield && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/40">
              <Shield className="w-3 h-3" />
              <span>Shield Active</span>
            </div>
          )}
        </div>

        {/* Desktop Controls Hint */}
        <div className="hidden md:flex items-center gap-4 text-zinc-400 text-[11px]">
          <span><strong className="text-zinc-200">WASD / Arrows:</strong> Drive</span>
          <span><strong className="text-zinc-200">Mouse:</strong> Aim</span>
          <span><strong className="text-zinc-200">Click / Space:</strong> Fire</span>
          {is2v2 && <span><strong className="text-zinc-200">Right-Click / E:</strong> Team Ping</span>}
        </div>
      </div>

      {/* Mobile On-Screen Touch Controls (Visible primarily on touch screens / small viewports) */}
      <div className="flex md:hidden items-center justify-between w-full px-2 py-1 touch-none">
        {/* Left Side: Directional D-Pad for Tank Driving */}
        <div className="grid grid-cols-3 gap-1.5 w-32 h-32 items-center justify-center">
          <div />
          <button
            type="button"
            onTouchStart={() => handleTouchStart('forward')}
            onTouchEnd={() => handleTouchEnd('forward')}
            onMouseDown={() => handleTouchStart('forward')}
            onMouseUp={() => handleTouchEnd('forward')}
            className="w-10 h-10 rounded-xl bg-zinc-800/90 active:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-200 shadow-md touch-none"
            aria-label="Drive Forward"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div />

          <button
            type="button"
            onTouchStart={() => handleTouchStart('steerLeft')}
            onTouchEnd={() => handleTouchEnd('steerLeft')}
            onMouseDown={() => handleTouchStart('steerLeft')}
            onMouseUp={() => handleTouchEnd('steerLeft')}
            className="w-10 h-10 rounded-xl bg-zinc-800/90 active:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-200 shadow-md touch-none"
            aria-label="Steer Left"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onTouchStart={() => handleTouchStart('reverse')}
            onTouchEnd={() => handleTouchEnd('reverse')}
            onMouseDown={() => handleTouchStart('reverse')}
            onMouseUp={() => handleTouchEnd('reverse')}
            className="w-10 h-10 rounded-xl bg-zinc-800/90 active:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-200 shadow-md touch-none"
            aria-label="Reverse"
          >
            <ArrowDown className="w-5 h-5" />
          </button>

          <button
            type="button"
            onTouchStart={() => handleTouchStart('steerRight')}
            onTouchEnd={() => handleTouchEnd('steerRight')}
            onMouseDown={() => handleTouchStart('steerRight')}
            onMouseUp={() => handleTouchEnd('steerRight')}
            className="w-10 h-10 rounded-xl bg-zinc-800/90 active:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-200 shadow-md touch-none"
            aria-label="Steer Right"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right Side: Fire Cannon & Ping Action Buttons */}
        <div className="flex items-center gap-3">
          {is2v2 && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onPing()
              }}
              className="w-12 h-12 rounded-2xl bg-zinc-800/90 active:bg-zinc-700 border border-zinc-700 flex flex-col items-center justify-center text-cyan-400 shadow-lg active:scale-95 transition"
              aria-label="Radar Ping"
            >
              <Radio className="w-5 h-5" />
              <span className="text-[9px] font-bold">PING</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onFire()}
            disabled={!isAlive}
            className={`w-20 h-20 rounded-2xl font-black text-xs tracking-wider flex flex-col items-center justify-center gap-1 shadow-xl active:scale-90 transition cursor-pointer border ${
              isAlive
                ? 'bg-gradient-to-br from-rose-600 to-amber-600 border-amber-400 text-white shadow-rose-900/50'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 opacity-50'
            }`}
            aria-label="Fire Cannon"
          >
            <Crosshair className="w-7 h-7" />
            <span>FIRE</span>
          </button>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import {
  Radio,
  Shield,
  RotateCcw,
  Smartphone,
  HelpCircle,
  Volume2,
  VolumeX,
  Heart,
} from 'lucide-react'
import { playClickSound } from '../../../utils/sound'
import { WEAPON_TYPES, TANK_TYPES, DEFAULT_TANK_TYPE } from '../constants/tankConstants'

/**
 * The top status bar: health, tank class, weapon, shield, and the utility
 * buttons. A readout, not a control -- it was only ever in TankControls
 * because it shares that overlay's flex column.
 *
 * It stays mounted from TankControls on purpose. Its position comes from being
 * the first child of that `flex flex-col justify-between` overlay; moving the
 * mount up to TankGame would mean redoing absolute positioning over a canvas in
 * two orientations, which is a UI-pass job, not a split.
 */
export default function TankHudBar({
  hp = 3,
  maxHp = 3,
  tankType = DEFAULT_TANK_TYPE,
  activeWeapon = 'STANDARD',
  hasShield = false,
  is2v2 = false,
  isPortrait = false,
  soundOn = true,
  onPing,
  onToggleOrientation,
  onToggleSound,
  onOpenRules,
  onLeaveGame,
}) {
  const currentWeapon = WEAPON_TYPES[activeWeapon] || WEAPON_TYPES.STANDARD
  const currentTankCfg = TANK_TYPES[tankType] || TANK_TYPES[DEFAULT_TANK_TYPE]

  return (
      <div className="pointer-events-auto z-30 flex items-center justify-between gap-2 px-3 py-2 m-2 rounded-2xl bg-zinc-950/70 backdrop-blur-md border border-zinc-800/60 text-xs shadow-xl">
        <div className="flex items-center gap-2">
          {/* Active Health Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
            <Heart className={`w-3.5 h-3.5 ${hp === 1 ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-rose-400 fill-rose-400'}`} />
            <div className="flex items-center gap-1">
              {Array.from({ length: maxHp }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-2 rounded-xs transition-all duration-300 ${
                    idx < hp
                      ? hp === 1
                        ? 'bg-rose-500 shadow-xs shadow-rose-500/50'
                        : hp === 2
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                      : 'bg-zinc-800 border border-zinc-700/50'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-black text-zinc-300">
              {hp}/{maxHp}
            </span>
          </div>

          {/* Active Tank Class Badge */}
          {currentTankCfg && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-black ${currentTankCfg.badgeColor}`}
              title={currentTankCfg.tagline}
            >
              <span>{currentTankCfg.icon}</span>
              <span className="hidden sm:inline uppercase">{currentTankCfg.name}</span>
            </div>
          )}

          {/* Active Weapon Indicator */}
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-zinc-400 text-[11px] hidden sm:inline">Weapon:</span>
            <span
              className="px-2 py-0.5 rounded-lg font-black uppercase text-[11px] border"
              style={{
                backgroundColor: `${currentWeapon.color}20`,
                borderColor: `${currentWeapon.color}50`,
                color: currentWeapon.color,
              }}
            >
              {currentWeapon.name}
            </span>
          </div>

          {/* Active Shield Indicator */}
          {hasShield && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/40 animate-pulse">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Shield</span>
            </div>
          )}

          {/* 2v2 Radar Ping Action Button (Compact in HUD) */}
          {is2v2 && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onPing?.()
              }}
              className="px-2 py-1 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 flex items-center gap-1 shadow transition active:scale-95 cursor-pointer"
              title="Team Radar Ping"
              aria-label="Radar Ping"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[10px] font-black">PING</span>
            </button>
          )}
        </div>

        {/* Quick Utility Actions */}
        <div className="flex items-center gap-1">
          {onToggleOrientation && (
            <button
              type="button"
              onClick={onToggleOrientation}
              className={`p-1.5 rounded-xl border transition ${
                isPortrait
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-zinc-800/70 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              title={isPortrait ? 'Switch to Landscape' : 'Switch to Vertical Portrait'}
              aria-label="Toggle Arena Orientation"
            >
              <Smartphone className={`w-4 h-4 transition ${isPortrait ? 'rotate-0' : 'rotate-90'}`} />
            </button>
          )}

          {onOpenRules && (
            <button
              type="button"
              onClick={onOpenRules}
              className="p-1.5 rounded-xl bg-zinc-800/70 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition"
              title="Tactical Rules"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className="p-1.5 rounded-xl bg-zinc-800/70 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition"
              title={soundOn ? 'Mute' : 'Unmute'}
              aria-label="Sound Toggle"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>
          )}

          {onLeaveGame && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                if (window.confirm('Leave active battle?')) {
                  onLeaveGame()
                }
              }}
              className="p-1.5 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-800/50 hover:bg-rose-900/60 transition"
              title="Surrender / Leave Battle"
              aria-label="Leave Battle"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
  )
}

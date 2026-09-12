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
import { getHpTier, HP_TIERS } from '../utils/tankHud'

// Tier -> Tailwind. The canvas keeps its own tier->hex mapping; only the
// thresholds are shared.
const HP_TIER_CLASS = {
  [HP_TIERS.OK]: 'bg-ok',
  [HP_TIERS.LOW]: 'bg-turn',
  [HP_TIERS.CRITICAL]: 'bg-danger',
}

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
      <div className="pointer-events-auto z-30 flex items-center justify-between gap-2 px-3 py-2 m-2 rounded-object bg-table/80 backdrop-blur-md border border-edge text-mini shadow-lift-2">
        <div className="flex items-center gap-2">
          {/* Active Health Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-well bg-felt border border-edge">
            <Heart className={`w-3.5 h-3.5 ${getHpTier(hp) === HP_TIERS.CRITICAL ? 'text-danger fill-danger animate-pulse' : 'text-danger/70 fill-danger/70'}`} />
            <div className="flex items-center gap-1">
              {Array.from({ length: maxHp }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-2 rounded-xs transition-all duration-300 ${
                    idx < hp
                      ? HP_TIER_CLASS[getHpTier(hp)]
                      : 'bg-well border border-edge'
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-nano text-ink-muted">
              {hp}/{maxHp}
            </span>
          </div>

          {/* Active Tank Class Badge */}
          {currentTankCfg && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-well border text-micro font-bold ${currentTankCfg.badgeColor}`}
              title={currentTankCfg.tagline}
            >
              <span>{currentTankCfg.icon}</span>
              <span className="hidden sm:inline uppercase">{currentTankCfg.name}</span>
            </div>
          )}

          {/* Active Weapon Indicator */}
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-ink-faint text-micro hidden sm:inline">Weapon</span>
            <span
              className="px-2 py-0.5 rounded-well font-bold uppercase text-micro border"
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
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-well bg-ok/15 text-ok font-bold text-micro border border-ok/40 animate-pulse">
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
              className="px-2 py-1 rounded-well bg-tank/15 hover:bg-tank/25 border border-tank/40 text-tank flex items-center gap-1 transition active:scale-95 cursor-pointer"
              title="Team Radar Ping"
              aria-label="Radar Ping"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-nano font-bold uppercase">Ping</span>
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
                  ? 'bg-tank/15 text-tank border-tank/40'
                  : 'bg-felt text-ink-muted border-edge hover:bg-felt-high'
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
              className="p-1.5 rounded-well bg-felt text-ink-muted border border-edge hover:bg-felt-high hover:text-ink transition"
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
              className="p-1.5 rounded-well bg-felt text-ink-muted border border-edge hover:bg-felt-high hover:text-ink transition"
              title={soundOn ? 'Mute' : 'Unmute'}
              aria-label="Sound Toggle"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-ink-faint" />}
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
              className="p-1.5 rounded-well bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20 transition"
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

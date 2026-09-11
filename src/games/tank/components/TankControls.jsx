import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Crosshair,
  Radio,
  Shield,
  RotateCcw,
  Smartphone,
  HelpCircle,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { playClickSound } from '../../../utils/sound'
import { WEAPON_TYPES } from '../constants/tankConstants'

/**
 * Virtual Joystick Component
 * Provides smooth pointer-based 360-degree dragging with automatic deadzone,
 * pointer capture, and visual feedback.
 */
function VirtualJoystick({
  label,
  size = 130,
  maxDistance = 44,
  deadzone = 8,
  accentColor = 'cyan', // 'cyan' | 'amber'
  isAim = false,
  isPortrait = false,
  onMove,
  onRelease,
  onTap,
  disabled = false,
}) {
  const baseRef = useRef(null)
  const activePointerIdRef = useRef(null)
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })
  const [isActive, setIsActive] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(null)
  const pointerStartRef = useRef({ x: 0, y: 0, time: 0 })
  const lastDispatchedAngleRef = useRef(null)

  // Clean up pointer capture on unmount
  useEffect(() => {
    return () => {
      activePointerIdRef.current = null
    }
  }, [])

  const handlePointerDown = (e) => {
    if (disabled || activePointerIdRef.current !== null) return
    e.preventDefault()
    e.stopPropagation()

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    activePointerIdRef.current = e.pointerId

    const rect = target.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: e.timeStamp || 0,
      centerX,
      centerY,
    }

    setIsActive(true)

    // Calculate initial displacement
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const dist = Math.hypot(dx, dy)

    if (dist >= deadzone) {
      updateJoystick(dx, dy, dist)
    }
  }

  const updateJoystick = useCallback(
    (dx, dy, dist) => {
      const clampedDist = Math.min(maxDistance, dist)
      const angle = Math.atan2(dy, dx)
      const knobX = Math.cos(angle) * clampedDist
      const knobY = Math.sin(angle) * clampedDist

      setKnobOffset({ x: knobX, y: knobY })
      setCurrentAngle(angle)

      // Transform angle to world coordinates:
      // In portrait mode, top of screen is -PI/2 in screen space, which maps to 0 (pointing +x) in world space
      const worldAngle = isPortrait ? angle + Math.PI / 2 : angle
      lastDispatchedAngleRef.current = worldAngle

      if (onMove) {
        const magnitude = Math.min(1, dist / maxDistance)
        onMove({
          screenAngle: angle,
          worldAngle,
          magnitude,
          isDeadzone: dist < deadzone,
        })
      }
    },
    [maxDistance, deadzone, isPortrait, onMove]
  )

  const handlePointerMove = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return
    e.preventDefault()
    e.stopPropagation()

    const { centerX, centerY } = pointerStartRef.current
    const dx = e.clientX - centerX
    const dy = e.clientY - centerY
    const dist = Math.hypot(dx, dy)

    if (dist < deadzone) {
      setKnobOffset({ x: 0, y: 0 })
      setCurrentAngle(null)
      if (onMove) {
        onMove({
          screenAngle: 0,
          worldAngle: 0,
          magnitude: 0,
          isDeadzone: true,
        })
      }
    } else {
      updateJoystick(dx, dy, dist)
    }
  }

  const handlePointerUp = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return
    e.preventDefault()
    e.stopPropagation()

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    const elapsed = (e.timeStamp || 0) - pointerStartRef.current.time
    const { centerX, centerY } = pointerStartRef.current
    const totalDist = Math.hypot(e.clientX - centerX, e.clientY - centerY)

    // Tap detection: short press and small movement
    if (elapsed < 300 && totalDist < deadzone * 2) {
      if (onTap) onTap()
    }

    activePointerIdRef.current = null
    setIsActive(false)
    setKnobOffset({ x: 0, y: 0 })
    setCurrentAngle(null)

    if (onRelease) {
      onRelease({
        lastWorldAngle: lastDispatchedAngleRef.current,
        wasFlick: elapsed < 350 && totalDist >= deadzone * 2,
      })
    }
  }

  const borderClass =
    accentColor === 'amber'
      ? isActive
        ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
        : 'border-amber-500/40'
      : isActive
      ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
      : 'border-cyan-500/40'

  const knobGrad =
    accentColor === 'amber'
      ? 'from-amber-400 to-rose-600 border-amber-300'
      : 'from-cyan-400 to-blue-600 border-cyan-300'

  return (
    <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: size, height: size }}
        className={`relative rounded-full bg-zinc-950/75 backdrop-blur-md border-2 ${borderClass} touch-none flex items-center justify-center transition-shadow cursor-grab active:cursor-grabbing ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        {/* Subtle Cardinal Guides */}
        <div className="absolute inset-2 rounded-full border border-dashed border-zinc-700/40 pointer-events-none" />
        <div className="absolute top-1 w-1 h-2 bg-zinc-700/60 rounded-full" />
        <div className="absolute bottom-1 w-1 h-2 bg-zinc-700/60 rounded-full" />
        <div className="absolute left-1 w-2 h-1 bg-zinc-700/60 rounded-full" />
        <div className="absolute right-1 w-2 h-1 bg-zinc-700/60 rounded-full" />

        {/* Direction Indicator on Outer Rim for Aiming */}
        {isAim && currentAngle !== null && (
          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] pointer-events-none"
            style={{
              transform: `translate(${Math.cos(currentAngle) * (size / 2 - 4)}px, ${
                Math.sin(currentAngle) * (size / 2 - 4)
              }px)`,
            }}
          />
        )}

        {/* Joystick Thumb Knob */}
        <div
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            transition: isActive ? 'none' : 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          className={`w-14 h-14 rounded-full bg-gradient-to-br ${knobGrad} border-2 shadow-lg flex items-center justify-center text-white font-bold pointer-events-none`}
        >
          {isAim ? (
            <Crosshair className="w-6 h-6 text-white drop-shadow-md animate-pulse" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-white/80 shadow-inner" />
          )}
        </div>
      </div>

      <span
        className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
          accentColor === 'amber'
            ? 'text-amber-300 bg-amber-950/50 border border-amber-800/40'
            : 'text-cyan-300 bg-cyan-950/50 border border-cyan-800/40'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

export default function TankControls({
  onInputChange,
  onAimChange,
  onFire,
  onPing,
  activeWeapon = 'STANDARD',
  hasShield = false,
  isAlive = true,
  is2v2 = false,
  isPortrait = false,
  onToggleOrientation,
  onLeaveGame,
  onOpenRules,
  soundOn = true,
  onToggleSound,
}) {
  const currentWeapon = WEAPON_TYPES[activeWeapon] || WEAPON_TYPES.STANDARD
  const fireIntervalRef = useRef(null)
  const isAimActiveRef = useRef(false)
  const onFireRef = useRef(onFire)
  const weaponCooldownRef = useRef(currentWeapon.cooldownMs)

  useEffect(() => {
    onFireRef.current = onFire
    weaponCooldownRef.current = currentWeapon.cooldownMs
  }, [onFire, currentWeapon.cooldownMs])

  // Clear firing interval on unmount
  useEffect(() => {
    return () => {
      if (fireIntervalRef.current) {
        clearInterval(fireIntervalRef.current)
        fireIntervalRef.current = null
      }
    }
  }, [])

  // Continuous auto-fire while aiming
  const startAimFireLoop = useCallback(() => {
    if (fireIntervalRef.current) return
    // Fire immediately once
    onFireRef.current?.()

    fireIntervalRef.current = setInterval(() => {
      if (isAimActiveRef.current) {
        onFireRef.current?.()
      }
    }, Math.max(120, weaponCooldownRef.current))
  }, [])

  const stopAimFireLoop = useCallback(() => {
    if (fireIntervalRef.current) {
      clearInterval(fireIntervalRef.current)
      fireIntervalRef.current = null
    }
  }, [])

  // Left Joystick (Movement) Handler
  const handleMoveJoystick = useCallback(
    ({ worldAngle, magnitude, isDeadzone }) => {
      if (isDeadzone || magnitude <= 0.05) {
        onInputChange({
          isMoving: false,
          moveMagnitude: 0,
          forward: false,
          reverse: false,
          steerLeft: false,
          steerRight: false,
        })
      } else {
        onInputChange({
          isMoving: true,
          moveAngle: worldAngle,
          moveMagnitude: magnitude,
          forward: true,
        })
      }
    },
    [onInputChange]
  )

  const handleMoveRelease = useCallback(() => {
    onInputChange({
      isMoving: false,
      moveMagnitude: 0,
      forward: false,
      reverse: false,
      steerLeft: false,
      steerRight: false,
    })
  }, [onInputChange])

  // Right Joystick (Aim & Shoot) Handlers
  const handleAimMove = useCallback(
    ({ worldAngle, isDeadzone }) => {
      if (isDeadzone) {
        isAimActiveRef.current = false
        stopAimFireLoop()
      } else {
        isAimActiveRef.current = true
        if (onAimChange) {
          onAimChange(worldAngle)
        }
        onInputChange({ turretAngle: worldAngle })
        startAimFireLoop()
      }
    },
    [onAimChange, onInputChange, startAimFireLoop, stopAimFireLoop]
  )

  const handleAimRelease = useCallback(
    ({ lastWorldAngle, wasFlick }) => {
      isAimActiveRef.current = false
      stopAimFireLoop()

      if (wasFlick && lastWorldAngle !== null) {
        if (onAimChange) onAimChange(lastWorldAngle)
        onInputChange({ turretAngle: lastWorldAngle })
        onFireRef.current?.()
      }
    },
    [onAimChange, onInputChange, stopAimFireLoop]
  )

  const handleAimTap = useCallback(() => {
    onFireRef.current?.()
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* Top Tactical HUD Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 text-xs shadow-xl">
        <div className="flex items-center gap-2">
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
        </div>

        {/* Quick Utility Actions (Orientation, Rules, Sound, Leave) */}
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

      {/* Desktop Key Controls Reminder (Hidden on small touch screens) */}
      <div className="hidden lg:flex items-center justify-center gap-5 py-1 text-zinc-400 text-[11px] bg-zinc-950/40 backdrop-blur-sm mx-auto px-4 rounded-xl border border-zinc-800/50">
        <span><strong className="text-zinc-200">WASD / Stick:</strong> Move</span>
        <span><strong className="text-zinc-200">Mouse / Stick:</strong> 360° Aim</span>
        <span><strong className="text-zinc-200">Click / Space:</strong> Fire</span>
        {is2v2 && <span><strong className="text-zinc-200">Right-Click / E:</strong> Team Ping</span>}
      </div>

      {/* Bottom Dual Joysticks & Ping Action Bar */}
      <div className="w-full flex items-end justify-between px-2 sm:px-6 pb-2 sm:pb-6">
        {/* Left: Movement Virtual Joystick */}
        <VirtualJoystick
          label="Drive"
          size={124}
          maxDistance={42}
          deadzone={8}
          accentColor="cyan"
          isPortrait={isPortrait}
          onMove={handleMoveJoystick}
          onRelease={handleMoveRelease}
          disabled={!isAlive}
        />

        {/* Center: 2v2 Radar Ping Action Button (if 2v2) */}
        {is2v2 && (
          <div className="pointer-events-auto mb-1 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onPing()
              }}
              className="w-12 h-12 rounded-2xl bg-cyan-950/75 active:bg-cyan-900 border-2 border-cyan-500/50 text-cyan-300 flex flex-col items-center justify-center shadow-lg active:scale-95 transition"
              aria-label="Radar Ping"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="text-[8px] font-black tracking-wider">PING</span>
            </button>
          </div>
        )}

        {/* Right: Aiming & Shooting Virtual Joystick */}
        <VirtualJoystick
          label="Aim & Fire"
          size={124}
          maxDistance={42}
          deadzone={10}
          accentColor="amber"
          isAim
          isPortrait={isPortrait}
          onMove={handleAimMove}
          onRelease={handleAimRelease}
          onTap={handleAimTap}
          disabled={!isAlive}
        />
      </div>
    </div>
  )
}


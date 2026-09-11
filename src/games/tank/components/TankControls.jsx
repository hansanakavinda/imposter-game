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
  Compass,
  Heart,
} from 'lucide-react'
import { playClickSound } from '../../../utils/sound'
import { WEAPON_TYPES } from '../constants/tankConstants'

export default function TankControls({
  onInputChange,
  onAimChange,
  onFire,
  onPing,
  activeWeapon = 'STANDARD',
  hasShield = false,
  isAlive = true,
  hp = 3,
  maxHp = 3,
  is2v2 = false,
  isPortrait = false,
  onToggleOrientation,
  onLeaveGame,
  onOpenRules,
  soundOn = true,
  onToggleSound,
}) {
  const currentWeapon = WEAPON_TYPES[activeWeapon] || WEAPON_TYPES.STANDARD

  // Ref callbacks to avoid stale closures
  const onFireRef = useRef(onFire)
  const onAimChangeRef = useRef(onAimChange)
  const onInputChangeRef = useRef(onInputChange)
  const weaponCooldownRef = useRef(currentWeapon.cooldownMs)

  useEffect(() => {
    onFireRef.current = onFire
    onAimChangeRef.current = onAimChange
    onInputChangeRef.current = onInputChange
    weaponCooldownRef.current = currentWeapon.cooldownMs
  }, [onFire, onAimChange, onInputChange, currentWeapon.cooldownMs])

  // -------------------------------------------------------------
  // Top Zone: Floating Movement Joystick State & Handlers
  // -------------------------------------------------------------
  const topZoneRef = useRef(null)
  const movePointerIdRef = useRef(null)
  const moveOriginRef = useRef({ x: 0, y: 0 })
  const [moveVisual, setMoveVisual] = useState({
    active: false,
    x: 0,
    y: 0,
    knobX: 0,
    knobY: 0,
    angle: 0,
  })

  const handleMovePointerDown = (e) => {
    if (!isAlive || movePointerIdRef.current !== null) return
    e.preventDefault()
    e.stopPropagation()

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    movePointerIdRef.current = e.pointerId

    const rect = target.getBoundingClientRect()
    const touchX = e.clientX - rect.left
    const touchY = e.clientY - rect.top

    moveOriginRef.current = { x: e.clientX, y: e.clientY }

    setMoveVisual({
      active: true,
      x: touchX,
      y: touchY,
      knobX: 0,
      knobY: 0,
      angle: 0,
    })
  }

  const handleMovePointerMove = (e) => {
    if (e.pointerId !== movePointerIdRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const dx = e.clientX - moveOriginRef.current.x
    const dy = e.clientY - moveOriginRef.current.y
    const dist = Math.hypot(dx, dy)
    const maxRadius = 45
    const deadzone = 8

    if (dist < deadzone) {
      setMoveVisual((prev) => ({ ...prev, knobX: 0, knobY: 0 }))
      onInputChangeRef.current?.({
        isMoving: false,
        moveMagnitude: 0,
        forward: false,
        reverse: false,
        steerLeft: false,
        steerRight: false,
      })
      return
    }

    const angle = Math.atan2(dy, dx)
    const clampedDist = Math.min(maxRadius, dist)
    const knobX = Math.cos(angle) * clampedDist
    const knobY = Math.sin(angle) * clampedDist

    setMoveVisual((prev) => ({ ...prev, knobX, knobY, angle }))

    // Calculate world movement angle
    // In portrait mode, UP on screen (-PI/2) maps to 0 (heading towards +x in world)
    const worldAngle = isPortrait ? angle + Math.PI / 2 : angle
    const magnitude = Math.min(1, dist / maxRadius)

    onInputChangeRef.current?.({
      isMoving: true,
      moveAngle: worldAngle,
      moveMagnitude: magnitude,
      forward: true,
    })
  }

  const handleMovePointerUp = (e) => {
    if (e.pointerId !== movePointerIdRef.current) return
    e.preventDefault()
    e.stopPropagation()

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    movePointerIdRef.current = null
    setMoveVisual((prev) => ({
      ...prev,
      active: false,
      knobX: 0,
      knobY: 0,
    }))

    onInputChangeRef.current?.({
      isMoving: false,
      moveMagnitude: 0,
      forward: false,
      reverse: false,
      steerLeft: false,
      steerRight: false,
    })
  }

  // -------------------------------------------------------------
  // Bottom Zone: Floating Aim & Shoot Joystick State & Handlers
  // -------------------------------------------------------------
  const bottomZoneRef = useRef(null)
  const aimPointerIdRef = useRef(null)
  const aimOriginRef = useRef({ x: 0, y: 0, time: 0 })
  const aimFireTimerRef = useRef(null)
  const lastAimAngleRef = useRef(null)

  const [aimVisual, setAimVisual] = useState({
    active: false,
    x: 0,
    y: 0,
    knobX: 0,
    knobY: 0,
    angle: 0,
  })

  // Clear aim firing interval on unmount
  useEffect(() => {
    return () => {
      if (aimFireTimerRef.current) {
        clearInterval(aimFireTimerRef.current)
        aimFireTimerRef.current = null
      }
    }
  }, [])

  const startAimFireLoop = useCallback(() => {
    if (aimFireTimerRef.current) return
    // Immediate first fire shot
    onFireRef.current?.()

    aimFireTimerRef.current = setInterval(() => {
      onFireRef.current?.()
    }, Math.max(120, weaponCooldownRef.current))
  }, [])

  const stopAimFireLoop = useCallback(() => {
    if (aimFireTimerRef.current) {
      clearInterval(aimFireTimerRef.current)
      aimFireTimerRef.current = null
    }
  }, [])

  const handleAimPointerDown = (e) => {
    if (!isAlive || aimPointerIdRef.current !== null) return
    e.preventDefault()
    e.stopPropagation()

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    aimPointerIdRef.current = e.pointerId

    const rect = target.getBoundingClientRect()
    const touchX = e.clientX - rect.left
    const touchY = e.clientY - rect.top

    aimOriginRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: e.timeStamp || 0,
    }

    setAimVisual({
      active: true,
      x: touchX,
      y: touchY,
      knobX: 0,
      knobY: 0,
      angle: 0,
    })

    // Start firing immediately
    startAimFireLoop()
  }

  const handleAimPointerMove = (e) => {
    if (e.pointerId !== aimPointerIdRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const dx = e.clientX - aimOriginRef.current.x
    const dy = e.clientY - aimOriginRef.current.y
    const dist = Math.hypot(dx, dy)
    const maxRadius = 45
    const deadzone = 10

    if (dist < deadzone) {
      setAimVisual((prev) => ({ ...prev, knobX: 0, knobY: 0 }))
      return
    }

    const angle = Math.atan2(dy, dx)
    const clampedDist = Math.min(maxRadius, dist)
    const knobX = Math.cos(angle) * clampedDist
    const knobY = Math.sin(angle) * clampedDist

    setAimVisual((prev) => ({ ...prev, knobX, knobY, angle }))

    const worldAngle = isPortrait ? angle + Math.PI / 2 : angle
    lastAimAngleRef.current = worldAngle

    onAimChangeRef.current?.(worldAngle)
    onInputChangeRef.current?.({ turretAngle: worldAngle })
  }

  const handleAimPointerUp = (e) => {
    if (e.pointerId !== aimPointerIdRef.current) return
    e.preventDefault()
    e.stopPropagation()

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    stopAimFireLoop()

    const elapsed = (e.timeStamp || 0) - aimOriginRef.current.time
    const totalDist = Math.hypot(
      e.clientX - aimOriginRef.current.x,
      e.clientY - aimOriginRef.current.y
    )

    // Quick tap or flick fire
    if (elapsed < 320 && totalDist > 16 && lastAimAngleRef.current !== null) {
      onAimChangeRef.current?.(lastAimAngleRef.current)
      onInputChangeRef.current?.({ turretAngle: lastAimAngleRef.current })
      onFireRef.current?.()
    }

    aimPointerIdRef.current = null
    setAimVisual((prev) => ({
      ...prev,
      active: false,
      knobX: 0,
      knobY: 0,
    }))
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between select-none overflow-hidden touch-none">
      {/* ------------------------------------------------------------- */}
      {/* Top Tactical HUD Bar */}
      {/* ------------------------------------------------------------- */}
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

      {/* ------------------------------------------------------------- */}
      {/* Top Half: Dynamic Movement Touch Zone (Draggable Anywhere in Top Half) */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={topZoneRef}
        onPointerDown={handleMovePointerDown}
        onPointerMove={handleMovePointerMove}
        onPointerUp={handleMovePointerUp}
        onPointerCancel={handleMovePointerUp}
        className="pointer-events-auto relative flex-1 w-full touch-none overflow-hidden"
      >
        {/* Subtle Idle Guide Label */}
        <div className="absolute top-2 left-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-400/25 pointer-events-none select-none">
          <Compass className="w-3.5 h-3.5" />
          <span>Top Half: Touch & Drag to Move</span>
        </div>

        {/* Floating Low-Opacity Movement Joystick */}
        {moveVisual.active && (
          <div
            className="absolute pointer-events-none transition-opacity duration-100"
            style={{
              left: moveVisual.x,
              top: moveVisual.y,
              transform: 'translate(-50%, -50%)',
              opacity: 0.45,
            }}
          >
            {/* Outer Base Ring */}
            <div className="relative w-28 h-28 rounded-full border border-cyan-400/40 bg-zinc-950/20 backdrop-blur-[2px] flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              {/* Center Rest Guide */}
              <div className="w-2 h-2 rounded-full bg-cyan-400/30" />

              {/* Draggable Knob */}
              <div
                className="absolute w-12 h-12 rounded-full border border-cyan-300/50 bg-cyan-500/30 shadow-md flex items-center justify-center"
                style={{
                  transform: `translate(${moveVisual.knobX}px, ${moveVisual.knobY}px)`,
                }}
              >
                <div className="w-3 h-3 rounded-full bg-white/70 shadow-inner" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Halfway Divider Indicator */}
      <div className="w-full h-px border-b border-dashed border-zinc-800/30 pointer-events-none" />

      {/* ------------------------------------------------------------- */}
      {/* Bottom Half: Dynamic Aim & Shoot Touch Zone (Draggable Anywhere in Bottom Half) */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={bottomZoneRef}
        onPointerDown={handleAimPointerDown}
        onPointerMove={handleAimPointerMove}
        onPointerUp={handleAimPointerUp}
        onPointerCancel={handleAimPointerUp}
        className="pointer-events-auto relative flex-1 w-full touch-none overflow-hidden"
      >
        {/* Subtle Idle Guide Label */}
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400/25 pointer-events-none select-none">
          <Crosshair className="w-3.5 h-3.5" />
          <span>Bottom Half: Touch & Aim to Fire</span>
        </div>

        {/* Floating Low-Opacity Aim & Shoot Joystick */}
        {aimVisual.active && (
          <div
            className="absolute pointer-events-none transition-opacity duration-100"
            style={{
              left: aimVisual.x,
              top: aimVisual.y,
              transform: 'translate(-50%, -50%)',
              opacity: 0.45,
            }}
          >
            {/* Outer Base Ring */}
            <div className="relative w-28 h-28 rounded-full border border-amber-400/40 bg-zinc-950/20 backdrop-blur-[2px] flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              {/* Direction Indicator on Outer Rim */}
              {aimVisual.knobX !== 0 || aimVisual.knobY !== 0 ? (
                <div
                  className="absolute w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                  style={{
                    transform: `translate(${Math.cos(aimVisual.angle) * 52}px, ${
                      Math.sin(aimVisual.angle) * 52
                    }px)`,
                  }}
                />
              ) : null}

              {/* Center Crosshair Rest */}
              <div className="w-2 h-2 rounded-full bg-amber-400/30" />

              {/* Draggable Knob */}
              <div
                className="absolute w-12 h-12 rounded-full border border-amber-300/50 bg-amber-500/30 shadow-md flex items-center justify-center"
                style={{
                  transform: `translate(${aimVisual.knobX}px, ${aimVisual.knobY}px)`,
                }}
              >
                <Crosshair className="w-5 h-5 text-amber-200/80 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



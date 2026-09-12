import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Crosshair, Compass } from 'lucide-react'
import {
  WEAPON_TYPES,
  DEFAULT_TANK_TYPE,
  MOVE_DEADZONE_PX,
  AIM_DEADZONE_PX,
  FLICK_MAX_MS,
  FLICK_MIN_DIST_PX,
} from '../constants/tankConstants'
import useJoystick from '../hooks/useJoystick'
import useAutoFire from '../hooks/useAutoFire'
import TankHudBar from './TankHudBar'

export default function TankControls({
  onInputChange,
  onAimChange,
  onFire,
  onPing,
  activeWeapon = 'STANDARD',
  fireCooldownMs = null,
  hasShield = false,
  tankType = DEFAULT_TANK_TYPE,
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

  /**
   * The two joystick zones cover the whole arena, so on a desktop they would swallow
   * every pointer event before it reached the canvas underneath - which is exactly
   * what used to disable mouse aiming. Mount them only where there is a touch screen.
   */
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(pointer: coarse)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(pointer: coarse)')
    const handleChange = (e) => setIsTouchDevice(e.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  // Ref callbacks to avoid stale closures
  const onFireRef = useRef(onFire)
  const onAimChangeRef = useRef(onAimChange)
  const onInputChangeRef = useRef(onInputChange)
  /**
   * The rate the simulation will actually honour. TankGame derives it from the tank
   * class, or the crate weapon when one is held - reading WEAPON_TYPES here instead
   * would throttle a fast class such as Specter to the STANDARD shell's rate.
   */
  const effectiveCooldownMs = fireCooldownMs ?? currentWeapon.cooldownMs

  useEffect(() => {
    onFireRef.current = onFire
    onAimChangeRef.current = onAimChange
    onInputChangeRef.current = onInputChange
  }, [onFire, onAimChange, onInputChange])

  // -------------------------------------------------------------
  // The two floating joysticks. Both run the same algorithm (useJoystick);
  // they differ only in deadzone and in what they publish.
  // -------------------------------------------------------------
  const lastAimAngleRef = useRef(null)

  const publishStop = useCallback(() => {
    onInputChangeRef.current?.({
        isMoving: false,
        moveMagnitude: 0,
        forward: false,
        reverse: false,
        steerLeft: false,
        steerRight: false,
      })
  }, [])

  const { start: startAimFire, stop: stopAimFire } = useAutoFire({
    cooldownMs: effectiveCooldownMs,
    onFire: () => onFireRef.current?.(),
  })

  // Top zone: drive.
  const move = useJoystick({
    enabled: isAlive,
    deadzone: MOVE_DEADZONE_PX,
    isPortrait,
    onDeadzone: publishStop,
    onMove: ({ worldAngle, magnitude }) => {
      onInputChangeRef.current?.({
        isMoving: true,
        moveAngle: worldAngle,
        moveMagnitude: magnitude,
        forward: true,
      })
    },
    onEnd: publishStop,
  })

  // Bottom zone: aim, and fire continuously while held.
  const aim = useJoystick({
    enabled: isAlive,
    deadzone: AIM_DEADZONE_PX,
    isPortrait,
    onStart: () => startAimFire(),
    onMove: ({ worldAngle }) => {
      lastAimAngleRef.current = worldAngle
      onAimChangeRef.current?.(worldAngle)
      onInputChangeRef.current?.({ turretAngle: worldAngle })
    },
    onEnd: ({ elapsedMs, totalDist }) => {
      stopAimFire()
      // A quick flick fires one aimed shot rather than holding the trigger.
      if (elapsedMs < FLICK_MAX_MS && totalDist > FLICK_MIN_DIST_PX && lastAimAngleRef.current !== null) {
        onAimChangeRef.current?.(lastAimAngleRef.current)
        onInputChangeRef.current?.({ turretAngle: lastAimAngleRef.current })
        onFireRef.current?.()
      }
    },
  })

  const moveVisual = move.visual
  const aimVisual = aim.visual

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between select-none overflow-hidden touch-none">
      {/* ------------------------------------------------------------- */}
      {/* Top Tactical HUD Bar */}
      {/* ------------------------------------------------------------- */}
      <TankHudBar
        hp={hp}
        maxHp={maxHp}
        tankType={tankType}
        activeWeapon={activeWeapon}
        hasShield={hasShield}
        is2v2={is2v2}
        isPortrait={isPortrait}
        soundOn={soundOn}
        onPing={onPing}
        onToggleOrientation={onToggleOrientation}
        onToggleSound={onToggleSound}
        onOpenRules={onOpenRules}
        onLeaveGame={onLeaveGame}
      />

      {/* ------------------------------------------------------------- */}
      {/* Touch zones. Omitted on pointer-precise devices so the canvas below */}
      {/* receives mouse aim, click-to-fire and right-click ping directly.    */}
      {/* ------------------------------------------------------------- */}
      {isTouchDevice && (
      <div
        {...move.handlers}
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
      )}

      {/* Subtle Halfway Divider Indicator */}
      {isTouchDevice && (
        <div className="w-full h-px border-b border-dashed border-zinc-800/30 pointer-events-none" />
      )}

      {/* ------------------------------------------------------------- */}
      {/* Bottom Half: Dynamic Aim & Shoot Touch Zone (Draggable Anywhere in Bottom Half) */}
      {/* ------------------------------------------------------------- */}
      {isTouchDevice && (
      <div
        {...aim.handlers}
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
      )}

      {/* Desktop hint: the canvas handles aiming directly here. */}
      {!isTouchDevice && (
        <div className="flex-1 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500/40 select-none">
            WASD to drive · Mouse to aim · Click or Space to fire{is2v2 ? ' · E to ping' : ''}
          </span>
        </div>
      )}
    </div>
  )
}



import React from 'react'
import { CARD_COLORS, CARD_TYPES, COLOR_CONFIG } from '../constants/unoConstants'

export default function UnoCard({
  card,
  isBack = false,
  isPlayable = true,
  onClick,
  size = 'md',
  className = '',
  style = {},
  activeColor = null,
}) {
  const sizeClasses = {
    sm: 'w-12 h-18 text-xs rounded-lg',
    md: 'w-16 h-24 sm:w-20 sm:h-30 text-base rounded-xl',
    lg: 'w-24 h-36 sm:w-28 sm:h-42 text-xl rounded-2xl',
  }[size] || 'w-16 h-24 rounded-xl'

  // Card Back view (for opponents or draw pile)
  if (isBack) {
    return (
      <div
        className={`relative select-none flex-shrink-0 bg-zinc-950 border-2 border-white/20 shadow-lg flex items-center justify-center overflow-hidden transition-all duration-200 ${sizeClasses} ${className}`}
        style={style}
        onClick={onClick}
      >
        {/* Outer border groove */}
        <div className="absolute inset-1 rounded-md border border-white/10" />

        {/* Central tilted red oval with UNO lettering */}
        <div className="w-[85%] h-[55%] -rotate-25 bg-red-600 rounded-[50%] flex items-center justify-center shadow-md border-2 border-amber-400">
          <span className="font-black italic tracking-tighter text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-[10px] sm:text-xs">
            UNO
          </span>
        </div>
      </div>
    )
  }

  if (!card) return null

  const config = COLOR_CONFIG[card.color] || COLOR_CONFIG[CARD_COLORS.WILD]
  const isWild = card.color === CARD_COLORS.WILD
  const chosenConfig =
    isWild && activeColor && activeColor !== CARD_COLORS.WILD
      ? COLOR_CONFIG[activeColor]
      : null

  return (
    <button
      type="button"
      onClick={(e) => {
        if (!isPlayable || !onClick) return
        e.stopPropagation()
        onClick()
      }}
      aria-disabled={!isPlayable}
      tabIndex={isPlayable ? 0 : -1}
      style={style}
      className={`relative select-none flex-shrink-0 border-2 border-white/80 shadow-md flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden transition-all duration-200 group text-left touch-pan-x ${
        config.bg
      } ${sizeClasses} ${
        isPlayable && onClick
          ? 'cursor-pointer hover:-translate-y-3 hover:shadow-2xl ring-2 ring-white/60 active:scale-95'
          : 'cursor-default'
      } ${chosenConfig ? `ring-2 ${chosenConfig.ring}` : ''} ${className}`}
    >
      {/* Top Left Mini Index */}
      <div className="flex items-center gap-0.5 leading-none z-10">
        <span className="font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-[11px] sm:text-sm">
          {card.label}
        </span>
      </div>

      {/* Central Center Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isWild ? (
          // 4-Color segmented wheel for Wild cards
          <div className="w-[70%] h-[55%] -rotate-20 rounded-[50%] bg-zinc-950 p-1 border-2 border-white/40 shadow-inner flex items-center justify-center">
            <div className="w-full h-full rounded-[50%] overflow-hidden grid grid-cols-2 grid-rows-2">
              <div className="bg-red-500" />
              <div className="bg-blue-500" />
              <div className="bg-amber-400" />
              <div className="bg-emerald-500" />
            </div>
            {card.type === CARD_TYPES.WILD_DRAW_FOUR && (
              <span className="absolute font-black text-white text-xs sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                +4
              </span>
            )}
          </div>
        ) : (
          // Tilted White Oval for regular / action cards
          <div className="w-[75%] h-[60%] -rotate-20 bg-white rounded-[50%] shadow-inner flex items-center justify-center">
            <span
              className={`font-black tracking-tight leading-none text-base sm:text-2xl filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] ${
                config.text
              }`}
            >
              {card.label}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Right Mini Index (Upside Down) */}
      <div className="flex items-center justify-end leading-none z-10 rotate-180">
        <span className="font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] text-[11px] sm:text-sm">
          {card.label}
        </span>
      </div>

      {/* Active Color Stripe for Wild Card */}
      {chosenConfig && (
        <div
          className={`absolute bottom-0 inset-x-0 py-0.5 text-center text-[8px] sm:text-[9px] font-black uppercase text-white shadow-md z-20 ${chosenConfig.bg}`}
        >
          {chosenConfig.name}
        </div>
      )}

      {/* Subtle shine highlight */}
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
    </button>
  )
}

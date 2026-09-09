import React, { useRef } from 'react'
import { RotateCw, RotateCcw, AlertCircle, Sparkles, Check, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import UnoCard from './UnoCard'
import { COLOR_CONFIG, CARD_COLORS } from '../constants/unoConstants'
import { canPlayCard } from '../utils/deck'
import { playClickSound } from '../../../utils/sound'

export default function UnoBoard({
  players,
  currentPlayerIndex,
  direction, // 1 for clockwise, -1 for counter-clockwise
  topCard,
  activeColor,
  drawPileCount,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  hasDrawnCardThisTurn,
  isHumanTurn,
  isWaitingForBot,
  actionMessage,
  unoCalledPlayers,
  onCallUno,
  hasCalledUnoThisRound,
  myPlayerId = 0,
  myHand = null,
}) {
  const myPlayer = players.find((p) => p.id === myPlayerId) || players[0]
  const handCards = myHand || myPlayer?.hand || []
  const opponentPlayers = players.filter((p) => p.id !== myPlayer?.id)
  const activePlayer = players[currentPlayerIndex]
  const isCurrentTurnForMe =
    isHumanTurn !== undefined ? isHumanTurn : activePlayer?.id === myPlayer?.id

  const activeColorConfig =
    COLOR_CONFIG[activeColor] || COLOR_CONFIG[topCard?.color] || COLOR_CONFIG[CARD_COLORS.WILD]

  const myCanPlayAnyCard = handCards.some((card) =>
    canPlayCard(card, topCard, activeColor)
  )

  const showUnoButton =
    handCards.length <= 2 && isCurrentTurnForMe && !hasCalledUnoThisRound

  const handTrayRef = useRef(null)

  const handleTrayWheel = (e) => {
    if (e.deltaY !== 0 && handTrayRef.current) {
      handTrayRef.current.scrollLeft += e.deltaY
    }
  }

  const scrollTray = (offset) => {
    if (handTrayRef.current) {
      handTrayRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-3 py-2 flex flex-col justify-between min-h-[88vh] select-none">
      {/* 1. Top Section: Opponents (Bots or Friends) */}
      <div className="w-full pt-1 pb-2">
        <div className="flex items-center justify-around gap-2 max-w-lg mx-auto">
          {opponentPlayers.map((opponent) => {
            const isOpponentActive = activePlayer?.id === opponent.id
            const cardCount =
              opponent.cardCount !== undefined
                ? opponent.cardCount
                : opponent.hand
                ? opponent.hand.length
                : 0
            const hasUno = cardCount === 1
            const calledUno = unoCalledPlayers.has(opponent.id)

            return (
              <div
                key={opponent.id}
                className={`relative flex flex-col items-center p-2 rounded-2xl transition-all duration-300 ${
                  isOpponentActive
                    ? 'bg-zinc-800/90 border-2 border-amber-400 shadow-lg shadow-amber-400/20 scale-105'
                    : 'bg-zinc-900/60 border border-zinc-800/80 opacity-85'
                }`}
              >
                {/* Uno Badge */}
                {hasUno && (
                  <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider animate-bounce shadow-md">
                    {calledUno ? 'UNO!' : '1 Card!'}
                  </span>
                )}

                {/* Avatar with Turn Ring */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl shadow-inner">
                    {opponent.avatar || '👤'}
                  </div>
                  {isOpponentActive && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full animate-ping" />
                  )}
                </div>

                {/* Name & Hand Count */}
                <span className="text-xs font-bold text-white mt-1 leading-tight max-w-[80px] truncate text-center">
                  {opponent.name}
                </span>

                <div className="flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-zinc-400">
                  <span>🃏</span>
                  <span>{cardCount}</span>
                </div>

                {/* Turn Status */}
                {isOpponentActive && (
                  <span className="text-[10px] text-amber-300 font-medium animate-pulse mt-0.5">
                    {opponent.isHuman ? 'Thinking...' : isWaitingForBot ? 'Thinking...' : 'Moving...'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Middle Section: The Table Arena */}
      <div className="relative my-auto flex flex-col items-center justify-center py-4">
        {/* Active Direction & Color Status Bar */}
        <div className="flex items-center gap-3 mb-4">
          {/* Turn Direction */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400"
            title={`Direction: ${direction === 1 ? 'Clockwise' : 'Counter-Clockwise'}`}
          >
            {direction === 1 ? (
              <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
            )}
            <span className="font-semibold text-[11px]">
              {direction === 1 ? 'Clockwise' : 'Counter-Clockwise'}
            </span>
          </div>

          {/* Active Color Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold text-white shadow-md ${activeColorConfig.bg} ${activeColorConfig.border}`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Active: {activeColorConfig.name}</span>
          </div>
        </div>

        {/* Center Card Play Area (Draw Pile & Discard Pile) */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Draw Pile */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              {/* Stack effect */}
              <div className="absolute inset-0 bg-zinc-900 rounded-xl translate-x-1.5 translate-y-1.5 border border-zinc-800 pointer-events-none" />
              <div className="absolute inset-0 bg-zinc-950 rounded-xl translate-x-0.5 translate-y-0.5 border border-zinc-800 pointer-events-none" />

              <UnoCard
                isBack
                size="md"
                onClick={isCurrentTurnForMe ? onDrawCard : undefined}
                className={
                  isCurrentTurnForMe
                    ? 'cursor-pointer ring-2 ring-amber-400/80 hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/10'
                    : 'cursor-not-allowed opacity-80'
                }
              />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 mt-2">
              Draw Pile ({drawPileCount})
            </span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <UnoCard
                card={topCard}
                size="md"
                isPlayable={false}
                style={{ transform: 'rotate(-2deg)' }}
                className="shadow-2xl border-white"
              />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 mt-2">
              Discard Pile
            </span>
          </div>
        </div>

        {/* Action announcement toast */}
        {actionMessage && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 shadow-md flex items-center gap-1.5 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* 3. Bottom Section: Player Hand & Controls */}
      <div className="w-full pb-2 pt-3 border-t border-zinc-900 space-y-2">
        {/* Turn Bar & Status */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{myPlayer.avatar || '😎'}</span>
            <div className="flex items-center gap-2">
              <div>
                <span className="text-xs font-bold text-white block leading-tight">
                  {myPlayer.name} (You)
                </span>
                <span className="text-[10px] text-zinc-400">
                  {handCards.length} card{handCards.length !== 1 ? 's' : ''} left
                </span>
              </div>

              {/* Quick scroll arrows if hand has multiple cards */}
              {handCards.length > 4 && (
                <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 ml-1">
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
              )}
            </div>
          </div>

          {/* Player Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Uno Button */}
            {showUnoButton && (
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  onCallUno()
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950/50 animate-bounce active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Call UNO!</span>
              </button>
            )}

            {hasCalledUnoThisRound && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> UNO Called!
              </span>
            )}

            {/* Pass Turn Button (after drawing a card) */}
            {isCurrentTurnForMe && hasDrawnCardThisTurn && (
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  onPassTurn()
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700 flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <span>Pass Turn</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Turn Prompt Banner */}
        <div
          className={`py-1.5 px-3 rounded-xl text-center text-xs font-bold transition-all ${
            isCurrentTurnForMe
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800/80'
          }`}
        >
          {isCurrentTurnForMe ? (
            hasDrawnCardThisTurn ? (
              <span>You drew a card! Play it if valid, or click &quot;Pass Turn&quot;.</span>
            ) : myCanPlayAnyCard ? (
              <span>Your Turn — Select a card from your hand to play!</span>
            ) : (
              <span>No playable cards! Click the Draw Pile to draw a card.</span>
            )
          ) : (
            <span>Waiting for {activePlayer?.name}&apos;s move...</span>
          )}
        </div>

        {/* Player's Hand Horizontal Tray */}
        <div
          ref={handTrayRef}
          onWheel={handleTrayWheel}
          className="w-full overflow-x-auto pb-2 pt-3 touch-pan-x overscroll-x-contain select-none scroll-smooth"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 px-1 min-w-max">
            {handCards.map((card) => {
              const isPlayable = isCurrentTurnForMe && canPlayCard(card, topCard, activeColor)

              return (
                <div key={card.id} className="transition-transform duration-150 flex-shrink-0 touch-pan-x">
                  <UnoCard
                    card={card}
                    size="md"
                    isPlayable={isPlayable}
                    onClick={isPlayable ? () => onPlayCard(card) : undefined}
                    className={
                      isPlayable
                        ? 'ring-2 ring-white/90 shadow-xl -translate-y-1 sm:-translate-y-2'
                        : isCurrentTurnForMe
                        ? 'opacity-40 grayscale-[25%]'
                        : 'opacity-95 shadow-md'
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import {
  RotateCw,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowUpDown,
  Settings,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import UnoCard from './UnoCard'
import UnoSettingsModal from './UnoSettingsModal'
import { COLOR_CONFIG, CARD_COLORS, getRankBadge } from '../constants/unoConstants'
import { canPlayCard, sortCardsByColor, sortCardsByNumber } from '../utils/deck'
import { getActivePlayers, findNextPlayerIndex } from '../utils/turnOrder'
import useDrawAnimation from '../hooks/useDrawAnimation'
import { playClickSound } from '../../../utils/sound'

const EMPTY_HAND = []

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
  isWaitingForBot = false,
  actionMessage,
  unoCalledPlayers,
  onCallUno,
  onCatchUno,
  hasCalledUnoThisRound,
  myPlayerId = 0,
  myHand = null,
  skippedInfo = null,
  pendingDrawCount = 0,
  pendingStackType = null,
  isMultiplayer = false,
  isHost = false,
  roomCode = '',
  onSyncState = null,
  onReturnToLobby = null,
  onLeaveGame = null,
  onOpenRules = null,
  connectionStatus = 'connected',
  onReconnect = null,
  rankings = [],
}) {
  const myPlayer = players.find((p) => p.id === myPlayerId) || players[0]
  const myPlayerRank =
    myPlayer?.rank || rankings.find((r) => r.playerId === myPlayer?.id)?.rank || null
  const isSpectating = Boolean(myPlayerRank)
  const handCards = isSpectating ? EMPTY_HAND : myHand || myPlayer?.hand || EMPTY_HAND
  const activePlayer =
    players[currentPlayerIndex] || players.find((p) => p.id === currentPlayerIndex) || players[0]

  // Both memos can now list exactly what they use: turnOrder's helpers are
  // module-level functions, not closures redefined on every render. The two
  // exhaustive-deps suppressions that used to sit here are gone rather than
  // carried across.
  const activePlayers = useMemo(
    () => getActivePlayers(players, rankings),
    [players, rankings]
  )

  const nextPlayerIndex = useMemo(
    () => findNextPlayerIndex(players, currentPlayerIndex, direction, rankings),
    [players, currentPlayerIndex, direction, rankings]
  )

  const nextPlayer = players[nextPlayerIndex]

  const isCurrentTurnForMe =
    !isSpectating &&
    (isHumanTurn !== undefined
      ? isHumanTurn
      : (activePlayer?.id === myPlayer?.id || currentPlayerIndex === myPlayer?.id))
  const isMyTurnSkipped = !isSpectating && skippedInfo?.playerId === myPlayer?.id

  const canDrawCard =
    isCurrentTurnForMe && (pendingDrawCount > 0 || !hasDrawnCardThisTurn)

  const activeColorConfig =
    COLOR_CONFIG[activeColor] || COLOR_CONFIG[topCard?.color] || COLOR_CONFIG[CARD_COLORS.WILD]

  const myCanPlayAnyCard =
    !isSpectating &&
    handCards.some((card) =>
      canPlayCard(card, topCard, activeColor, pendingDrawCount, pendingStackType)
    )

  const myCanStack =
    !isSpectating &&
    pendingDrawCount > 0 &&
    handCards.some((card) =>
      canPlayCard(card, topCard, activeColor, pendingDrawCount, pendingStackType)
    )

  const showUnoButton = !isSpectating && handCards.length > 0


  const [handSortMode, setHandSortMode] = useState('none') // 'none' | 'color' | 'number'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const drawPileRef = useRef(null)
  const handTrayRef = useRef(null)
  const activeNodeRef = useRef(null)

  const resetHandSort = useCallback(() => setHandSortMode('none'), [])

  const { flyingCards, newlyDrawnCardIds, clearNewBadges } = useDrawAnimation({
    handCards,
    drawPileRef,
    handTrayRef,
    onCardsDrawn: resetHandSort,
  })

  const handlePlayCardWithBadgeClear = (card) => {
    clearNewBadges()
    onPlayCard(card)
  }

  const handleHeaderSync = () => {
    if (!onSyncState || isSyncing) return
    playClickSound()
    setIsSyncing(true)
    onSyncState()
    setTimeout(() => setIsSyncing(false), 800)
  }

  // Memoize sorted cards for smooth rendering and persistent sort preference
  const displayedHandCards = useMemo(() => {
    if (handSortMode === 'color') {
      return sortCardsByColor(handCards)
    }
    if (handSortMode === 'number') {
      return sortCardsByNumber(handCards)
    }
    return handCards
  }, [handCards, handSortMode])

  // Auto-scroll the turn track when currentPlayerIndex changes so active player is visible
  useEffect(() => {
    if (activeNodeRef.current) {
      activeNodeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [currentPlayerIndex])

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
    <div className="w-full max-w-2xl mx-auto px-3 flex flex-col justify-between min-h-[88vh] select-none">
      {/* 1. Top Section: Header Bar & Turn Order Track */}
      <div className="w-full pt-1 pb-3">
        {/* Disconnection Warning Banner (when connection lost during multiplayer match) */}
        {isMultiplayer && !isHost && connectionStatus === 'disconnected' && (
          <div className="mb-2.5 p-2.5 rounded-2xl bg-red-950/90 border border-red-500/60 text-red-200 text-xs flex items-center justify-between shadow-lg shadow-red-950/60 max-w-lg mx-auto animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-white text-xs leading-tight">Connection Lost</div>
                <div className="text-[10px] text-red-300">Your hand and seat are preserved</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onReconnect && (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onReconnect()
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Reconnect
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playClickSound()
                  setIsSettingsOpen(true)
                }}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition cursor-pointer"
              >
                Menu
              </button>
            </div>
          </div>
        )}

        {/* Unified Top Utility Bar: Room Info, Direction Indicator, and Actions */}
        <div className="flex items-center justify-between px-1 mb-2 max-w-lg mx-auto text-xs">
          {/* Room / Mode Info */}
          <div className="flex items-center gap-2">
            {isMultiplayer && roomCode ? (
              <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5 shadow-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHost || connectionStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : connectionStatus === 'reconnecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-rose-500'
                  }`}
                />
                <span>Room {roomCode}</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-400 flex items-center gap-1 shadow-sm">
                <span>🤖</span>
                <span>Solo vs Bots</span>
              </span>
            )}
          </div>

          {/* Central Turn Direction Pill (Single Source of Truth) */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm transition-colors ${
              direction === 1
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
            }`}
            title={`Direction: ${direction === 1 ? 'Clockwise' : 'Counter-Clockwise'}`}
          >
            {direction === 1 ? (
              <>
                <RotateCw className="w-3 h-3 text-blue-400 animate-spin-slow" />
                <span>Clockwise</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3 text-purple-400 animate-spin-slow" />
                <span>Counter-Clockwise</span>
              </>
            )}
          </div>

          {/* Top Actions: Quick State Sync & Settings Menu */}
          <div className="flex items-center gap-1.5">
            {isMultiplayer && onSyncState && (
              <button
                type="button"
                onClick={handleHeaderSync}
                disabled={isSyncing}
                title="Sync game state with host"
                className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${
                    isSyncing ? 'animate-spin text-amber-400' : 'text-blue-400'
                  }`}
                />
                <span className="hidden sm:inline">Sync</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playClickSound()
                setIsSettingsOpen(true)
              }}
              title="Game settings, rules, and exit options"
              className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Players Turn Flow Row with Direction Arrows */}
        <div className="w-full overflow-x-auto scrollbar-none pt-3.5 pb-2 px-0.5">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 min-w-max mx-auto">
            {players.map((p, idx) => {
              const pRank =
                p.rank || rankings.find((r) => r.playerId === p.id)?.rank || null
              const isPlayerFinished = Boolean(pRank)
              const badgeInfo = pRank ? getRankBadge(pRank) : null
              const isActive = idx === currentPlayerIndex && !isPlayerFinished
              const isNext = idx === nextPlayerIndex && !isPlayerFinished
              const isMe = p.id === myPlayer?.id
              const isSkipped = skippedInfo?.playerId === p.id && !isPlayerFinished
              const cardCount =
                isPlayerFinished
                  ? 0
                  : p.id === myPlayer?.id
                  ? handCards.length
                  : p.cardCount !== undefined
                  ? p.cardCount
                  : p.hand
                  ? p.hand.length
                  : 0
              const hasUno = cardCount === 1 && !isPlayerFinished
              const calledUno = unoCalledPlayers?.has(p.id)

              return (
                <React.Fragment key={p.id}>
                  {/* Player Card Node: Clickable on opponents without revealing hints */}
                  <div
                    ref={isActive ? activeNodeRef : null}
                    onClick={() => {
                      if (!isMe && !isPlayerFinished && onCatchUno) {
                        playClickSound()
                        onCatchUno(p.id)
                      }
                    }}
                    className={`relative flex flex-col items-center p-2 rounded-2xl transition-all duration-300 min-w-[68px] sm:min-w-[80px] ${
                      !isMe && !isPlayerFinished ? 'cursor-pointer hover:opacity-95' : ''
                    } ${
                      isPlayerFinished
                        ? 'bg-zinc-900/40 border border-amber-500/30 opacity-75'
                        : isSkipped
                        ? 'bg-red-950/70 border-2 border-red-500 shadow-lg shadow-red-950/50 ring-2 ring-red-500/40 animate-pulse'
                        : isActive
                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/50 scale-105 z-10'
                        : isNext
                        ? 'bg-blue-950/40 border-2 border-blue-400/60 shadow-md shadow-blue-500/10'
                        : 'bg-zinc-900/60 border border-zinc-800/80 opacity-80'
                    }`}
                  >
                    {/* Status Badges */}
                    {isPlayerFinished ? (
                      <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 font-black text-[8px] uppercase tracking-wider shadow">
                        {badgeInfo?.medal} {badgeInfo?.shortLabel}
                      </span>
                    ) : isSkipped ? (
                      <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[8px] uppercase tracking-wider shadow animate-bounce">
                        SKIPPED
                      </span>
                    ) : hasUno && calledUno ? (
                      <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[8px] uppercase tracking-wider shadow border border-red-400 flex items-center gap-0.5">
                        UNO!
                      </span>
                    ) : isActive ? (
                      <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-amber-400 text-zinc-950 font-black text-[8px] uppercase tracking-wider shadow">
                        TURN
                      </span>
                    ) : isNext ? (
                      <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-blue-500 text-white font-black text-[8px] uppercase tracking-wider shadow">
                        NEXT
                      </span>
                    ) : null}

                    {/* Avatar with Status Ring */}
                    <div className="relative">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl shadow-inner ${
                          isPlayerFinished
                            ? 'bg-zinc-900 border-2 border-amber-400/50'
                            : isSkipped
                            ? 'bg-red-950 border border-red-500/60'
                            : isActive
                            ? 'bg-zinc-800 border-2 border-amber-400'
                            : 'bg-zinc-800 border border-zinc-700'
                        }`}
                      >
                        {p.avatar || '👤'}
                      </div>

                      {/* Skipped Overlay Icon */}
                      {isSkipped && (
                        <span className="absolute inset-0 flex items-center justify-center text-base bg-red-950/60 rounded-full">
                          🚫
                        </span>
                      )}

                      {/* Active Player Live Pulse */}
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-400 border-2 border-zinc-900 rounded-full animate-ping" />
                      )}
                    </div>

                    {/* Name & Badge */}
                    <div className="flex items-center gap-0.5 mt-1 max-w-[78px] justify-center">
                      <span className="text-[11px] font-bold text-white leading-tight truncate text-center">
                        {p.name}
                      </span>
                      {isMe && (
                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/20 px-1 rounded flex-shrink-0">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Card Count / Finished Rank */}
                    {isPlayerFinished ? (
                      <div className="flex items-center gap-0.5 mt-0.5 text-[10px] font-bold text-amber-400">
                        <span>{badgeInfo?.medal}</span>
                        <span>{badgeInfo?.shortLabel}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 mt-0.5 text-[10px] font-bold text-zinc-400">
                        <span>🃏</span>
                        <span>{cardCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Direction Arrow Between Players */}
                  {idx < players.length - 1 && (
                    <div className="flex items-center justify-center px-0.5 flex-shrink-0 text-zinc-600">
                      {direction === 1 ? (
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400/60" />
                      ) : (
                        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400/60" />
                      )}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Prominent Alert when a Skip Occurs */}
        {skippedInfo && (
          <div className="mt-2 px-1">
            {isMyTurnSkipped ? (
              <div className="w-full max-w-lg mx-auto p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-red-950/95 via-red-900/90 to-red-950/95 border-2 border-red-500 shadow-xl shadow-red-950/60 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-xl flex-shrink-0 shadow-md border border-red-400">
                  🚫
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-200 font-black text-xs uppercase tracking-wider">
                      Turn Skipped!
                    </span>
                    {skippedInfo.cardsDrawn > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-red-500 text-white font-black text-[10px]">
                        +{skippedInfo.cardsDrawn} CARDS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white font-semibold leading-tight mt-0.5">
                    <strong className="text-amber-300">{skippedInfo.playedByName}</strong> played{' '}
                    {skippedInfo.cardType === 'draw2'
                      ? 'a +2'
                      : skippedInfo.cardType === 'wild4'
                      ? 'a Wild +4'
                      : skippedInfo.cardType === 'reverse'
                      ? 'a Reverse'
                      : 'a Skip'} card!{' '}
                    {skippedInfo.cardsDrawn > 0
                      ? `You drew ${skippedInfo.cardsDrawn} cards and your turn was skipped.`
                      : 'Your turn was skipped and passed to the next player.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg mx-auto px-3 py-1.5 rounded-xl bg-zinc-900/95 border border-red-500/50 text-xs font-semibold text-zinc-200 shadow-md flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs flex-shrink-0">
                  🚫
                </span>
                <span className="truncate">
                  <strong className="text-white">{skippedInfo.playedByName}</strong> skipped{' '}
                  <strong className="text-red-400">{skippedInfo.playerName}</strong>
                  {skippedInfo.cardsDrawn > 0 ? ` (+${skippedInfo.cardsDrawn} cards)` : ''}!
                  Turn passed to <strong className="text-blue-300">{activePlayer?.name}</strong>.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Middle Section: The Table Arena */}
      <div className="relative my-auto flex flex-col items-center justify-center py-4 mt-1 sm:mt-2">
        {/* Active Card Stack Warning */}
        {pendingDrawCount > 0 && (
          <div className="mb-4 px-4 py-2 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white shadow-xl shadow-red-950/70 border-2 border-amber-300 flex items-center gap-2.5 animate-bounce max-w-sm mx-auto">
            <Flame className="w-5 h-5 text-amber-200 fill-amber-300 animate-pulse flex-shrink-0" />
            <div className="text-left">
              <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <span>Stack Penalty Active!</span>
                <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-300 font-extrabold text-xs">
                  +{pendingDrawCount} CARDS
                </span>
              </div>
              <p className="text-[10px] text-amber-100 font-bold leading-tight">
                {isCurrentTurnForMe
                  ? myCanStack
                    ? `Play a ${pendingStackType === 'draw2' ? '+2' : '+4'} to counter, or click Draw Pile to take +${pendingDrawCount} cards!`
                    : `No counter in hand! Click the Draw Pile to draw +${pendingDrawCount} cards.`
                  : `Waiting for ${activePlayer?.name} to counter or draw +${pendingDrawCount}...`}
              </p>
            </div>
          </div>
        )}

        {/* Center Card Play Area (Draw Pile & Discard Pile) */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Draw Pile */}
          <div ref={drawPileRef} className="flex flex-col items-center">
            <div className="relative group">
              {/* Stack effect */}
              <div className="absolute inset-0 bg-zinc-900 rounded-xl translate-x-1.5 translate-y-1.5 border border-zinc-800 pointer-events-none" />
              <div className="absolute inset-0 bg-zinc-950 rounded-xl translate-x-0.5 translate-y-0.5 border border-zinc-800 pointer-events-none" />

              <UnoCard
                isBack
                size="md"
                onClick={canDrawCard ? onDrawCard : undefined}
                className={
                  canDrawCard
                    ? pendingDrawCount > 0
                      ? 'cursor-pointer ring-4 ring-red-500 hover:scale-105 active:scale-95 shadow-2xl shadow-red-600/50 animate-pulse'
                      : 'cursor-pointer ring-2 ring-amber-400/80 hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/10'
                    : 'cursor-not-allowed opacity-75'
                }
              />
            </div>
            <span
              className={`text-[11px] font-semibold mt-2 ${
                pendingDrawCount > 0 && isCurrentTurnForMe
                  ? 'text-red-400 font-black animate-pulse'
                  : hasDrawnCardThisTurn && isCurrentTurnForMe
                  ? 'text-amber-400 font-medium'
                  : 'text-zinc-400'
              }`}
            >
              {pendingDrawCount > 0
                ? `Draw +${pendingDrawCount} Penalty`
                : hasDrawnCardThisTurn && isCurrentTurnForMe
                ? 'Card Drawn (Play or Pass)'
                : `Draw Pile (${drawPileCount})`}
            </span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Vibrant active color halo glow */}
              <div
                className="absolute -inset-3 rounded-2xl blur-xl opacity-75 transition-all duration-500 pointer-events-none"
                style={{
                  backgroundColor: activeColorConfig.hex || '#ef4444',
                  boxShadow: `0 0 35px 8px ${activeColorConfig.hex || '#ef4444'}50`,
                }}
              />

              {/* Stack effect representing underneath cards */}
              <div className="absolute inset-0 bg-zinc-800/90 rounded-xl rotate-6 translate-x-1.5 translate-y-1 border border-white/20 shadow-md pointer-events-none" />
              <div className="absolute inset-0 bg-zinc-700/90 rounded-xl -rotate-4 -translate-x-1 translate-y-0.5 border border-white/20 shadow-md pointer-events-none" />

              {/* Floating Active Color Badge when top card is Wild */}
              {topCard?.color === CARD_COLORS.WILD && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-lg border flex items-center gap-1 whitespace-nowrap ${activeColorConfig.bg} ${activeColorConfig.border}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>Declared: {activeColorConfig.name}</span>
                </div>
              )}

              <UnoCard
                card={topCard}
                size="md"
                isPlayable={false}
                activeColor={activeColor}
                style={{ transform: 'rotate(-2deg)' }}
                className="relative z-10 shadow-2xl border-white ring-3 ring-white/90 brightness-105"
              />
            </div>

            {/* Discard Pile label with active color */}
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-zinc-400">
              <span>Discard Pile</span>
              <span className="text-zinc-600">•</span>
              <span
                className="font-bold flex items-center gap-1"
                style={{ color: activeColorConfig.hex || '#ef4444' }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block shadow-sm"
                  style={{ backgroundColor: activeColorConfig.hex || '#ef4444' }}
                />
                {activeColorConfig.name}
              </span>
            </div>
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white block leading-tight">
                    {myPlayer.name} (You)
                  </span>
                  {handCards.length === 1 && (hasCalledUnoThisRound || unoCalledPlayers?.has(myPlayer?.id)) && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[8px] font-black tracking-wider shadow-sm">
                      UNO!
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400">
                  {handCards.length} card{handCards.length !== 1 ? 's' : ''} left
                </span>
              </div>
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
                disabled={hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider border flex items-center gap-1.5 transition select-none ${
                  (hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id)))
                    ? 'bg-zinc-800/90 border-emerald-500/40 text-emerald-300 opacity-90 cursor-default'
                    : 'bg-red-700 hover:bg-red-600 active:scale-95 text-white border-red-500/50 shadow-sm cursor-pointer'
                }`}
                title={
                  (hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id)))
                    ? 'UNO already called!'
                    : 'Call UNO!'
                }
              >
                {(hasCalledUnoThisRound || (unoCalledPlayers && unoCalledPlayers.has(myPlayer?.id))) ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>UNO Called</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Call UNO!</span>
                  </>
                )}
              </button>
            )}

            {/* Pass Turn Button (after drawing a card) */}
            {isCurrentTurnForMe && hasDrawnCardThisTurn && pendingDrawCount === 0 && (
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
            isSpectating
              ? 'bg-zinc-900 text-zinc-300 border border-zinc-800/80 flex items-center justify-center gap-2'
              : isCurrentTurnForMe
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800/80'
          }`}
        >
          {isSpectating ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span>
                Spectating: {activePlayer?.name}&apos;s turn • {activePlayers.length} players remaining
              </span>
            </>
          ) : isCurrentTurnForMe ? (
            pendingDrawCount > 0 ? (
              myCanStack ? (
                <span className="text-amber-300 font-bold flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Stack Alert: Play a {pendingStackType === 'draw2' ? '+2' : '+4'} to counter, or click Draw Pile to take +{pendingDrawCount} cards!
                </span>
              ) : (
                <span className="text-red-400 font-bold flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-400" /> Stack Penalty: No counter in hand! Click the Draw Pile to draw +{pendingDrawCount} cards.
                </span>
              )
            ) : hasDrawnCardThisTurn ? (
              <span>You drew a card! Play it if valid, or click &quot;Pass Turn&quot;.</span>
            ) : myCanPlayAnyCard ? (
              <span>Your Turn — Select a card from your hand to play!</span>
            ) : (
              <span>No playable cards! Click the Draw Pile to draw a card.</span>
            )
          ) : isMyTurnSkipped ? (
            <span className="text-red-400 font-bold">
              🚫 Your turn was skipped! Waiting for {activePlayer?.name}&apos;s move...
            </span>
          ) : skippedInfo ? (
            <span>
              🚫 {skippedInfo.playerName} was skipped. Waiting for {activePlayer?.name}&apos;s move...
            </span>
          ) : isWaitingForBot ? (
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{activePlayer?.name} is thinking...</span>
            </span>
          ) : (
            <span>
              Waiting for {activePlayer?.name}&apos;s move...
            </span>
          )}
        </div>

        {isSpectating ? (
          <div className="w-full max-w-lg mx-auto p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800/90 text-center space-y-3 shadow-2xl animate-fadeIn my-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
              <span className="text-base">{getRankBadge(myPlayerRank).medal}</span>
              <span>You Finished {getRankBadge(myPlayerRank).label}!</span>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-black text-white flex items-center justify-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Spectator Mode Active</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </h4>
              <p className="text-xs text-zinc-300 max-w-xs mx-auto leading-relaxed">
                {activePlayers.length > 1
                  ? `You cleared all your cards! Sit back and spectate while the remaining ${activePlayers.length} players battle for the finish.`
                  : 'The remaining players are finishing up the match!'}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-center gap-4 text-[11px] text-zinc-400">
              <div>
                Active Turn: <strong className="text-amber-300 font-bold">{activePlayer?.name || '...'}</strong>
              </div>
              <span>•</span>
              <div>
                Next: <strong className="text-blue-300 font-bold">{nextPlayer?.name || '...'}</strong>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Hand Toolbar: Sorting Options & Scroll controls */}
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

            {/* Player's Hand Horizontal Tray */}
            <div
              ref={handTrayRef}
              onWheel={handleTrayWheel}
              className="w-full overflow-x-auto pb-2 pt-4 touch-pan-x overscroll-x-contain select-none scroll-smooth"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 px-1 min-w-max">
                {displayedHandCards.map((card) => {
                  const isPlayable =
                    isCurrentTurnForMe &&
                    canPlayCard(card, topCard, activeColor, pendingDrawCount, pendingStackType)
                  const isNewlyDrawn = newlyDrawnCardIds.has(card.id)
                  const isFlying = flyingCards.some((fc) => fc.card.id === card.id)

                  return (
                    <div
                      key={card.id}
                      className={`relative transition-all duration-300 flex-shrink-0 touch-pan-x ${
                        isFlying ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
                      }`}
                    >
                      {/* Bouncing "NEW" pill badge above freshly drawn cards */}
                      {isNewlyDrawn && !isFlying && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black text-[8px] sm:text-[9px] uppercase tracking-wider shadow-lg border border-amber-300 flex items-center gap-0.5 animate-bounce pointer-events-none whitespace-nowrap">
                          <span>✨</span>
                          <span>NEW</span>
                        </div>
                      )}

                      <UnoCard
                        card={card}
                        size="md"
                        isPlayable={isPlayable}
                        onClick={isPlayable ? () => handlePlayCardWithBadgeClear(card) : undefined}
                        className={
                          isNewlyDrawn && !isFlying
                            ? 'ring-3 ring-amber-400 shadow-xl shadow-amber-500/40 -translate-y-1'
                            : isPlayable
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
          </>
        )}
      </div>

      {/* Flying Cards Animation Layer: cards flying from Draw Pile down into the Hand */}
      {flyingCards.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {flyingCards.map((fc) => {
            const isFlying = fc.phase === 'flying'
            return (
              <div
                key={fc.animId}
                className="absolute transition-all ease-out duration-500 will-change-transform"
                style={{
                  left: 0,
                  top: 0,
                  transform: isFlying
                    ? `translate3d(${fc.targetX}px, ${fc.targetY}px, 0) scale(1) rotate(0deg)`
                    : `translate3d(${fc.startX}px, ${fc.startY}px, 0) scale(0.65) rotate(-12deg)`,
                  opacity: isFlying ? 1 : 0.9,
                }}
              >
                <div
                  className={`transition-transform duration-300 ${
                    isFlying ? 'rotate-y-0' : 'rotate-y-180'
                  }`}
                  style={{ perspective: 600 }}
                >
                  <div className="relative shadow-2xl rounded-xl ring-4 ring-amber-400/90 shadow-amber-500/40">
                    <UnoCard
                      card={fc.card}
                      isBack={!isFlying}
                      size="md"
                      isPlayable={false}
                    />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-zinc-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-0.5 whitespace-nowrap animate-bounce">
                      <span>✨ DRAW</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* In-Game Settings / Menu Modal */}
      <UnoSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isMultiplayer={isMultiplayer}
        isHost={isHost}
        roomCode={roomCode}
        onSyncState={onSyncState}
        onOpenRules={onOpenRules}
        onReturnToLobby={onReturnToLobby}
        onLeaveGame={onLeaveGame}
        connectionStatus={connectionStatus}
        onReconnect={onReconnect}
      />
    </div>
  )
}

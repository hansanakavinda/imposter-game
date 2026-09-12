import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
} from 'lucide-react'
import UnoCard from './UnoCard'
import UnoSettingsModal from './UnoSettingsModal'
import { COLOR_CONFIG, CARD_COLORS, getRankBadge } from '../constants/unoConstants'
import { canPlayCard, sortCardsByColor, sortCardsByNumber } from '../utils/deck'
import { getActivePlayers, findNextPlayerIndex } from '../utils/turnOrder'
import useDrawAnimation from '../hooks/useDrawAnimation'
import UnoDisconnectBanner from './board/UnoDisconnectBanner'
import UnoSkipAlert from './board/UnoSkipAlert'
import UnoStackBanner from './board/UnoStackBanner'
import UnoActionToast from './board/UnoActionToast'
import UnoFlyingCardsLayer from './board/UnoFlyingCardsLayer'
import UnoTurnTrack from './board/UnoTurnTrack'
import UnoTopBar from './board/UnoTopBar'
import UnoPileArea from './board/UnoPileArea'
import UnoPlayerActionRow from './board/UnoPlayerActionRow'
import UnoTurnPrompt from './board/UnoTurnPrompt'
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
        {isMultiplayer && !isHost && connectionStatus === 'disconnected' && (
          <UnoDisconnectBanner
            onReconnect={onReconnect}
            onOpenMenu={() => setIsSettingsOpen(true)}
          />
        )}

        {/* Unified Top Utility Bar: Room Info, Direction Indicator, and Actions */}
        <UnoTopBar
          isMultiplayer={isMultiplayer}
          isHost={isHost}
          roomCode={roomCode}
          connectionStatus={connectionStatus}
          direction={direction}
          onSyncState={onSyncState}
          isSyncing={isSyncing}
          onSync={handleHeaderSync}
          onOpenMenu={() => setIsSettingsOpen(true)}
        />

        {/* Players Turn Flow Row with Direction Arrows */}
        <UnoTurnTrack
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          nextPlayerIndex={nextPlayerIndex}
          direction={direction}
          myPlayer={myPlayer}
          handCards={handCards}
          rankings={rankings}
          unoCalledPlayers={unoCalledPlayers}
          skippedInfo={skippedInfo}
          onCatchUno={onCatchUno}
          activeNodeRef={activeNodeRef}
        />

        {skippedInfo && (
          <UnoSkipAlert
            skippedInfo={skippedInfo}
            isMyTurnSkipped={isMyTurnSkipped}
            activePlayer={activePlayer}
          />
        )}
      </div>

      {/* 2. Middle Section: The Table Arena */}
      <div className="relative my-auto flex flex-col items-center justify-center py-4 mt-1 sm:mt-2">
        {pendingDrawCount > 0 && (
          <UnoStackBanner
            pendingDrawCount={pendingDrawCount}
            pendingStackType={pendingStackType}
            isCurrentTurnForMe={isCurrentTurnForMe}
            myCanStack={myCanStack}
            activePlayer={activePlayer}
          />
        )}

        {/* Center Card Play Area (Draw Pile & Discard Pile) */}
        <UnoPileArea
          drawPileRef={drawPileRef}
          drawPileCount={drawPileCount}
          canDrawCard={canDrawCard}
          onDrawCard={onDrawCard}
          isCurrentTurnForMe={isCurrentTurnForMe}
          hasDrawnCardThisTurn={hasDrawnCardThisTurn}
          pendingDrawCount={pendingDrawCount}
          topCard={topCard}
          activeColor={activeColor}
          activeColorConfig={activeColorConfig}
        />

        {actionMessage && <UnoActionToast actionMessage={actionMessage} />}
      </div>

      {/* 3. Bottom Section: Player Hand & Controls */}
      <div className="w-full pb-2 pt-3 border-t border-zinc-900 space-y-2">
        {/* Turn Bar & Status */}
        <UnoPlayerActionRow
          myPlayer={myPlayer}
          handCards={handCards}
          isCurrentTurnForMe={isCurrentTurnForMe}
          hasDrawnCardThisTurn={hasDrawnCardThisTurn}
          hasCalledUnoThisRound={hasCalledUnoThisRound}
          unoCalledPlayers={unoCalledPlayers}
          showUnoButton={showUnoButton}
          pendingDrawCount={pendingDrawCount}
          onCallUno={onCallUno}
          onPassTurn={onPassTurn}
        />

        {/* Turn Prompt Banner */}
        <UnoTurnPrompt
          isSpectating={isSpectating}
          isCurrentTurnForMe={isCurrentTurnForMe}
          isMyTurnSkipped={isMyTurnSkipped}
          isWaitingForBot={isWaitingForBot}
          activePlayer={activePlayer}
          activePlayers={activePlayers}
          skippedInfo={skippedInfo}
          hasDrawnCardThisTurn={hasDrawnCardThisTurn}
          myCanPlayAnyCard={myCanPlayAnyCard}
          myCanStack={myCanStack}
          pendingDrawCount={pendingDrawCount}
          pendingStackType={pendingStackType}
        />

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

      {flyingCards.length > 0 && <UnoFlyingCardsLayer flyingCards={flyingCards} />}

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

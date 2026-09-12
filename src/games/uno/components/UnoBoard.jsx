import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import UnoSettingsModal from './UnoSettingsModal'
import { COLOR_CONFIG, CARD_COLORS } from '../constants/unoConstants'
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
import UnoSpectatorPanel from './board/UnoSpectatorPanel'
import UnoHandToolbar from './board/UnoHandToolbar'
import UnoHandTray from './board/UnoHandTray'
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
          <UnoSpectatorPanel
            myPlayerRank={myPlayerRank}
            activePlayer={activePlayer}
            activePlayers={activePlayers}
            nextPlayer={nextPlayer}
          />
        ) : (
          <>
            {/* Hand Toolbar: Sorting Options & Scroll controls */}
            <UnoHandToolbar
              handCards={handCards}
              handSortMode={handSortMode}
              setHandSortMode={setHandSortMode}
              scrollTray={scrollTray}
            />

            {/* Player's Hand Horizontal Tray */}
            <UnoHandTray
              handTrayRef={handTrayRef}
              displayedHandCards={displayedHandCards}
              isCurrentTurnForMe={isCurrentTurnForMe}
              topCard={topCard}
              activeColor={activeColor}
              pendingDrawCount={pendingDrawCount}
              pendingStackType={pendingStackType}
              newlyDrawnCardIds={newlyDrawnCardIds}
              flyingCards={flyingCards}
              onPlayCard={handlePlayCardWithBadgeClear}
              onWheel={handleTrayWheel}
            />
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

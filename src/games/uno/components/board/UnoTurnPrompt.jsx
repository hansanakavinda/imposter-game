import React from 'react'
import { Flame, Sparkles } from 'lucide-react'

/** What the player should do right now -- eight mutually exclusive states. */
export default function UnoTurnPrompt({
  isSpectating,
  isCurrentTurnForMe,
  isMyTurnSkipped,
  isWaitingForBot,
  activePlayer,
  activePlayers,
  skippedInfo,
  hasDrawnCardThisTurn,
  myCanPlayAnyCard,
  myCanStack,
  pendingDrawCount,
  pendingStackType,
}) {
  return (
    <div
      className={`py-1.5 px-3 rounded-xl text-center text-xs font-bold transition-all ${
        isSpectating
          ? 'bg-felt text-ink border border-edge flex items-center justify-center gap-2'
          : isCurrentTurnForMe
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
          : 'bg-felt text-ink-muted border border-edge'
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
  )
}

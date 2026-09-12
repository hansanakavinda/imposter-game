import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, RotateCcw, ArrowRight } from 'lucide-react'
import { getRankBadge } from '../constants/unoConstants'
import { playVictorySound, playClickSound } from '../../../utils/sound'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Label from '../../../components/ui/Label'
import { Badge } from '../../../components/ui/PlayerRow'
import { cx } from '../../../components/ui/tokens'

export default function UnoGameOverModal({
  winner,
  players = [],
  rankings = [],
  myPlayerId = 0,
  onPlayAgain,
  onResetToLobby,
}) {
  // Find local player's standing
  const myPlayer = players.find((p) => p.id === myPlayerId)
  const myRanking = rankings.find((r) => r.playerId === myPlayerId)
  const isHumanWinner =
    (winner && (winner.isHuman || winner.id === myPlayerId)) ||
    (myRanking && myRanking.rank === 1)

  useEffect(() => {
    if (isHumanWinner) {
      playVictorySound()
      try {
        confetti({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.6 },
        })
      } catch {
        // ignore
      }
    }
  }, [isHumanWinner])

  if (!winner && rankings.length === 0) return null

  // Build sorted standings list
  let sortedStandings = []
  if (rankings.length > 0) {
    // Sort by rank ascending (1, 2, 3...)
    sortedStandings = [...rankings].sort((a, b) => a.rank - b.rank)
    // If some players didn't get into rankings for any reason, append them
    players.forEach((p) => {
      if (!sortedStandings.some((r) => r.playerId === p.id)) {
        const cardsLeft = p.hand?.length ?? p.cardCount ?? 0
        sortedStandings.push({
          playerId: p.id,
          name: p.name,
          avatar: p.avatar,
          isHuman: p.isHuman,
          rank: sortedStandings.length + 1,
          remainingCards: cardsLeft,
        })
      }
    })
  } else {
    // Fallback: winner is rank 1, others sorted by card count ascending
    const firstPlace = winner || players[0]
    const others = players
      .filter((p) => p.id !== firstPlace?.id)
      .sort((a, b) => {
        const countA = a.hand?.length ?? a.cardCount ?? 0
        const countB = b.hand?.length ?? b.cardCount ?? 0
        return countA - countB
      })

    sortedStandings = [
      {
        playerId: firstPlace.id,
        name: firstPlace.name,
        avatar: firstPlace.avatar,
        isHuman: firstPlace.isHuman,
        rank: 1,
        remainingCards: 0,
      },
      ...others.map((p, idx) => ({
        playerId: p.id,
        name: p.name,
        avatar: p.avatar,
        isHuman: p.isHuman,
        rank: idx + 2,
        remainingCards: p.hand?.length ?? p.cardCount ?? 0,
      })),
    ]
  }

  const champion = sortedStandings[0] || winner
  const myRankNum = myRanking?.rank || (myPlayer?.id === champion?.playerId ? 1 : null)
  const myBadge = myRankNum ? getRankBadge(myRankNum) : null

  return (
    <Modal
      open
      dismissible={false}
      size="sm"
      className="text-center"
      footer={
        <div className="space-y-2">
          {onPlayAgain && (
            <Button
              tone="uno"
              fullWidth
              onClick={() => {
                playClickSound()
                onPlayAgain()
              }}
            >
              Deal again
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {onResetToLobby && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                playClickSound()
                onResetToLobby()
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Back to the lobby
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 pt-1">
        <div className="relative mx-auto w-16 h-16 rounded-object bg-uno/15 border border-uno/40 flex items-center justify-center text-uno shadow-lift-2">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-uno">Hands are down</Label>
          <h2 className="font-display text-3xl leading-none text-ink">
            {isHumanWinner ? 'You won' : `${champion?.name || 'Player'} won`}
          </h2>
          <p className="text-mini text-ink-muted">
            {isHumanWinner
              ? 'Empty hand, first at the table.'
              : myBadge
              ? `You finished ${myBadge.label}.`
              : 'Every hand is resolved. Final standings below.'}
          </p>
        </div>

        <div className="space-y-1.5 text-left rounded-object bg-well border border-edge shadow-sink p-3 max-h-56 overflow-y-auto scrollbar-none">
          <div className="flex items-center justify-between px-1 pb-1.5 border-b border-edge">
            <Label>Player</Label>
            <Label>Finished with</Label>
          </div>

          {sortedStandings.map((p) => {
            const badge = getRankBadge(p.rank)
            const isMe = p.playerId === myPlayerId || p.isHuman
            const isWinnerItem = p.rank === 1

            return (
              <div
                key={p.playerId}
                className={cx(
                  'flex items-center justify-between gap-2 p-2 rounded-well text-mini border',
                  isWinnerItem
                    ? 'bg-uno/10 border-uno/30 text-uno'
                    : isMe
                    ? 'bg-felt-high border-edge-lit text-ink'
                    : 'bg-felt border-edge text-ink-muted'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-nano w-4 shrink-0">{p.rank}</span>
                  <span className="text-base shrink-0">{p.avatar || '😎'}</span>
                  <span className="truncate font-bold">{p.name}</span>
                  {isMe && <Badge>You</Badge>}
                </span>

                <span className="shrink-0 font-mono text-nano">
                  {p.remainingCards === 0
                    ? badge.shortLabel
                    : `${p.remainingCards} card${p.remainingCards !== 1 ? 's' : ''}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

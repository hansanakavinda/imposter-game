import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, RotateCcw, ArrowLeft, ArrowRight } from 'lucide-react'
import { getRankBadge } from '../constants/unoConstants'
import { playVictorySound, playClickSound } from '../../../utils/sound'

export default function UnoGameOverModal({
  winner,
  players = [],
  rankings = [],
  myPlayerId = 0,
  onPlayAgain,
  onResetToLobby,
  onBackToMenu,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-scaleUp">
        {/* Trophy icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <Trophy className="w-8 h-8" />
          <div className="absolute -top-1 -right-1 text-base">✨</div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Tournament Complete
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isHumanWinner
              ? '🎉 You Won 1st Place!'
              : `${champion?.name || 'Player'} Won!`}
          </h2>
          <p className="text-xs text-zinc-400">
            {isHumanWinner
              ? 'Flawless victory! You emptied your hand before everyone else!'
              : myBadge
              ? `Great match! You secured ${myBadge.label} (${myBadge.medal})!`
              : 'All hands have been resolved. Check final standings below.'}
          </p>
        </div>

        {/* Players Standings (Podium Leaderboard) */}
        <div className="space-y-1.5 text-left bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3 max-h-56 overflow-y-auto scrollbar-none">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/60 px-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Rank & Player</span>
            <span>Outcome</span>
          </div>

          {sortedStandings.map((p) => {
            const badge = getRankBadge(p.rank)
            const isMe = p.playerId === myPlayerId || p.isHuman
            const isWinnerItem = p.rank === 1

            return (
              <div
                key={p.playerId}
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition ${
                  isWinnerItem
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : isMe
                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                    : 'bg-zinc-900/60 text-zinc-300 border border-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{badge.medal}</span>
                  <span className="text-base flex-shrink-0">{p.avatar || '😎'}</span>
                  <span className="truncate max-w-[110px] sm:max-w-[130px] font-bold">
                    {p.name}
                  </span>
                  {isMe && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 flex-shrink-0">
                      You
                    </span>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  {p.remainingCards === 0 ? (
                    <span className="text-[11px] font-bold text-emerald-400">
                      {badge.shortLabel} Place
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-zinc-400">
                      {p.remainingCards} card{p.remainingCards !== 1 ? 's' : ''} left
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {onPlayAgain && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onPlayAgain()
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-white hover:bg-zinc-200 text-zinc-950 transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Play Again</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {onResetToLobby && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onResetToLobby()
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700/50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to Lobby</span>
            </button>
          )}

          {onBackToMenu && (
            <button
              type="button"
              onClick={() => {
                playClickSound()
                onBackToMenu()
              }}
              className="w-full py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Game Menu</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

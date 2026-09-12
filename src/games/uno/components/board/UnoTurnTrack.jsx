import React from 'react'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { getRankBadge } from '../../constants/unoConstants'
import { playClickSound } from '../../../../utils/sound'

/** Seat order, whose turn it is, and the catch-UNO target. */
export default function UnoTurnTrack({
  players,
  currentPlayerIndex,
  nextPlayerIndex,
  direction,
  myPlayer,
  handCards,
  rankings,
  unoCalledPlayers,
  skippedInfo,
  onCatchUno,
  activeNodeRef,
}) {
  return (
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
                    ? 'bg-felt border border-amber-500/30 opacity-75'
                    : isSkipped
                    ? 'bg-red-950/70 border-2 border-red-500 shadow-lg shadow-red-950/50 ring-2 ring-red-500/40 animate-pulse'
                    : isActive
                    ? 'bg-amber-500/20 border-2 border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/50 scale-105 z-10'
                    : isNext
                    ? 'bg-blue-950/40 border-2 border-blue-400/60 shadow-md shadow-blue-500/10'
                    : 'bg-felt border border-edge opacity-80'
                }`}
              >
                {/* Status Badges */}
                {isPlayerFinished ? (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-nano uppercase tracking-wider shadow">
                    {badgeInfo?.medal} {badgeInfo?.shortLabel}
                  </span>
                ) : isSkipped ? (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-nano uppercase tracking-wider shadow animate-bounce">
                    SKIPPED
                  </span>
                ) : hasUno && calledUno ? (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-nano uppercase tracking-wider shadow border border-red-400 flex items-center gap-0.5">
                    UNO!
                  </span>
                ) : isActive ? (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-table font-bold text-nano uppercase tracking-wider shadow">
                    TURN
                  </span>
                ) : isNext ? (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-bold text-nano uppercase tracking-wider shadow">
                    NEXT
                  </span>
                ) : null}

                {/* Avatar with Status Ring */}
                <div className="relative">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl shadow-inner ${
                      isPlayerFinished
                        ? 'bg-felt border-2 border-amber-400/50'
                        : isSkipped
                        ? 'bg-red-950 border border-red-500/60'
                        : isActive
                        ? 'bg-felt-high border-2 border-amber-400'
                        : 'bg-felt-high border border-edge-lit'
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
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-400 border-2 border-edge rounded-full animate-ping" />
                  )}
                </div>

                {/* Name & Badge */}
                <div className="flex items-center gap-0.5 mt-1 max-w-[78px] justify-center">
                  <span className="text-micro font-bold text-white leading-tight truncate text-center">
                    {p.name}
                  </span>
                  {isMe && (
                    <span className="text-nano font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded flex-shrink-0">
                      YOU
                    </span>
                  )}
                </div>

                {/* Card Count / Finished Rank */}
                {isPlayerFinished ? (
                  <div className="flex items-center gap-0.5 mt-0.5 text-nano font-bold text-amber-400">
                    <span>{badgeInfo?.medal}</span>
                    <span>{badgeInfo?.shortLabel}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 mt-0.5 text-nano font-bold text-ink-muted">
                    <span>🃏</span>
                    <span>{cardCount}</span>
                  </div>
                )}
              </div>

              {/* Direction Arrow Between Players */}
              {idx < players.length - 1 && (
                <div className="flex items-center justify-center px-0.5 flex-shrink-0 text-ink-faint">
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
  )
}

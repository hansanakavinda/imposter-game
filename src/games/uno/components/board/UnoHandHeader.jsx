import React from 'react'
import { ArrowUpDown, Check, SkipForward } from 'lucide-react'
import Button from '../../../../components/ui/Button'
import IconButton from '../../../../components/ui/IconButton'
import { cx } from '../../../../components/ui/tokens'

const SORT_LABEL = {
  none: 'Sort by colour',
  color: 'Sort by number',
  number: 'Unsort',
}

const SORT_NEXT = { none: 'color', color: 'number', number: 'none' }

const SORT_CAPTION = { none: null, color: 'by colour', number: 'by number' }

/**
 * The line between the table and your hand: who you are, how many you hold,
 * and the two things you can do that are not playing a card.
 *
 * Sorting used to be a whole toolbar row of segmented buttons plus a pair of
 * scroll chevrons. The chevrons existed because the hand did not fit, which
 * the shingled tray fixes, and three sort buttons for a three-state setting is
 * two buttons too many -- it cycles.
 */
function UnoHandHeader({
  myPlayer,
  handCards,
  isCurrentTurnForMe,
  hasDrawnCardThisTurn,
  hasCalledUnoThisRound,
  unoCalledPlayers,
  pendingDrawCount,
  onCallUno,
  onPassTurn,
  handSortMode,
  onCycleSort,
  isSpectating,
}) {
  const called = hasCalledUnoThisRound || unoCalledPlayers?.has?.(myPlayer?.id)
  // Shown from two cards, so you can still call ahead of going down to one --
  // which the rules allow and the engine tests. It used to be on the whole
  // game, which made a permanently lit red button the loudest thing on screen.
  const showUno = !isSpectating && handCards.length > 0 && handCards.length <= 2
  const showPass = isCurrentTurnForMe && hasDrawnCardThisTurn && pendingDrawCount === 0

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-mini font-bold text-ink truncate">
          {myPlayer?.name || 'You'}
        </span>
        <span className="font-mono text-mini text-ink-faint shrink-0">{handCards.length}</span>
        {SORT_CAPTION[handSortMode] && (
          <span className="text-nano text-ink-faint shrink-0">{SORT_CAPTION[handSortMode]}</span>
        )}
      </span>

      <span className="flex-1" />

      {!isSpectating && handCards.length > 1 && (
        <IconButton
          size="sm"
          label={SORT_LABEL[handSortMode]}
          active={handSortMode !== 'none'}
          onClick={() => onCycleSort(SORT_NEXT[handSortMode])}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </IconButton>
      )}

      {showPass && (
        <Button variant="secondary" size="sm" onClick={onPassTurn}>
          <SkipForward className="w-3.5 h-3.5" />
          Pass
        </Button>
      )}

      {showUno && (
        <Button
          size="sm"
          tone={called ? 'ok' : 'uno'}
          variant={called ? 'secondary' : 'primary'}
          disabled={called}
          onClick={onCallUno}
          className={cx(!called && 'uppercase tracking-wide')}
        >
          {called ? <Check className="w-3.5 h-3.5" /> : null}
          {called ? 'UNO called' : 'Call UNO'}
        </Button>
      )}
    </div>
  )
}

export default React.memo(UnoHandHeader)

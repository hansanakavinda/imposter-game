import React, { useLayoutEffect, useRef, useState } from 'react'
import UnoCard from '../UnoCard'
import { cx } from '../../../../components/ui/tokens'

/** Card width at size="lg", and the most a card may be covered by its neighbour. */
const CARD_WIDTH = 80
const MIN_STEP = 30
const EDGE_PADDING = 16

/**
 * Your hand, shingled.
 *
 * It used to be a flat row with real gaps, which meant about four and a half
 * of an opening seven fitted a phone -- you scrolled to see your own hand, and
 * a whole toolbar of chevrons existed to help you do it. Cards overlap now, by
 * whatever amount makes the hand fit, the way you would actually hold them.
 * Each card still shows its left edge and corner index, so a covered card is
 * identifiable, and the playable ones lift clear of the shingle.
 *
 * Past about ten cards the overlap hits its floor and the row scrolls -- but
 * by then you are losing anyway.
 */
function UnoHandTray({
  handTrayRef,
  displayedHandCards,
  isCurrentTurnForMe,
  playableIds,
  newlyDrawnCardIds,
  flyingCards,
  onPlayCard,
  onWheel,
  onStepChange,
}) {
  const measureRef = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  const count = displayedHandCards.length
  // How far apart the cards sit. Full width while they fit, then tightening,
  // never past the point where a corner index would be covered.
  const available = Math.max(width - EDGE_PADDING * 2 - CARD_WIDTH, 0)
  const step =
    count > 1 ? Math.max(MIN_STEP, Math.min(CARD_WIDTH + 6, available / (count - 1))) : CARD_WIDTH

  // The draw animation lands cards on these same slots.
  const reportedStep = useRef(null)
  useLayoutEffect(() => {
    if (onStepChange && reportedStep.current !== step) {
      reportedStep.current = step
      onStepChange(step)
    }
  }, [step, onStepChange])

  return (
    <div ref={measureRef} className="w-full">
      <div
        ref={handTrayRef}
        onWheel={onWheel}
        className="w-full overflow-x-auto scrollbar-none touch-pan-x overscroll-x-contain select-none scroll-smooth pt-5 pb-1"
      >
        <div className="flex items-end min-w-max mx-auto px-4">
          {displayedHandCards.map((card, index) => {
            const isPlayable = isCurrentTurnForMe && playableIds.has(card.id)
            const isNewlyDrawn = newlyDrawnCardIds.has(card.id)
            const isFlying = flyingCards.some((fc) => fc.card.id === card.id)

            return (
              <div
                key={card.id}
                className={cx(
                  'relative shrink-0 touch-pan-x transition-transform duration-200',
                  isFlying && 'opacity-0',
                  isPlayable && '-translate-y-2.5'
                )}
                style={{
                  marginLeft: index === 0 ? 0 : step - CARD_WIDTH,
                  // A lifted card has to sit above the one covering it.
                  zIndex: isPlayable || isNewlyDrawn ? 40 + index : index,
                }}
              >
                {isNewlyDrawn && !isFlying && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 z-50 px-1.5 py-px rounded-full bg-lamp text-table font-bold text-nano uppercase pointer-events-none">
                    New
                  </span>
                )}

                <UnoCard
                  card={card}
                  size="lg"
                  isPlayable={isPlayable}
                  onClick={isPlayable ? onPlayCard : undefined}
                  className={cx(
                    isNewlyDrawn && !isFlying && 'ring-2 ring-lamp',
                    isPlayable && 'shadow-lift-2',
                    !isPlayable && isCurrentTurnForMe && 'opacity-70',
                    !isPlayable && !isCurrentTurnForMe && 'opacity-90'
                  )}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default React.memo(UnoHandTray)

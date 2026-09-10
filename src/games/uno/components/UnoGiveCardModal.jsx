import React, { useState } from 'react'
import UnoCard from './UnoCard'
import { playClickSound } from '../../../utils/sound'
import { Gift, Trophy } from 'lucide-react'

export default function UnoGiveCardModal({
  isOpen,
  targetPlayerName = 'Player',
  hand = [],
  onGiveCard,
}) {
  const [selectedCardId, setSelectedCardId] = useState(null)

  if (!isOpen || hand.length === 0) return null

  const isLastCard = hand.length === 1

  const effectiveSelectedCardId =
    selectedCardId && hand.some((c) => c.id === selectedCardId)
      ? selectedCardId
      : isLastCard
      ? hand[0]?.id || null
      : null

  const selectedCard =
    hand.find((c) => c.id === effectiveSelectedCardId) || null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="text-center space-y-1 pb-3 border-b border-zinc-800">
          <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1">
            <Gift className="w-6 h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Give a Card to {targetPlayerName}
          </h3>
          <p className="text-xs text-zinc-400">
            {targetPlayerName} forgot to call UNO! Choose 1 card from your hand to hand over.
          </p>
        </div>

        {/* Special Celebration Banner if player has only 1 card */}
        {isLastCard && (
          <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-2.5 shadow-lg shadow-amber-950/40 animate-pulse">
            <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              This is your last card! Giving it away will finish and complete the game for you!
            </span>
          </div>
        )}

        {/* Scrollable Card Selection Tray */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 text-center">
            Select 1 card to give:
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {hand.map((card) => {
              const isSelected = card.id === (selectedCard?.id)
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    playClickSound()
                    setSelectedCardId(card.id)
                  }}
                  className={`relative cursor-pointer transition-all duration-200 transform rounded-xl ${
                    isSelected
                      ? 'scale-110 ring-4 ring-amber-400 shadow-xl shadow-amber-500/30 z-10'
                      : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                >
                  <UnoCard
                    card={card}
                    size="md"
                    isPlayable={true}
                    onClick={() => {
                      playClickSound()
                      setSelectedCardId(card.id)
                    }}
                  />
                  {isSelected && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[9px] uppercase tracking-wider shadow">
                      SELECTED
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-zinc-800">
          <button
            type="button"
            disabled={!selectedCard}
            onClick={() => {
              if (!selectedCard) return
              playClickSound()
              onGiveCard(selectedCard)
            }}
            className={`w-full py-3 px-4 rounded-2xl font-black text-sm text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${
              !selectedCard
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/60'
                : isLastCard
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 shadow-amber-950/50 cursor-pointer'
                : 'bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 shadow-red-950/50 cursor-pointer'
            }`}
          >
            {isLastCard ? (
              <>
                <Trophy className="w-4 h-4" />
                <span>Give Last Card &amp; Win!</span>
              </>
            ) : selectedCard ? (
              <>
                <Gift className="w-4 h-4" />
                <span>
                  Give {selectedCard.color !== 'wild' && selectedCard.color ? `${selectedCard.color} ` : ''}
                  {selectedCard.label || 'Card'} to {targetPlayerName}
                </span>
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 text-zinc-500" />
                <span>Tap a card above to select</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

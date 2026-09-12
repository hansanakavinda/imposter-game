import React, { useState } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { playCardFlipSound, playRevealSound, playClickSound } from '../../../utils/sound'
import Screen from '../../../components/ui/Screen'
import Button from '../../../components/ui/Button'
import Label from '../../../components/ui/Label'

export default function PassCardScreen({
  players,
  gameData,
  currentPlayerIndex,
  onNextPlayer,
  onFinishPass,
}) {
  const [isHandedOver, setIsHandedOver] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)

  const currentPlayer = players[currentPlayerIndex]
  const isLastPlayer = currentPlayerIndex === players.length - 1
  const theme = currentPlayer.theme

  const toggleReveal = () => {
    playCardFlipSound()
    if (!isRevealed) playRevealSound(currentPlayer.isImposter)
    setIsRevealed(!isRevealed)
  }

  const handleNext = () => {
    playClickSound()
    setIsHandedOver(false)
    setIsRevealed(false)

    if (isLastPlayer) {
      onFinishPass()
    } else {
      onNextPlayer()
    }
  }

  // Step 1: hand the phone over.
  if (!isHandedOver) {
    return (
      <Screen width="sm" center className="text-center">
        <div className="font-mono text-micro text-ink-faint">
          {currentPlayerIndex + 1} of {players.length}
        </div>

        <div className="py-12 space-y-2">
          <Label>Hand the phone to</Label>
          <h2 className="font-display text-4xl leading-none text-ink">{currentPlayer.name}</h2>
        </div>

        <Button
          tone="imposter"
          fullWidth
          onClick={() => {
            playClickSound()
            setIsHandedOver(true)
          }}
        >
          I am {currentPlayer.name}
        </Button>
      </Screen>
    )
  }

  // Step 2: the secret card.
  return (
    <Screen width="sm">
      <div className="flex items-center justify-between text-mini text-ink-faint pb-3">
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
          <span className="font-semibold text-ink">{currentPlayer.name}</span>
        </span>
        <span className="font-mono text-micro">
          {currentPlayerIndex + 1} / {players.length}
        </span>
      </div>

      <div
        onClick={toggleReveal}
        className={`w-full min-h-[340px] rounded-slab p-6 flex flex-col justify-between cursor-pointer border transition duration-300 active:scale-[0.99] ${theme.cardBg}`}
      >
        <div className="flex items-center justify-between text-mini text-ink-muted">
          <span>
            {gameData.categoryIcon} {gameData.categoryName}
          </span>
          <span className="flex items-center gap-1 font-semibold">
            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {isRevealed ? 'Hide' : 'Reveal'}
          </span>
        </div>

        <div className="my-auto text-center py-8">
          {!isRevealed ? (
            <div className="space-y-2">
              <span className="block text-3xl">🔒</span>
              <p className="text-mini text-ink-muted">Tap anywhere to reveal</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {currentPlayer.isImposter ? (
                <>
                  <div>
                    <Label className="text-imposter">Role</Label>
                    <h3 className="font-display text-3xl leading-none text-ink mt-1">Imposter</h3>
                  </div>
                  <div className="pt-2">
                    <Label>Hint</Label>
                    <div className="text-xl font-bold text-ink mt-1">{gameData.hint}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-ok">Secret word</Label>
                    <h3 className="font-display text-3xl leading-none text-ink mt-1">
                      {gameData.word}
                    </h3>
                  </div>
                  <div className="pt-2">
                    <Label>Role</Label>
                    <div className="text-sm font-medium text-ink-muted mt-1">Citizen</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="text-center">
          <Label>{isRevealed ? 'Tap card to hide' : 'Private'}</Label>
        </div>
      </div>

      <div className="pt-4">
        <Button tone="imposter" fullWidth onClick={handleNext}>
          {isLastPlayer ? 'Start discussion' : 'Next player'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Screen>
  )
}

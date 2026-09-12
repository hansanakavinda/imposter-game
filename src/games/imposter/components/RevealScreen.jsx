import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { playVictorySound, playClickSound } from '../../../utils/sound'
import Screen from '../../../components/ui/Screen'
import Button from '../../../components/ui/Button'
import Label from '../../../components/ui/Label'
import Pill from '../../../components/ui/Pill'
import PlayerRow from '../../../components/ui/PlayerRow'

export default function RevealScreen({ players, gameData, onPlayAgain, onNewSetup }) {
  const imposters = players.filter((p) => p.isImposter)

  useEffect(() => {
    playVictorySound()
    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
    } catch {
      // ignore
    }
  }, [])

  return (
    <Screen width="sm" className="text-center">
      <div>
        <Pill>
          <span aria-hidden="true">{gameData.categoryIcon}</span>
          {gameData.categoryName}
        </Pill>
      </div>

      <div className="py-10 space-y-8">
        <div className="space-y-1.5">
          <Label>The secret word was</Label>
          <h2 className="font-display text-4xl leading-none text-ink">{gameData.word}</h2>
        </div>

        <div className="space-y-2.5">
          <Label className="text-imposter">
            {imposters.length > 1 ? 'The imposters' : 'The imposter'}
          </Label>

          <div className="space-y-2 text-left">
            {imposters.map((imp) => (
              <PlayerRow
                key={imp.id}
                name={imp.name}
                badges={<span className={`w-2.5 h-2.5 rounded-full ${imp.theme.dot}`} />}
                trailing={
                  <span className="text-mini text-ink-muted">
                    Hint: <strong className="font-semibold text-ink">{gameData.hint}</strong>
                  </span>
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <Button
          tone="imposter"
          fullWidth
          onClick={() => {
            playClickSound()
            onPlayAgain()
          }}
        >
          Same players, new word <ArrowRight className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          fullWidth
          size="md"
          onClick={() => {
            playClickSound()
            onNewSetup()
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Change the setup
        </Button>
      </div>
    </Screen>
  )
}

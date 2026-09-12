import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { playClickSound, playTickSound } from '../../../utils/sound'
import Screen from '../../../components/ui/Screen'
import Button from '../../../components/ui/Button'
import IconButton from '../../../components/ui/IconButton'
import Label from '../../../components/ui/Label'
import Modal from '../../../components/ui/Modal'
import Pill from '../../../components/ui/Pill'

export default function DiscussionScreen({
  players,
  gameData,
  timerDuration,
  startingPlayerIndex,
  onRevealImposters,
}) {
  const [timeLeft, setTimeLeft] = useState(timerDuration)
  const [isRunning, setIsRunning] = useState(timerDuration > 0)
  const [confirmReveal, setConfirmReveal] = useState(false)

  const timerRef = useRef(null)

  useEffect(() => {
    if (timerDuration === 0) return

    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            setIsRunning(false)
            playTickSound(true)
            return 0
          }
          if (prev <= 10) {
            playTickSound(true)
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(timerRef.current)
  }, [isRunning, timeLeft, timerDuration])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => {
    playClickSound()
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    playClickSound()
    setIsRunning(false)
    setTimeLeft(timerDuration)
  }

  const startingPlayer = players[startingPlayerIndex] || players[0]

  return (
    <Screen width="sm" className="text-center">
      <div>
        <Pill>
          <span aria-hidden="true">{gameData.categoryIcon}</span>
          {gameData.categoryName}
        </Pill>

        <div className="mt-8 space-y-1.5">
          <Label>First speaker</Label>
          <h2 className="font-display text-3xl leading-none text-ink">{startingPlayer.name}</h2>
          <p className="text-mini text-ink-muted pt-1">Give one clue, then take turns.</p>
        </div>
      </div>

      {timerDuration > 0 && (
        <div className="py-10 space-y-4">
          <div
            onClick={toggleTimer}
            className={`font-mono text-6xl font-medium cursor-pointer transition ${
              timeLeft === 0 ? 'text-danger' : 'text-ink'
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center justify-center gap-2">
            <IconButton
              label={isRunning ? 'Pause timer' : 'Start timer'}
              onClick={toggleTimer}
              className="bg-felt border border-edge shadow-lift-1 p-3"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </IconButton>
            <IconButton
              label="Reset timer"
              onClick={resetTimer}
              className="bg-felt border border-edge shadow-lift-1 p-3"
            >
              <RotateCcw className="w-4 h-4" />
            </IconButton>
          </div>
        </div>
      )}

      <div className="pt-6">
        <Button
          tone="imposter"
          fullWidth
          onClick={() => {
            playClickSound()
            setConfirmReveal(true)
          }}
        >
          Reveal the imposter
        </Button>
      </div>

      <Modal
        open={confirmReveal}
        onClose={() => setConfirmReveal(false)}
        title="Reveal results?"
        size="xs"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmReveal(false)}>
              Keep talking
            </Button>
            <Button
              tone="imposter"
              onClick={() => {
                playClickSound()
                onRevealImposters(null)
              }}
            >
              Reveal
            </Button>
          </div>
        }
      >
        <p className="text-mini text-ink-muted">
          Make sure everyone has voted on who they think the imposter is. This ends the round.
        </p>
      </Modal>
    </Screen>
  )
}

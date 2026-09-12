import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Eye } from 'lucide-react'
import { getRankBadge } from '../constants/unoConstants'
import { playVictorySound, playClickSound } from '../../../utils/sound'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Label from '../../../components/ui/Label'
import Surface from '../../../components/ui/Surface'

export default function UnoFinishedRankModal({
  isOpen,
  rank,
  playerName = 'You',
  activeRemaining = 2,
  onClose,
}) {
  const rankInfo = getRankBadge(rank || 1)

  useEffect(() => {
    if (isOpen) {
      playVictorySound()
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      } catch {
        // ignore
      }
    }
  }, [isOpen])

  const handleSpectate = () => {
    playClickSound()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      dismissible={false}
      size="sm"
      className="text-center"
      footer={
        <Button tone="uno" fullWidth onClick={handleSpectate}>
          <Eye className="w-4 h-4" />
          Watch the rest
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <div className="mx-auto w-20 h-20 rounded-object bg-well border border-edge shadow-sink flex items-center justify-center text-4xl">
          {rankInfo.medal}
        </div>

        <div className="space-y-1.5">
          <Label className="text-uno">Hand cleared</Label>
          <h2 className="font-display text-3xl leading-none text-ink">
            {playerName === 'You' ? "That's your hand gone" : `${playerName} is out`}
          </h2>
          <div className="font-display text-lg text-uno pt-0.5">{rankInfo.label}</div>
          <p className="text-mini text-ink-muted leading-relaxed max-w-xs mx-auto pt-1">
            {rank === 1
              ? 'First to empty your hand. Nothing left to play.'
              : `You cleared your hand and finished ${rankInfo.label}.`}
          </p>
        </div>

        <Surface inset radius="object" className="p-3.5 text-left space-y-1">
          <Label className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            You&apos;re watching now
          </Label>
          <p className="text-micro text-ink-muted leading-relaxed">
            {activeRemaining > 1
              ? `${activeRemaining} players are still going for the remaining places.`
              : 'The last two are finishing up.'}
          </p>
        </Surface>
      </div>
    </Modal>
  )
}

import React from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Pill from '../../../components/ui/Pill'

const STEPS = [
  {
    title: 'Secret cards',
    body: 'Citizens know the secret word. The imposter only gets a single-word hint to bluff with.',
  },
  {
    title: 'Give clues',
    body: 'Take turns giving one subtle clue, without saying the exact word.',
  },
  {
    title: 'Vote and reveal',
    body: 'Point to the suspect and tap Reveal to find out who was lying.',
  },
]

export default function RulesModal({ isOpen, onClose }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="How to play"
      eyebrow={<Pill tone="imposter">Imposter</Pill>}
      size="xs"
      footer={
        <Button fullWidth onClick={onClose}>
          Got it
        </Button>
      }
    >
      {/* Three ordered steps, so the numbers carry real sequence. */}
      <ol className="space-y-3.5">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-well shadow-sink flex items-center justify-center font-mono text-nano text-ink-faint">
              {index + 1}
            </span>
            <span className="block">
              <span className="block text-sm font-bold text-ink">{step.title}</span>
              <span className="block text-mini text-ink-muted">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  )
}

import React from 'react'
import { playClickSound } from '../../../utils/sound'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Label from '../../../components/ui/Label'
import Pill from '../../../components/ui/Pill'
import Surface from '../../../components/ui/Surface'

const ACTION_CARDS = [
  { glyph: '⊘', name: 'Skip', body: 'The next player misses their turn.' },
  { glyph: '⇄', name: 'Reverse', body: 'Turns play around. With two players it skips.' },
  { glyph: '+2', name: 'Draw Two', body: 'The next player takes two and loses their turn.' },
  { glyph: '★', name: 'Wild', body: 'Play it any time and name the next colour.' },
  { glyph: '+4', name: 'Wild Draw Four', body: 'Name the colour; the next player takes four and loses their turn.' },
]

export default function UnoRulesModal({ isOpen, onClose }) {
  const close = () => {
    playClickSound()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onClose={close}
      title="How to play"
      eyebrow={<Pill tone="uno">UNO</Pill>}
      size="md"
      footer={
        <Button fullWidth onClick={close}>
          Got it
        </Button>
      }
      bodyClassName="space-y-5 text-mini"
    >
      <section className="space-y-1">
        <h3 className="text-sm font-bold text-ink">The goal</h3>
        <p className="text-ink-muted leading-relaxed">
          Empty your hand first. Play a card that matches the top of the discard pile by
          colour or by number.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-ink">Action cards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ACTION_CARDS.map(({ glyph, name, body }, index) => (
            <Surface
              key={name}
              inset
              radius="well"
              className={`p-2.5 ${index === ACTION_CARDS.length - 1 ? 'sm:col-span-2' : ''}`}
            >
              <span className="block font-bold text-uno mb-0.5">
                <span className="font-mono">{glyph}</span> {name}
              </span>
              <span className="block text-ink-muted">{body}</span>
            </Surface>
          ))}
        </div>
      </section>

      <section className="space-y-1.5 p-3 rounded-object bg-uno/10 border border-uno/25">
        <Label className="text-uno">Calling UNO, and catching</Label>
        <p className="text-ink-muted leading-relaxed">
          Tap <strong className="font-semibold text-ink">Call UNO</strong> as you go down to
          one card. A badge appears next to your name.
        </p>
        <p className="text-ink-muted leading-relaxed">
          Miss it and anyone can tap your name to catch you. You then take one card from
          every player still in. Each of them picks which card to give — and a player down
          to their last card gives it away and wins.
        </p>
      </section>

      <section className="space-y-1">
        <h3 className="text-sm font-bold text-ink">Nothing playable?</h3>
        <p className="text-ink-muted leading-relaxed">
          Tap the draw pile for one card. If it can be played you may play it straight away,
          or pass.
        </p>
      </section>
    </Modal>
  )
}

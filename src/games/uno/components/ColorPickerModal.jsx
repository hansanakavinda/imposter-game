import React from 'react'
import { COLOR_CONFIG, PLAYABLE_COLORS } from '../constants/unoConstants'
import { playClickSound } from '../../../utils/sound'
import Modal from '../../../components/ui/Modal'
import { FOCUS, cx } from '../../../components/ui/tokens'

/**
 * Naming a colour after a wild.
 *
 * Four targets, each the size of a card and shaped like one, because that is
 * what you are choosing. The colour name is written on every one -- the swatch
 * is never the only way to tell them apart.
 */
export default function ColorPickerModal({ isOpen, onSelectColor }) {
  return (
    <Modal open={isOpen} dismissible={false} size="xs" title="Name a colour">
      <p className="text-mini text-ink-muted pb-4">Play carries on in the colour you pick.</p>

      <div className="grid grid-cols-2 gap-3">
        {PLAYABLE_COLORS.map((color) => {
          const config = COLOR_CONFIG[color]
          return (
            <button
              key={color}
              type="button"
              onClick={() => {
                playClickSound()
                onSelectColor(color)
              }}
              className={cx(
                'relative aspect-[3/4] rounded-well overflow-hidden p-2.5',
                'flex items-end justify-center cursor-pointer',
                'border border-black/25 shadow-lift-1',
                'transition-transform duration-150 hover:-translate-y-1',
                'active:scale-[0.97] active:shadow-lift-0',
                config.bg,
                FOCUS
              )}
            >
              <span className="absolute inset-[3px] rounded-[inherit] border border-card-face/70" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-[72%] h-[38%] -rotate-[18deg] rounded-[50%] bg-card-face" />
              </span>
              <span className="relative font-display text-card-face text-sm">{config.name}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

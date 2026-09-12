import React from 'react'
import { COLOR_CONFIG, PLAYABLE_COLORS } from '../constants/unoConstants'
import { playClickSound } from '../../../utils/sound'
import Modal from '../../../components/ui/Modal'
import { FOCUS, cx } from '../../../components/ui/tokens'

export default function ColorPickerModal({ isOpen, onSelectColor }) {
  return (
    <Modal
      open={isOpen}
      dismissible={false}
      size="xs"
      title="Name a colour"
      className="text-center"
    >
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
                'py-6 rounded-object font-display text-lg text-white shadow-lift-2',
                'transition duration-200 hover:scale-105 active:scale-[0.98] active:shadow-lift-0',
                'cursor-pointer',
                config.bg,
                FOCUS
              )}
            >
              {config.name}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

import React from 'react'
import { Check } from 'lucide-react'
import { TANK_TYPES } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'
import Surface from '../../../../components/ui/Surface'
import Label from '../../../../components/ui/Label'
import { FOCUS, cx } from '../../../../components/ui/tokens'
import TankStatBars from './TankStatBars'

// Was renderTankSelector(), a closure called with a boolean its signature never
// declared -- both call sites silently discarded the argument. It is a real
// component now, with an explicit prop interface.
export default function TankSelector({ selectedTank, onSelectTank }) {
  return (
    <Surface className="p-4 space-y-2.5">
      <div>
        <Label>Your tank</Label>
        <p className="text-mini text-ink-muted">
          Any commander can take any class, and a squad can double up.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.values(TANK_TYPES).map((tank) => {
          const isSelected = selectedTank === tank.id

          return (
            <button
              key={tank.id}
              type="button"
              onClick={() => {
                playClickSound()
                onSelectTank?.(tank.id)
              }}
              className={cx(
                'relative p-3 rounded-object border flex flex-col text-left transition cursor-pointer',
                'active:scale-[0.98]',
                isSelected
                  ? 'bg-felt-high border-tank shadow-lift-2'
                  : 'bg-well border-edge shadow-sink hover:border-edge-lit',
                FOCUS
              )}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-tank flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-table stroke-[3]" />
                </span>
              )}

              <span className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xl" aria-hidden="true">
                  {tank.icon}
                </span>
                <span className="block">
                  <span className={cx('block text-sm font-bold leading-tight', isSelected ? 'text-ink' : 'text-ink-muted')}>
                    {tank.name}
                  </span>
                  <span className="block text-nano uppercase font-bold text-ink-faint">
                    {tank.role}
                  </span>
                </span>
              </span>

              <p className="text-nano leading-snug text-ink-muted mb-2.5 line-clamp-2">
                {tank.description}
              </p>

              <TankStatBars tank={tank} />
            </button>
          )
        })}
      </div>
    </Surface>
  )
}

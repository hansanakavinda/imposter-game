import React from 'react'
import { Check } from 'lucide-react'
import { TANK_TYPES } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'
import TankStatBars from './TankStatBars'

// Was renderTankSelector(), a closure called with a boolean its signature never
// declared -- both call sites silently discarded the argument. It is a real
// component now, with an explicit prop interface.
export default function TankSelector({ selectedTank, onSelectTank }) {
  const selectedCfg = selectedTank ? TANK_TYPES[selectedTank] : null

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
            <span className="text-base">🚜</span>
            <span>Choose Your Battle Tank</span>
          </label>
          <span className="text-[11px] text-zinc-400">
            All commanders can select any tank class. Same-tank squads are allowed!
          </span>
        </div>
        {selectedCfg && (
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${selectedCfg.badgeColor}`}>
            {selectedCfg.icon} {selectedCfg.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
              className={`p-3 rounded-xl border flex flex-col text-left transition relative cursor-pointer ${
                isSelected
                  ? `bg-zinc-800/90 ${tank.borderColor} ring-2 ring-cyan-500/70 shadow-lg shadow-cyan-500/10`
                  : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xl">{tank.icon}</span>
                <div>
                  <span className={`font-black text-sm block leading-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                    {tank.name}
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase font-semibold">
                    {tank.role}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-zinc-400 leading-tight mb-2.5 line-clamp-2">
                {tank.description}
              </p>

              <TankStatBars tank={tank} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

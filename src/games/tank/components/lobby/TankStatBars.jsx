import React from 'react'

// Four identical 4-pip rows that were written out longhand four times.
const PIP_COUNT = 4

function StatRow({ label, value, barClass }) {
  return (
    <div className="flex items-center justify-between text-zinc-400">
      <span>{label}</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: PIP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-1.5 rounded-xs ${i < value ? barClass : 'bg-zinc-800'}`}
          />
        ))}
      </div>
    </div>
  )
}

// Armor is the one row whose colour depends on its own value: a 4-HP bruiser
// reads orange, a 2-HP skirmisher rose, everything else amber.
function armorBarClass(hp) {
  if (hp === 4) return 'bg-orange-400'
  if (hp === 2) return 'bg-rose-400'
  return 'bg-amber-400'
}

export default function TankStatBars({ tank }) {
  return (
    <div className="space-y-1 mt-auto pt-2 border-t border-zinc-800/60 text-[9px] font-bold">
      <StatRow
        label={`Armor (${tank.maxHp} HP):`}
        value={tank.stats.hp}
        barClass={armorBarClass(tank.stats.hp)}
      />
      <StatRow label="Speed:" value={tank.stats.speed} barClass="bg-cyan-400" />
      <StatRow label="Fire Rate:" value={tank.stats.fireRate} barClass="bg-emerald-400" />
      <StatRow label="Velocity:" value={tank.stats.range} barClass="bg-purple-400" />
    </div>
  )
}

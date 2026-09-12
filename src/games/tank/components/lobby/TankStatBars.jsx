import React from 'react'

// Four identical 4-pip rows that were written out longhand four times.
const PIP_COUNT = 4

function StatRow({ label, value, barClass }) {
  return (
    <div className="flex items-center justify-between gap-2 text-ink-faint">
      <span>{label}</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: PIP_COUNT }).map((_, i) => (
          <div key={i} className={`w-2 h-1.5 rounded-xs ${i < value ? barClass : 'bg-well'}`} />
        ))}
      </div>
    </div>
  )
}

// Armor is the one row whose colour depends on its own value: a 4-HP bruiser
// reads green, a 2-HP skirmisher red, everything else gold.
function armorBarClass(hp) {
  if (hp === 4) return 'bg-ok'
  if (hp === 2) return 'bg-danger'
  return 'bg-turn'
}

export default function TankStatBars({ tank }) {
  return (
    <div className="space-y-1 mt-auto pt-2 border-t border-edge text-nano font-bold">
      <StatRow
        label={`Armour (${tank.maxHp} HP)`}
        value={tank.stats.hp}
        barClass={armorBarClass(tank.stats.hp)}
      />
      <StatRow label="Speed" value={tank.stats.speed} barClass="bg-tank" />
      <StatRow label="Fire rate" value={tank.stats.fireRate} barClass="bg-tank" />
      <StatRow label="Shell speed" value={tank.stats.range} barClass="bg-tank" />
    </div>
  )
}

import React from 'react'
import { TEAMS, TANK_TYPES, DEFAULT_TANK_TYPE } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'

// One roster column. The blue and red columns were 98-line copy-paste twins;
// everything that differed now comes from TEAMS[team].lobby*.
export default function TeamRosterColumn({ team, slots, players, mySlotId, myPeerId, onSelectSlot }) {
  const cfg = TEAMS[team]

  return (
    <div className={`bg-zinc-900/80 border ${cfg.lobbyPanel} rounded-2xl p-3.5 flex flex-col gap-2.5`}>
      <div className={`flex items-center justify-between pb-1 border-b ${cfg.lobbyDivider}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.lobbyDot}`} />
          <span className={`font-extrabold text-xs ${cfg.text} uppercase tracking-wider`}>
            {cfg.name}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 font-semibold">{cfg.lobbyBaseLabel}</span>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => {
          const occupant = players.find((p) => p.slotId === slot.id)
          const tankCfg = occupant
            ? TANK_TYPES[occupant.tankType] || TANK_TYPES[DEFAULT_TANK_TYPE]
            : null
          const isMe =
            occupant &&
            ((myPeerId && occupant.peerId === myPeerId) || occupant.slotId === mySlotId)

          return (
            <div
              key={slot.id}
              className={`p-2.5 rounded-xl border transition flex items-center justify-between ${
                occupant
                  ? isMe
                    ? cfg.lobbySelfSlot
                    : 'bg-zinc-950/70 border-zinc-800'
                  : `bg-zinc-950/30 border-dashed border-zinc-800/80 ${cfg.lobbyOpenSlot} cursor-pointer`
              }`}
              onClick={() => {
                if (!occupant) {
                  playClickSound()
                  onSelectSlot(slot.id)
                }
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm ${
                    occupant ? cfg.lobbyAvatar : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {occupant && tankCfg ? tankCfg.icon : '🚜'}
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                    <span>{occupant ? occupant.name : 'Open Slot'}</span>
                    {isMe && (
                      <span className={`text-[9px] ${cfg.lobbyYouBadge} px-1.5 py-0.2 rounded font-semibold`}>
                        YOU
                      </span>
                    )}
                    {occupant?.isHost && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-semibold">
                        HOST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-zinc-500">{slot.label}</span>
                    {occupant && tankCfg && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black border uppercase ${tankCfg.badgeColor}`}>
                        {tankCfg.icon} {tankCfg.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {occupant ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    occupant.isReady
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {occupant.isReady ? 'READY' : 'WAITING'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    playClickSound()
                    onSelectSlot(slot.id)
                  }}
                  className={`text-[10px] font-bold ${cfg.lobbyJoinBtn} uppercase px-2 py-1 rounded-lg transition cursor-pointer`}
                >
                  {cfg.lobbyJoinLabel}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

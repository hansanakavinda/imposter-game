import React from 'react'
import { TEAMS, TANK_TYPES, DEFAULT_TANK_TYPE } from '../../constants/tankConstants'
import { playClickSound } from '../../../../utils/sound'
import Surface from '../../../../components/ui/Surface'
import { Badge, Dot } from '../../../../components/ui/PlayerRow'
import { FOCUS, TONE_FILL, TONE_TEXT, cx } from '../../../../components/ui/tokens'

// One roster column. The blue and red columns were 98-line copy-paste twins;
// everything that differs now comes from the team's single `tone`.
export default function TeamRosterColumn({ team, slots, players, mySlotId, myPeerId, onSelectSlot }) {
  const cfg = TEAMS[team]

  return (
    <Surface radius="object" className="p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-edge">
        <span className="flex items-center gap-2">
          <Dot tone={cfg.tone} className="w-2.5 h-2.5" />
          <span className={cx('text-micro font-bold uppercase', TONE_TEXT[cfg.tone])}>
            {cfg.name}
          </span>
        </span>
        <span className="text-nano font-semibold uppercase text-ink-faint">{cfg.baseLabel}</span>
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

          const claimSlot = () => {
            playClickSound()
            onSelectSlot(slot.id)
          }

          // An empty slot is the only thing here you can act on, so only an
          // empty slot is a button.
          const Tag = occupant ? 'div' : 'button'

          return (
            <Tag
              key={slot.id}
              type={occupant ? undefined : 'button'}
              onClick={occupant ? undefined : claimSlot}
              className={cx(
                'w-full p-2.5 rounded-well border transition flex items-center justify-between gap-2 text-left',
                occupant
                  ? isMe
                    ? 'bg-felt-high border-edge-lit shadow-lift-1'
                    : 'bg-well border-edge shadow-sink'
                  : cx(
                      'bg-well border-dashed border-edge shadow-sink cursor-pointer',
                      'hover:border-edge-lit active:scale-[0.99]',
                      FOCUS
                    )
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className={cx(
                    'w-7 h-7 rounded-well flex items-center justify-center text-sm shrink-0',
                    occupant
                      ? cx(TONE_FILL[cfg.tone], 'shadow-lift-1')
                      : 'bg-felt-high text-ink-faint'
                  )}
                >
                  {occupant && tankCfg ? tankCfg.icon : '🚜'}
                </span>

                <span className="min-w-0 block">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-mini font-bold text-ink">
                      {occupant ? occupant.name : 'Open slot'}
                    </span>
                    {isMe && <Badge tone={cfg.tone}>You</Badge>}
                    {occupant?.isHost && <Badge tone="turn">Host</Badge>}
                  </span>

                  <span className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-nano text-ink-faint">{slot.label}</span>
                    {occupant && tankCfg && (
                      <span className="text-nano font-bold uppercase text-ink-muted">
                        {tankCfg.name}
                      </span>
                    )}
                  </span>
                </span>
              </span>

              {occupant ? (
                <Badge tone={occupant.isReady ? 'ok' : 'neutral'}>
                  {occupant.isReady ? 'Ready' : 'Waiting'}
                </Badge>
              ) : (
                <span className={cx('text-nano font-bold uppercase', TONE_TEXT[cfg.tone])}>
                  Take it
                </span>
              )}
            </Tag>
          )
        })}
      </div>
    </Surface>
  )
}

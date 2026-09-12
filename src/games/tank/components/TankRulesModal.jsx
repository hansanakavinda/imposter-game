import React from 'react'
import { Shield, Swords, Crosshair, Radio } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Pill from '../../../components/ui/Pill'
import { cx } from '../../../components/ui/tokens'

// The five headings are topics, not steps, so they are not numbered.
function Section({ icon, title, children, className = '' }) {
  return (
    <section className={cx('space-y-1.5', className)}>
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <span className="text-tank">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Term({ name, children }) {
  return (
    <li className="text-ink-muted">
      <strong className="font-semibold text-ink">{name}:</strong> {children}
    </li>
  )
}

export default function TankRulesModal({ isOpen, onClose }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="How to play"
      eyebrow={<Pill tone="tank">Tank Arena</Pill>}
      size="md"
      footer={
        <Button fullWidth onClick={onClose}>
          Got it
        </Button>
      }
      bodyClassName="space-y-4 text-mini"
    >
      <Section icon={<Swords className="w-3.5 h-3.5" />} title="Duel or squad">
        <p className="text-ink-muted leading-relaxed">
          Play a fast 1v1 duel, or team up 2v2 across devices. First team to win{' '}
          <strong className="font-semibold text-ink">three rounds</strong> takes the match.
        </p>
      </Section>

      <Section icon={<Shield className="w-3.5 h-3.5" />} title="The battlefield">
        <ul className="space-y-1 pl-1">
          <Term name="Steel bunkers">Solid cover. Shells stop dead on impact.</Term>
          <Term name="Brick barricades">Destructible cover. Crumbles after two hits.</Term>
          <Term name="Tall grass">
            Stealth. Hides your tank until you fire, or someone enters the same bush.
          </Term>
          <Term name="Water">Impassable for tanks. Shells fly straight across.</Term>
          <Term name="Mud">Slows you down by 45%.</Term>
          <Term name="Red barrels">Explode on impact, catching nearby tanks and cover.</Term>
        </ul>
      </Section>

      <Section icon={<span aria-hidden="true">🚜</span>} title="The four classes">
        <ul className="space-y-1.5 pl-1">
          <Term name="⚔️ Striker">Balanced all-rounder. 3 HP, standard cannon.</Term>
          <Term name="🛡️ Titan">Heavy armour. 4 HP, heavy shells, slower to move and reload.</Term>
          <Term name="⚡ Specter">Fast flanker. 2 HP, +27% speed, rapid autocannon.</Term>
          <Term name="🎯 Ballista">Sniper. 3 HP, very fast shells, long reload.</Term>
        </ul>
      </Section>

      <Section icon={<Radio className="w-3.5 h-3.5" />} title="Team tactics and drops">
        <ul className="space-y-1 pl-1">
          <Term name="Damage">
            Standard shells deal 1, heavy rockets deal 2, and a shield absorbs a whole hit.
          </Term>
          <Term name="Friendly fire">Off. Shells pass through your teammate.</Term>
          <Term name="Ping">Tap Ping, or right-click, to mark a spot for your partner.</Term>
          <Term name="Ghost drone">
            Eliminated teammates scout the map and can still drop pings.
          </Term>
          <Term name="Air drops">
            Crates parachute into open ground with lasers, rockets, shotguns and shields.
          </Term>
        </ul>
      </Section>

      <Section icon={<Crosshair className="w-3.5 h-3.5" />} title="Controls">
        <div className="rounded-object bg-well border border-edge shadow-sink p-2.5 space-y-1 text-micro text-ink-muted">
          <div>
            <strong className="font-semibold text-ink">Desktop:</strong> WASD or arrows to drive,
            mouse to aim, click or space to fire.
          </div>
          <div>
            <strong className="font-semibold text-ink">Phone:</strong> left stick to drive, tap to
            point the cannon, Fire to shoot.
          </div>
        </div>
      </Section>
    </Modal>
  )
}

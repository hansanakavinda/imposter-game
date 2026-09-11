import React from 'react'
import { X, Shield, Swords, Crosshair, Radio } from 'lucide-react'

export default function TankRulesModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚜</span>
            <h3 className="font-extrabold text-base text-white">Tank Arena Rules</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-zinc-300">
          <div>
            <span className="font-bold text-white block mb-1 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-cyan-400" />
              1. Modes (1v1 & 2v2)
            </span>
            <p className="text-zinc-400 leading-relaxed">
              Play a fast 1v1 duel or team up in a 2v2 tactical squad across devices. First team to win <strong>3 rounds</strong> wins the match!
            </p>
          </div>

          <div>
            <span className="font-bold text-white block mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              2. Open Battlefield Terrain
            </span>
            <ul className="space-y-1 text-zinc-400 pl-2">
              <li>• <strong className="text-zinc-200">Steel Bunkers:</strong> Indestructible solid cover. Absorbs incoming shells on impact.</li>
              <li>• <strong className="text-zinc-200">Brick Barricades:</strong> Destructible cover. Crumbles after 2 hits.</li>
              <li>• <strong className="text-zinc-200">Tall Grass Bushes:</strong> Complete <strong>stealth</strong>! Hides your tank from enemies unless you fire or they enter the same bush.</li>
              <li>• <strong className="text-zinc-200">Water Ponds:</strong> Impassable for tanks, but shells fly straight across.</li>
              <li>• <strong className="text-zinc-200">Mud:</strong> Slows movement down by 45%.</li>
              <li>• <strong className="text-zinc-200">Red Barrels:</strong> Explodes on impact, blasting adjacent tanks and obstacles.</li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-white block mb-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              3. Team Tactics & Drops
            </span>
            <ul className="space-y-1 text-zinc-400 pl-2">
              <li>• <strong className="text-zinc-200">Friendly Fire:</strong> Safe! Shells pass through teammates harmlessly.</li>
              <li>• <strong className="text-zinc-200">Tactical Ping:</strong> Tap Ping (or Right-Click) to send a radar alert to your partner.</li>
              <li>• <strong className="text-zinc-200">Ghost Drone:</strong> Eliminated teammates scout the map and drop radar pings for their partner.</li>
              <li>• <strong className="text-zinc-200">Air Drop Crates:</strong> Parachutes in central open zones with Lasers, Rockets, Shotguns, and Shields.</li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-white block mb-1 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              4. Controls
            </span>
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 space-y-1 text-[11px]">
              <div><strong className="text-zinc-200">Desktop:</strong> WASD / Arrows to drive, Mouse to aim, Left Click / Space to fire.</div>
              <div><strong className="text-zinc-200">Mobile:</strong> Left D-pad to drive, tap screen to point cannon, big FIRE button to shoot.</div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-xs text-zinc-950 bg-white hover:bg-zinc-200 transition cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

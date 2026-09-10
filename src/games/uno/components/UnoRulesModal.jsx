import React from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { playClickSound } from '../../../utils/sound'

export default function UnoRulesModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              How to Play UNO
            </h2>
          </div>
          <button
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Close rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Rules Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 text-sm text-zinc-300 pr-1">
          {/* Goal */}
          <div className="space-y-1">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Objective
            </h3>
            <p className="text-zinc-400 leading-relaxed text-xs">
              Be the first player to play all cards from your hand! Match cards by color or number with the top card on the discard pile.
            </p>
          </div>

          {/* Action Cards */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Action Cards</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800">
                <span className="font-bold text-amber-300 block mb-0.5">⊘ Skip</span>
                <span className="text-zinc-400">Next player misses their turn.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800">
                <span className="font-bold text-blue-300 block mb-0.5">⇄ Reverse</span>
                <span className="text-zinc-400">Reverses play direction (acts as Skip in 2-player).</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800">
                <span className="font-bold text-emerald-300 block mb-0.5">+2 Draw Two</span>
                <span className="text-zinc-400">Next player draws 2 cards and skips turn.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800">
                <span className="font-bold text-purple-300 block mb-0.5">★ Wild Card</span>
                <span className="text-zinc-400">Play anytime. You choose the next color.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800 sm:col-span-2">
                <span className="font-bold text-rose-400 block mb-0.5">+4 Wild Draw Four</span>
                <span className="text-zinc-400">Choose color + next player draws 4 cards and loses turn!</span>
              </div>
            </div>
          </div>

          {/* Calling UNO & Catching */}
          <div className="space-y-1.5 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
            <h3 className="font-bold text-amber-300 text-xs uppercase tracking-wider">
              Calling &quot;UNO!&quot; &amp; Catching
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Press the <strong>Call UNO!</strong> button at any time when going down to 1 card. When successful, an <strong>UNO</strong> badge appears next to your profile.
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              If a player reaches 1 card without calling UNO, other players can <strong>tap that player&apos;s profile</strong> to call them out! The caught player receives <strong>1 card from each active player</strong>. Each player chooses which card to give, and if a player has only <strong>1 card</strong>, giving it away lets them <strong>finish and win the game</strong>!
            </p>
          </div>

          {/* Drawing */}
          <div className="space-y-1">
            <h3 className="font-semibold text-white">No Playable Cards?</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Click the <strong>Draw Pile</strong> to take 1 card. If the drawn card is playable, you can play it immediately or pass your turn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800">
          <button
            onClick={() => {
              playClickSound()
              onClose()
            }}
            className="w-full py-3 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-white transition active:scale-95 cursor-pointer"
          >
            Got it, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  )
}

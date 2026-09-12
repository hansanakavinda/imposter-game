import React from 'react'
import { X } from 'lucide-react'

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xs w-full p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-white">How to Play</h3>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-zinc-300">
          <div>
            <span className="font-bold text-white block mb-0.5">1. Secret Cards</span>
            Citizens know the secret word. The imposter only gets a single-word hint to bluff with.
          </div>

          <div>
            <span className="font-bold text-white block mb-0.5">2. Give Clues</span>
            Take turns giving one subtle clue without saying the exact word.
          </div>

          <div>
            <span className="font-bold text-white block mb-0.5">3. Vote & Reveal</span>
            Point to the suspect and tap Reveal to find out who was lying!
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-xs text-zinc-950 bg-white hover:bg-zinc-200 transition"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

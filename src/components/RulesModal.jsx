import React from 'react'
import { X, Sparkles, HelpCircle, Users } from 'lucide-react'

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg text-white">How to Play Imposter</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Overview */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/40">
            <h4 className="font-semibold text-white flex items-center gap-2 mb-1.5">
              <Users className="w-4 h-4 text-emerald-400" /> The Objective
            </h4>
            <p className="text-slate-300 text-xs sm:text-sm">
              One or two players are secret <span className="text-rose-400 font-bold">Imposters</span>. Everyone else is an innocent <span className="text-emerald-400 font-bold">Citizen</span>.
            </p>
          </div>

          {/* Section 2: Roles */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <div className="font-bold text-emerald-400 flex items-center gap-2 mb-1">
                <span>🛡️</span> Citizens
              </div>
              <p className="text-xs text-slate-300">
                You know the <strong>exact Secret Word</strong>. Take turns giving subtle clues without giving away the exact word to the Imposter!
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/20">
              <div className="font-bold text-rose-400 flex items-center gap-2 mb-1">
                <span>🕵️</span> Imposters
              </div>
              <p className="text-xs text-slate-300">
                You do <strong>not</strong> know the exact word! You only receive the <strong>category</strong> and a <strong>single-word hint</strong>. Listen closely to others, bluff with confidence, and try to deduce the real word!
              </p>
            </div>
          </div>

          {/* Section 3: Step-by-Step Flow */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
              Gameplay Steps
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              <li><strong className="text-slate-100">Pass the phone:</strong> Each player secretly views their card and hides it before passing to the next friend.</li>
              <li><strong className="text-slate-100">Discuss:</strong> The chosen starting player speaks first. Everyone gives one short clue or answers a question about the word.</li>
              <li><strong className="text-slate-100">Vote:</strong> When time is up, count down "3, 2, 1" and everyone points to who they think is the Imposter!</li>
              <li><strong className="text-slate-100">Reveal:</strong> Tap "Reveal Imposter" to see if the group caught them or got fooled!</li>
            </ol>
          </div>

          {/* Pro Tip */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Fair Card Colors:</strong> Card colors are completely random for everyone! An imposter's card has the exact same vibrant colors as regular players, so no one can peek from a distance.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  )
}

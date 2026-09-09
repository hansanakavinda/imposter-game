import React, { useState } from 'react'
import { X, Wifi, Smartphone, Copy, Check } from 'lucide-react'

export default function NetworkModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!isOpen) return null

  // Current host and port
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://192.168.1.249:5173'

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-lg text-white">Play on Mobile Browser</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-slate-300">
          <p className="text-xs text-slate-400 leading-relaxed">
            Open this game on any smartphone on your local Wi-Fi or mobile hotspot. You can pass a single phone around with your friends!
          </p>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Game URL</span>
              <code className="text-cyan-400 font-mono text-sm break-all font-semibold select-all">
                {currentUrl}
              </code>
            </div>
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 flex-shrink-0"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-400" /> Pass-and-Play Recommended:
            </div>
            <p>
              Only <strong>one phone</strong> is needed to play! Start the game on your mobile browser, look at your secret card, then hand the phone to the next person.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

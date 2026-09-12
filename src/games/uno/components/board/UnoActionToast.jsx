import React from 'react'
import { AlertCircle } from 'lucide-react'

/** Last thing that happened, announced under the table. */
export default function UnoActionToast({ actionMessage }) {
  return (
    <div className="mt-4 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 shadow-md flex items-center gap-1.5 animate-fadeIn">
      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <span>{actionMessage}</span>
    </div>
  )
}
